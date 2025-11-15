package com.heerkirov.hedge.server.functions.kit

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.enums.ExportType
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.manager.MetaManager
import com.heerkirov.hedge.server.model.BookImageRelation
import com.heerkirov.hedge.server.utils.business.checkScore
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import com.heerkirov.hedge.server.utils.types.Opt
import org.ktorm.dsl.*
import org.ktorm.entity.*
import java.time.Instant

class BookKit(private val data: DataRepository, private val metaManager: MetaManager) {
    /**
     * 检查score的值，不允许其超出范围。
     */
    fun validateScore(score: Int) {
        if(!checkScore(score)) throw be(ParamError("score"))
    }

    /**
     * 检验给出的tags/topics/authors的正确性，处理导出，并应用其更改。
     * @throws ResourceNotExist ("topics", number[]) 部分topics资源不存在。给出不存在的topic id列表
     * @throws ResourceNotExist ("authors", number[]) 部分authors资源不存在。给出不存在的author id列表
     * @throws ResourceNotExist ("tags", number[]) 部分tags资源不存在。给出不存在的tag id列表
     * @throws ResourceNotSuitable ("tags", number[]) 部分tags资源不适用。地址段不适用于此项。给出不适用的tag id列表
     * @throws ResourceNotSuitable ("topics", number[]]) 部分topics资源不适用。节点不能用于附加在项目上。给不不适用的topic id列表
     * @throws ConflictingGroupMembersError 发现标签冲突组
     */
    fun updateMeta(thisId: Int, newTags: Opt<List<Int>>, newTopics: Opt<List<Int>>, newAuthors: Opt<List<Int>>,
                   creating: Boolean = false) {
        //1. 取出所有现有的tag
        //2. 检查是否newTag与当前notExported列表确实不一致
        //3. 对newTag列表进行validate校验
        //4. 重新导出之后需要从RELATED重新获取关联项，从关联项中移除在validate中的结果
        //5. 组合validate与RELATED的结果，应用给实体
        if(newTags.isPresent) {
            val exist = metaManager.getMetaTags(thisId, BookTagRelations, Tags)
            val notExportedIds = exist.mapNotNull { (i, e) -> if(e == ExportType.NO) i.id else null }.toSet()
            if(notExportedIds != newTags.value.toSet()) {
                val validated = if(newTags.value.isEmpty()) emptyList() else metaManager.validateAndExportTag(newTags.value)
                val validatedIds = validated.map { (i, _) -> i }.toSet()

                val relatedIds = getOneMetaFromImages(thisId, IllustTagRelations, 0.3)
                val filteredRelatedIds = (relatedIds - validatedIds).map { it to ExportType.FROM_RELATED }
                metaManager.processMetaTags(thisId, creating, analyseStatisticCount = false, Tags, BookTagRelations, validated + filteredRelatedIds)
            }
        }

        if(newTopics.isPresent) {
            val exist = metaManager.getMetaTags(thisId, BookTopicRelations, Topics)
            val notExportedIds = exist.mapNotNull { (i, e) -> if(e == ExportType.NO) i.id else null }.toSet()
            if(notExportedIds != newTopics.value.toSet()) {
                val validated = if(newTopics.value.isEmpty()) emptyList() else metaManager.validateAndExportTopicModel(newTopics.value)
                val validatedIds = validated.map { (i, _) -> i.id }.toSet()

                val relatedIds = getOneMetaFromImages(thisId, IllustTopicRelations, 0.05)
                val filteredRelatedIds = (relatedIds - validatedIds).map { it to ExportType.FROM_RELATED }
                metaManager.processMetaTags(thisId, creating, analyseStatisticCount = false, Topics, BookTopicRelations, validated.map { (i, e) -> i.id to e } + filteredRelatedIds)
            }
        }

        if(newAuthors.isPresent) {
            val exist = metaManager.getMetaTags(thisId, BookAuthorRelations, Authors)
            val notExportedIds = exist.mapNotNull { (i, e) -> if(e == ExportType.NO) i.id else null }.toSet()
            if(notExportedIds != newAuthors.value.toSet()) {
                val validated = if(newAuthors.value.isEmpty()) emptyList() else metaManager.validateAndExportAuthor(newAuthors.value)
                val validatedIds = validated.map { (i, _) -> i }.toSet()

                val relatedIds = getOneMetaFromImages(thisId, IllustAuthorRelations, 0.05)
                val filteredRelatedIds = (relatedIds - validatedIds).map { it to ExportType.FROM_RELATED }
                metaManager.processMetaTags(thisId, creating, analyseStatisticCount = false, Authors, BookAuthorRelations, validated + filteredRelatedIds)
            }
        }
    }

    /**
     * 在没有更新的情况下，强制重新导出meta tag。
     */
    fun refreshAllMeta(thisId: Int) {
        //取出所有现有的meta tag
        val oldTags = metaManager.getMetaTags(thisId, BookTagRelations, Tags)
        val oldTopics = metaManager.getMetaTags(thisId, BookTopicRelations, Topics)
        val oldAuthors = metaManager.getMetaTags(thisId, BookAuthorRelations, Authors)

        //取出子项的meta tag
        val relatedTagIds = getOneMetaFromImages(thisId, IllustTagRelations, 0.3)
        val relatedTopicIds = getOneMetaFromImages(thisId, IllustTopicRelations, 0.05)
        val relatedAuthorIds = getOneMetaFromImages(thisId, IllustAuthorRelations, 0.05)
        val relatedTags = if(relatedTagIds.isNotEmpty()) data.db.sequenceOf(Tags).filter { it.id inList relatedTagIds }.toList() else emptyList()
        val relatedTopics = if(relatedTopicIds.isNotEmpty()) data.db.sequenceOf(Topics).filter { it.id inList relatedTopicIds }.toList() else emptyList()
        val relatedAuthors = if(relatedAuthorIds.isNotEmpty()) data.db.sequenceOf(Authors).filter { it.id inList relatedAuthorIds }.toList() else emptyList()

        val validatedTags = metaManager.exportTag(oldTags.mapNotNull { (i, e) -> if(e == ExportType.NO) i else null }).first //直接忽略任何冲突组错误
        val validatedTopics = metaManager.exportTopic(oldTopics.mapNotNull { (i, e) -> if(e == ExportType.NO) i else null })
        val validatedAuthors = metaManager.exportAuthor(oldAuthors.mapNotNull { (i, e) -> if(e == ExportType.NO) i else null })
        val oldTagIds = validatedTags.map { (i, _) -> i }.toSet()
        val oldTopicIds = validatedTags.map { (i, _) -> i }.toSet()
        val oldAuthorIds = validatedTags.map { (i, _) -> i }.toSet()

        //之后从新的related项中去掉在导出列表中已有的项，组合这两者形成新列表
        val newTags = validatedTags + relatedTags.filter { it.id !in oldTagIds }.map { it.id to ExportType.FROM_RELATED }
        val newTopics = validatedTopics + relatedTopics.filter { it.id !in oldTopicIds }.map { it.id to ExportType.FROM_RELATED }
        val newAuthors = validatedAuthors + relatedAuthors.filter { it.id !in oldAuthorIds }.map { it.id to ExportType.FROM_RELATED }

        //将新列表应用到实体
        metaManager.processMetaTags(thisId, false, analyseStatisticCount = false, Tags, BookTagRelations, newTags)
        metaManager.processMetaTags(thisId, false, analyseStatisticCount = false, Topics, BookTopicRelations, newTopics)
        metaManager.processMetaTags(thisId, false, analyseStatisticCount = false, Authors, BookAuthorRelations, newAuthors)
    }

    /**
     * 从所有子项获取meta。注意统一设定exportType=FROM_RELATED。
     */
    private fun <IR : EntityMetaRelationTable<*>> getOneMetaFromImages(thisId: Int, imageTagRelations: IR, conditionRate: Double): List<Int> {
        val metaTags = data.db.from(BookImageRelations)
            .innerJoin(imageTagRelations, imageTagRelations.entityId() eq BookImageRelations.imageId)
            .select(imageTagRelations.metaId(), count(imageTagRelations.entityId()).aliased("count"))
            .where { BookImageRelations.bookId eq thisId }
            .groupBy(imageTagRelations.metaId())
            .map { it[imageTagRelations.metaId()]!! to it.getInt("count") }
        if(metaTags.isNotEmpty()) {
            //存在一个临界阈值，仅当出现频数超过最大频数的这个比率时，标签才会被选入
            val conditionCount = (metaTags.maxOf { (_, count) -> count } * conditionRate).toInt()
            val selectedTags = metaTags.filter { (_, count) -> count >= conditionCount }.map { (id, _) -> id }
            return selectedTags
        }
        return emptyList()
    }

    /**
     * 在partial update操作后，重新计算项目数量和封面的fileId。
     */
    private fun refreshFirstCover(thisId: Int, refreshCount: Boolean = true, refreshFileId: Boolean = true) {
        val fileId = if(refreshFileId) {
            data.db.from(BookImageRelations)
                .innerJoin(Illusts, BookImageRelations.imageId eq Illusts.id)
                .select(Illusts.fileId)
                .where { BookImageRelations.bookId eq thisId }
                .orderBy(BookImageRelations.ordinal.asc())
                .limit(0, 1)
                .firstOrNull()
                ?.let { it[Illusts.fileId]!! }
        }else null
        val count = if(refreshCount) {
            data.db.sequenceOf(BookImageRelations).count { it.bookId eq thisId }
        }else null

        if(refreshFileId || refreshCount) {
            data.db.update(Books) {
                where { it.id eq thisId }
                if(refreshCount) set(it.cachedCount, count!!)
                if(refreshFileId) set(it.fileId, fileId)
                set(it.updateTime, Instant.now())
            }
        }
    }

    /**
     * 应用images列表。对列表进行整体替换。
     * @return oldImageIds
     */
    fun updateSubImages(thisId: Int, imageIds: List<Int>): List<Int> {
        val oldImageIds = data.db.from(BookImageRelations)
            .select(BookImageRelations.imageId)
            .where { BookImageRelations.bookId eq thisId }
            .map { it[BookImageRelations.imageId]!! }

        data.db.delete(BookImageRelations) { it.bookId eq thisId }

        if(imageIds.isNotEmpty()) data.db.batchInsert(BookImageRelations) {
            imageIds.forEachIndexed { index, imageId ->
                item {
                    set(it.bookId, thisId)
                    set(it.ordinal, index)
                    set(it.imageId, imageId)
                }
            }
        }

        return oldImageIds
    }

    /**
     * 插入新的images。新的和已存在的images保持表单指定的相对顺序不变，插入到指定的新位置。
     */
    fun upsertSubImages(thisId: Int, imageIds: List<Int>, ordinal: Int?) {
        //首先删除已存在的项
        val indexes = retrieveSubOrdinalById(thisId, imageIds).map { it.ordinal }
        val count = data.db.sequenceOf(BookImageRelations).count { it.bookId eq thisId }
        if(indexes.isNotEmpty()) {
            //删除
            data.db.delete(BookImageRelations) { (it.bookId eq thisId) and (it.ordinal inList indexes) }
            //将余下的项向前缩进
            data.db.batchUpdate(BookImageRelations) {
                indexes.asSequence()
                    .windowed(2, 1, true) { it[0] to it.getOrElse(1) { count } }
                    .forEachIndexed { index, (fromOrdinal, toOrdinal) ->
                        item {
                            where { (it.bookId eq thisId) and (it.ordinal greaterEq fromOrdinal) and (it.ordinal less toOrdinal) }
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
        if(finalOrdinal < countAfterDeleted) data.db.update(BookImageRelations) {
            where { (it.bookId eq thisId) and (it.ordinal greaterEq finalOrdinal) }
            set(it.ordinal, it.ordinal plus imageIds.size)
        }
        //然后插入新项
        if(imageIds.isNotEmpty()) data.db.batchInsert(BookImageRelations) {
            imageIds.forEachIndexed { index, imageId ->
                item {
                    set(it.bookId, thisId)
                    set(it.ordinal, finalOrdinal + index)
                    set(it.imageId, imageId)
                }
            }
        }

        //刷新fileId的条件是indexes第一项是0，也就是说之前的cover被移走了。由于indexes有序，第一项肯定是最小的。
        //或者另一个条件是ordinal/finalOrdinal为0，也就是插入位置是首位。
        refreshFirstCover(thisId, refreshCount = true, refreshFileId = ordinal == 0 || finalOrdinal == 0 || indexes.firstOrNull() == 0)
    }

    /**
     * 移动一部分images的顺序。这部分images的相对顺序保持不变，移动到指定的新位置。
     */
    fun moveSubImages(thisId: Int, imageIds: List<Int>, ordinal: Int?) {
        val relations = retrieveSubOrdinalById(thisId, imageIds)
        val indexes = relations.map { it.ordinal }
        if(indexes.isNotEmpty()) {
            val count = data.db.sequenceOf(BookImageRelations).count { it.bookId eq thisId }

            //先删除所有要移动的项
            data.db.delete(BookImageRelations) { (it.bookId eq thisId) and (it.ordinal inList indexes) }
            //将余下的项向前缩进
            data.db.batchUpdate(BookImageRelations) {
                indexes.asSequence()
                    .windowed(2, 1, true) { it[0] to it.getOrElse(1) { count } }
                    .forEachIndexed { index, (fromOrdinal, toOrdinal) ->
                        item {
                            where { (it.bookId eq thisId) and (it.ordinal greaterEq fromOrdinal) and (it.ordinal less toOrdinal) }
                            set(it.ordinal, it.ordinal minus (index + 1))
                        }
                    }
            }
            //实际的插入ordinal是指定ordinal减去ordinal之前被移除的项的数量的位置。这样保证最终插入位置确实是指定的插入位置，而不会发生偏移
            val countAfterDeleted = count - indexes.size
            val finalOrdinal = if(ordinal != null && ordinal <= count) ordinal - indexes.count { it < ordinal } //ordinal在count范围内，则正常计算即可
            else countAfterDeleted //不在合法范围内，那么实际上就是放在最后，计算成countAfterDeleted即可

            //再向后挪动空出位置
            if(finalOrdinal < countAfterDeleted) data.db.update(BookImageRelations) {
                where { (it.bookId eq thisId) and (it.ordinal greaterEq finalOrdinal) }
                set(it.ordinal, it.ordinal plus indexes.size)
            }
            //重新插入要移动的项
            if(relations.isNotEmpty()) data.db.batchInsert(BookImageRelations) {
                //迭代这部分要移动的项目列表
                relations.forEachIndexed { index, r ->
                    item {
                        set(it.bookId, thisId)
                        set(it.ordinal, finalOrdinal + index)
                        set(it.imageId, r.imageId)
                    }
                }
            }

            //不会刷新数量。
            //刷新fileId的条件是indexes第一项是0，也就是说之前的cover被移走了。由于indexes有序，第一项肯定是最小的。
            //或者另一个条件是ordinal/finalOrdinal为0，也就是插入位置是首位。
            refreshFirstCover(thisId, refreshCount = false, refreshFileId = ordinal == 0 || finalOrdinal == 0 || indexes.first() == 0)
        }
    }

    /**
     * 移动一部分images的顺序。使这部分images在当前book中的ordinal按照List给出的顺序重新排列。
     * 例如，原先的顺序是1,2,3,4,5,6,7,8,9,10，给出的列表是[7, 5, 6, 10, 3]，则最后获得的顺序是1,2,7,4,5,6,10,8,9,3。
     * 只有给出的列表中的项参与了顺序调换，其他项的顺序一定不变。
     */
    fun resortSubImages(thisId: Int, sortedImageIds: List<Int>) {
        val relations = retrieveSubOrdinalById(thisId, sortedImageIds)
        val finalSortedImageIds = if(relations.size == sortedImageIds.size) sortedImageIds else sortedImageIds.filter { id -> relations.any { it.imageId == id } }
        val ordinals = relations.map { it.ordinal }
        val imageIdToOrdinals = finalSortedImageIds.zip(ordinals)
        if(imageIdToOrdinals.isNotEmpty()) {
            data.db.batchUpdate(BookImageRelations) {
                for ((imageId, ordinal) in imageIdToOrdinals) {
                    item {
                        where { it.bookId eq thisId and (it.imageId eq imageId) }
                        set(it.ordinal, ordinal)
                    }
                }
            }

            //如果ordinals中有0号，则认为需要刷新封面。
            refreshFirstCover(thisId, refreshCount = false, refreshFileId = ordinals.first() == 0)
        }
    }

    /**
     * 删除一部分images。
     * @throws ResourceNotExist ("images", number[]) 要操作的image不存在
     */
    fun deleteSubImages(thisId: Int, imageIds: List<Int>) {
        val indexes = retrieveSubOrdinalById(thisId, imageIds).map { it.ordinal }
        if(indexes.isNotEmpty()) {
            val count = data.db.sequenceOf(BookImageRelations).count { it.bookId eq thisId }
            //删除
            data.db.delete(BookImageRelations) { (it.bookId eq thisId) and (it.ordinal inList indexes) }
            //将余下的项向前缩进
            data.db.batchUpdate(BookImageRelations) {
                indexes.asSequence()
                    .windowed(2, 1, true) { it[0] to it.getOrElse(1) { count } }
                    .forEachIndexed { index, (fromOrdinal, toOrdinal) ->
                        item {
                            where { (it.bookId eq thisId) and (it.ordinal greaterEq fromOrdinal) and (it.ordinal less toOrdinal) }
                            set(it.ordinal, it.ordinal minus (index + 1))
                        }
                    }
            }

            //刷新fileId的条件是indexes第一项是0，也就是说之前的cover被删除了。由于indexes有序，第一项肯定是最小的。
            refreshFirstCover(thisId, refreshCount = true, refreshFileId = indexes.first() == 0)
        }
    }

    /**
     * 根据image ids，映射得到它们的relation关系。返回结果按ordinal排序。忽略哪些不存在的项。
     */
    private fun retrieveSubOrdinalById(thisId: Int, imageIds: List<Int>): List<BookImageRelation> {
        return data.db.sequenceOf(BookImageRelations)
            .filter { (it.bookId eq thisId) and (it.imageId inList imageIds) }
            .sortedBy { it.ordinal.asc() }
            .toList()
    }
}