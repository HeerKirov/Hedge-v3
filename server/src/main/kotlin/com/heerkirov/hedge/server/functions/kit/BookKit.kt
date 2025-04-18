package com.heerkirov.hedge.server.functions.kit

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
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
     * @throws ConflictingGroupMembersError 发现标签冲突组
     */
    fun updateMeta(thisId: Int, newTags: Opt<List<Int>>, newTopics: Opt<List<Int>>, newAuthors: Opt<List<Int>>,
                   creating: Boolean = false) {
        //检出每种tag的数量。这个数量指新设定的值或已存在的值中notExported的数量
        val tagCount = if(newTags.isPresent) newTags.value.size else if(creating) 0 else metaManager.getNotExportedMetaCount(thisId, IllustTagRelations)
        val topicCount = if(newTopics.isPresent) newTopics.value.size else if(creating) 0 else metaManager.getNotExportedMetaCount(thisId, IllustTopicRelations)
        val authorCount = if(newAuthors.isPresent) newAuthors.value.size else if(creating) 0 else metaManager.getNotExportedMetaCount(thisId, IllustAuthorRelations)

        //注释说明见IllustKit的相同功能
        if(tagCount == 0 && topicCount == 0 && authorCount == 0) {
            if(newTags.isPresent) metaManager.deleteMetaTags(thisId, BookTagRelations, Tags, false)
            if(newAuthors.isPresent) metaManager.deleteMetaTags(thisId, BookAuthorRelations, Authors, false)
            if(newTopics.isPresent) metaManager.deleteMetaTags(thisId, BookTopicRelations, Topics, false)
            //从children拷贝全部notExported的metaTag，然后做导出
            copyAllMetaFromImages(thisId)
        }else if(newTags.isPresent || newAuthors.isPresent || newTopics.isPresent){
            //存在任意一项已修改
            if((newAuthors.isPresent || authorCount == 0)
                && (newTopics.isPresent || topicCount == 0)
                && (newTags.isPresent || tagCount == 0)) {
                //若发现未修改列表数量都为0，已修改至少一项不为0: 此时从"从依赖项获得exportedTag"的状态转向"自己持有tag"的状态，清除所有metaTag
                //tips: 不修改统计计数
                metaManager.deleteMetaTags(thisId, IllustTagRelations, Tags, analyseStatisticCount = false, remainNotExported = true)
                metaManager.deleteMetaTags(thisId, IllustAuthorRelations, Authors, analyseStatisticCount = false, remainNotExported = true)
                metaManager.deleteMetaTags(thisId, IllustTopicRelations, Topics, analyseStatisticCount = false, remainNotExported = true)
            }

            newTags.alsoOpt {
                metaManager.processMetaTags(thisId, creating, false,
                    metaTag = Tags,
                    metaRelations = BookTagRelations,
                    newTagIds = metaManager.validateAndExportTag(it))
            }
            newTopics.alsoOpt {
                metaManager.processMetaTags(thisId, creating, false,
                    metaTag = Topics,
                    metaRelations = BookTopicRelations,
                    newTagIds = metaManager.validateAndExportTopic(it))
            }
            newAuthors.alsoOpt {
                metaManager.processMetaTags(thisId, creating, false,
                    metaTag = Authors,
                    metaRelations = BookAuthorRelations,
                    newTagIds = metaManager.validateAndExportAuthor(it))
            }
        }
    }

    /**
     * 在没有更新的情况下，强制重新导出meta tag。
     */
    fun refreshAllMeta(thisId: Int) {
        val tags = metaManager.getNotExportMetaTags(thisId, BookTagRelations, Tags)
        val topics = metaManager.getNotExportMetaTags(thisId, BookTopicRelations, Topics)
        val authors = metaManager.getNotExportMetaTags(thisId, BookAuthorRelations, Authors)

        val tagCount = tags.size
        val topicCount = topics.size
        val authorCount = authors.size

        fun deleteAllMeta(remainNotExported: Boolean = false) {
            if(tagCount == 0) metaManager.deleteMetaTags(thisId, BookTagRelations, Tags, false, remainNotExported)
            if(authorCount == 0) metaManager.deleteMetaTags(thisId, BookAuthorRelations, Authors, false, remainNotExported)
            if(topicCount == 0) metaManager.deleteMetaTags(thisId, BookTopicRelations, Topics, false, remainNotExported)
        }

        if(tagCount == 0 && topicCount == 0 && authorCount == 0) {
            //若发现当前列表数全部为0，那么从依赖项拷贝tag。在拷贝之前，清空全列表，防止duplicated key。
            deleteAllMeta()
            copyAllMetaFromImages(thisId)
        }else{
            //至少一个列表不为0时，清空所有为0的列表的全部tag
            deleteAllMeta(remainNotExported = true)

            metaManager.processMetaTags(thisId, creating = false, analyseStatisticCount = false,
                metaTag = Tags,
                metaRelations = BookTagRelations,
                newTagIds = metaManager.exportTag(tags).first) //直接忽略任何冲突组错误
            metaManager.processMetaTags(thisId, creating = false, analyseStatisticCount = false,
                metaTag = Topics,
                metaRelations = BookTopicRelations,
                newTagIds = metaManager.exportTopic(topics))
            metaManager.processMetaTags(thisId, creating = false, analyseStatisticCount = false,
                metaTag = Authors,
                metaRelations = BookAuthorRelations,
                newTagIds = metaManager.exportAuthor(authors))
        }
    }

    /**
     * 从所有子项拷贝meta并处理合并，统一设定为exported。
     * book的子项合并和collection不同，它按照一个出现频率的阈值取一部分tag。
     */
    private fun copyAllMetaFromImages(thisId: Int) {
        fun <IR : EntityMetaRelationTable<*>, AR:EntityMetaRelationTable<*>> copyOneMeta(imageTagRelations: IR, bookTagRelations: AR, conditionRate: Double) {
            val metaTags = data.db.from(BookImageRelations)
                .innerJoin(Illusts, BookImageRelations.imageId eq Illusts.id)
                .innerJoin(imageTagRelations, imageTagRelations.entityId() eq Illusts.id)
                .select(imageTagRelations.metaId(), count(imageTagRelations.entityId()).aliased("count"))
                .where { BookImageRelations.bookId eq thisId }
                .groupBy(imageTagRelations.metaId())
                .map { it[imageTagRelations.metaId()]!! to it.getInt("count") }
            if(metaTags.isNotEmpty()) {
                //存在一个临界阈值，仅当出现频数超过最大频数的这个比率时，标签才会被选入。
                val conditionCount = (metaTags.maxOf { (_, count) -> count } * conditionRate).toInt()
                val selectedTags = metaTags.filter { (_, count) -> count >= conditionCount }.map { (id, _) -> id }
                if(selectedTags.isNotEmpty()) {
                    data.db.batchInsert(bookTagRelations) {
                        for (tagId in selectedTags) {
                            item {
                                set(it.entityId(), thisId)
                                set(it.metaId(), tagId)
                                set(it.exported(), true)
                            }
                        }
                    }
                }
            }
        }

        //tag的临界阈值是30%，而author/topic的是5%
        copyOneMeta(IllustTagRelations, BookTagRelations, 0.3)
        copyOneMeta(IllustAuthorRelations, BookAuthorRelations, 0.05)
        copyOneMeta(IllustTopicRelations, BookTopicRelations, 0.05)
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