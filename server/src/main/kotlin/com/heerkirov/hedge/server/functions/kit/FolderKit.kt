package com.heerkirov.hedge.server.functions.kit

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.FolderImageRelations
import com.heerkirov.hedge.server.exceptions.ParamTypeError
import com.heerkirov.hedge.server.exceptions.ResourceNotExist
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.model.FolderImageRelation
import org.ktorm.dsl.*
import org.ktorm.entity.*

class FolderKit(private val data: DataRepository) {
    /**
     * 校验title是否合法，包括空检查、重复检查。
     */
    fun validateTitle(title: String) {
        if(title.isBlank()) throw be(ParamTypeError("title", "cannot be blank"))
    }

    /**
     * 应用images列表。对列表进行整体替换。
     * @return oldImageIds
     */
    fun updateSubImages(thisId: Int, imageIds: List<Int>): List<Int> {
        val oldImageIds = data.db.from(FolderImageRelations)
            .select(FolderImageRelations.imageId)
            .where { FolderImageRelations.folderId eq thisId }
            .map { it[FolderImageRelations.imageId]!! }

        data.db.delete(FolderImageRelations) { it.folderId eq thisId }

        if(imageIds.isNotEmpty()) data.db.batchInsert(FolderImageRelations) {
            imageIds.forEachIndexed { index, imageId ->
                item {
                    set(it.folderId, thisId)
                    set(it.ordinal, index)
                    set(it.imageId, imageId)
                }
            }
        }

        return oldImageIds
    }
    
    /**
     * 插入新的images。新的和已存在的images保持表单指定的相对顺序不变，插入到指定的新位置。
     * @return 插入之后，新的imageCount
     */
    fun upsertSubImages(thisId: Int, imageIds: List<Int>, ordinal: Int?): Int {
        //首先删除已存在的项
        val indexes = retrieveSubOrdinalById(thisId, imageIds).map { it.ordinal }
        val count = data.db.sequenceOf(FolderImageRelations).count { it.folderId eq thisId }
        if(indexes.isNotEmpty()) {
            //删除
            data.db.delete(FolderImageRelations) { (it.folderId eq thisId) and (it.ordinal inList indexes) }
            //将余下的项向前缩进
            data.db.batchUpdate(FolderImageRelations) {
                indexes.asSequence()
                    .windowed(2, 1, true) { it[0] to it.getOrElse(1) { count } }
                    .forEachIndexed { index, (fromOrdinal, toOrdinal) ->
                        item {
                            where { (it.folderId eq thisId) and (it.ordinal greaterEq fromOrdinal) and (it.ordinal less toOrdinal) }
                            set(it.ordinal, it.ordinal minus (index + 1))
                        }
                    }
            }
        }
        //然后，现在所有的项都是不存在的项了，执行纯纯的add流程
        val countAfterDeleted = count - indexes.size
        val finalOrdinal = if(ordinal != null && ordinal <= count) ordinal - indexes.count { it < ordinal } //ordinal在count范围内，则正常计算即可
        else countAfterDeleted //不在合法范围内，那么实际上就是放在最后，计算成countAfterDeleted即可
        //先把原有位置的项向后挪动
        if(finalOrdinal < countAfterDeleted) data.db.update(FolderImageRelations) {
            where { (it.folderId eq thisId) and (it.ordinal greaterEq finalOrdinal) }
            set(it.ordinal, it.ordinal plus imageIds.size)
        }
        //然后插入新项
        if(imageIds.isNotEmpty()) data.db.batchInsert(FolderImageRelations) {
            imageIds.forEachIndexed { index, imageId ->
                item {
                    set(it.folderId, thisId)
                    set(it.ordinal, finalOrdinal + index)
                    set(it.imageId, imageId)
                }
            }
        }

        return countAfterDeleted + imageIds.size
    }

    /**
     * 移动一部分images的顺序。这部分images的相对顺序保持不变，移动到指定的新位置。
     */
    fun moveSubImages(thisId: Int, imageIds: List<Int>, ordinal: Int?) {
        val relations = retrieveSubOrdinalById(thisId, imageIds)
        val indexes = relations.map { it.ordinal }
        if(indexes.isNotEmpty()) {
            val count = data.db.sequenceOf(FolderImageRelations).count { it.folderId eq thisId }

            //先删除所有要移动的项
            data.db.delete(FolderImageRelations) { (it.folderId eq thisId) and (it.ordinal inList indexes) }
            //将余下的项向前缩进
            data.db.batchUpdate(FolderImageRelations) {
                indexes.asSequence()
                    .windowed(2, 1, true) { it[0] to it.getOrElse(1) { count } }
                    .forEachIndexed { index, (fromOrdinal, toOrdinal) ->
                        item {
                            where { (it.folderId eq thisId) and (it.ordinal greaterEq fromOrdinal) and (it.ordinal less toOrdinal) }
                            set(it.ordinal, it.ordinal minus (index + 1))
                        }
                    }
            }
            //实际的插入ordinal是指定ordinal减去ordinal之前被移除的项的数量的位置。这样保证最终插入位置确实是指定的插入位置，而不会发生偏移
            val countAfterDeleted = count - indexes.size
            val finalOrdinal = if(ordinal != null && ordinal <= count) ordinal - indexes.count { it < ordinal } //ordinal在count范围内，则正常计算即可
            else countAfterDeleted //不在合法范围内，那么实际上就是放在最后，计算成countAfterDeleted即可

            //再向后挪动空出位置
            if(finalOrdinal < countAfterDeleted) data.db.update(FolderImageRelations) {
                where { (it.folderId eq thisId) and (it.ordinal greaterEq finalOrdinal) }
                set(it.ordinal, it.ordinal plus indexes.size)
            }
            //重新插入要移动的项
            if(relations.isNotEmpty()) data.db.batchInsert(FolderImageRelations) {
                //迭代这部分要移动的项目列表
                relations.forEachIndexed { index, r ->
                    item {
                        set(it.folderId, thisId)
                        set(it.ordinal, finalOrdinal + index)
                        set(it.imageId, r.imageId)
                    }
                }
            }
        }
    }

    /**
     * 删除一部分images。
     * @return 删除之后，剩余的imageCount。null表示没有变动
     * @throws ResourceNotExist ("images", number[]) 要操作的image不存在
     */
    fun deleteSubImages(thisId: Int, imageIds: List<Int>): Int? {
        val indexes = retrieveSubOrdinalById(thisId, imageIds).map { it.ordinal }
        if(indexes.isNotEmpty()) {
            val count = data.db.sequenceOf(FolderImageRelations).count { it.folderId eq thisId }
            //删除
            data.db.delete(FolderImageRelations) { (it.folderId eq thisId) and (it.ordinal inList indexes) }
            //将余下的项向前缩进
            data.db.batchUpdate(FolderImageRelations) {
                indexes.asSequence()
                    .windowed(2, 1, true) { it[0] to it.getOrElse(1) { count } }
                    .forEachIndexed { index, (fromOrdinal, toOrdinal) ->
                        item {
                            where { (it.folderId eq thisId) and (it.ordinal greaterEq fromOrdinal) and (it.ordinal less toOrdinal) }
                            set(it.ordinal, it.ordinal minus (index + 1))
                        }
                    }
            }

            return count - indexes.size
        }
        return null
    }

    /**
     * 根据image ids，映射得到它们的relation关系。返回结果按ordinal排序。忽略哪些不存在的项。
     */
    private fun retrieveSubOrdinalById(thisId: Int, imageIds: List<Int>): List<FolderImageRelation> {
        return data.db.sequenceOf(FolderImageRelations)
            .filter { (it.folderId eq thisId) and (it.imageId inList imageIds) }
            .sortedBy { it.ordinal.asc() }
            .toList()
    }
}