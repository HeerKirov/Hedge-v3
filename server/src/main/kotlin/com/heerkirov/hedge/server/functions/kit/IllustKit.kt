package com.heerkirov.hedge.server.functions.kit

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.functions.manager.MetaManager
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.enums.ExportType
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.enums.TagTopicType
import com.heerkirov.hedge.server.events.IllustUpdated
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.utils.business.checkScore
import com.heerkirov.hedge.server.utils.ktorm.asSequence
import com.heerkirov.hedge.server.utils.letIf
import com.heerkirov.hedge.server.utils.structs.LinkedNodeList
import com.heerkirov.hedge.server.utils.tuples.Tuple4
import com.heerkirov.hedge.server.utils.types.Opt
import org.ktorm.dsl.*
import org.ktorm.dsl.where
import org.ktorm.entity.*
import java.time.LocalDate
import kotlin.math.ceil
import kotlin.math.floor
import kotlin.math.roundToInt

class IllustKit(private val appdata: AppDataManager,
                private val data: DataRepository,
                private val bus: EventBus,
                private val metaManager: MetaManager) {
    /**
     * 检查score的值，不允许其超出范围。
     */
    fun validateScore(score: Int) {
        if(!checkScore(score)) throw be(ParamError("score"))
    }

    /**
     * 检验给出的tags/topics/authors的正确性，将其追加到现有列表中，处理导出并应用其更改。
     * @return 返回一个Tagme用以标示此次更新涉及了对哪些类型的更改，可以直接用于Tagme属性的更新。需要注意它会受到setting中相关选项的影响。
     */
    fun appendMeta(thisId: Int, appendTags: List<Int>, appendTopics: List<Int>, appendAuthors: List<Int>, isCollection: Boolean = false, ignoreNotExist: Boolean = false): Illust.Tagme {
        //1. 取出所有tag
        //2. 过滤append，确认是否真的存在新的项
        //3. 将原有的notExported tag与append tag一起进行validate，获得导出结果
        //4. 从原有tag中取出所有FROM_RELATED的项，移除掉在validate结果中的项，这是因为按理append操作无论如何不会造成tag减少，因此FROM_RELATED的项可以沿用之前记录的，只需消除重复
        //5. 组合validate结果与related结果，应用给实体
        val tagChanged = if(appendTags.isNotEmpty()) {
            val existTags = metaManager.getMetaTags(thisId, IllustTagRelations, Tags)
            val notExportedIds = existTags.mapNotNull { (i, e) -> if(e == ExportType.NO) i.id else null }
            val appendIds = appendTags.filter { it !in notExportedIds }
            if(appendIds.isNotEmpty()) {
                val validatedTags = metaManager.validateAndExportTag(notExportedIds + appendIds, ignoreError = ignoreNotExist)
                val validatedIds = validatedTags.map { (i, _) -> i }
                val newTags = validatedTags + existTags.mapNotNull { (i, e) -> if(e == ExportType.FROM_RELATED && i.id !in validatedIds) i.id to e else null }
                metaManager.processMetaTags(thisId, creating = false, analyseStatisticCount = !isCollection, Tags, IllustTagRelations, newTags)
                true
            }else false
        }else false

        val topicChanged = if(appendTopics.isNotEmpty()) {
            val existTopics = metaManager.getMetaTags(thisId, IllustTopicRelations, Topics)
            val notExportedIds = existTopics.mapNotNull { (i, e) -> if(e == ExportType.NO) i.id else null }
            val appendIds = appendTopics.filter { it !in notExportedIds }
            if(appendIds.isNotEmpty()) {
                val validatedTopics = metaManager.validateAndExportTopicModel(notExportedIds + appendIds, ignoreError = ignoreNotExist)
                val validatedIds = validatedTopics.map { (i, _) -> i.id }
                val newTopics = validatedTopics.map { (i, e) -> i.id to e } + existTopics.mapNotNull { (i, e) -> if(e == ExportType.FROM_RELATED && i.id !in validatedIds) i.id to e else null }
                metaManager.processMetaTags(thisId, creating = false, analyseStatisticCount = !isCollection, Topics, IllustTopicRelations, newTopics)

                if(appdata.setting.meta.onlyCharacterTopic) { validatedTopics.any { (i, e) -> e == ExportType.NO && i.type == TagTopicType.CHARACTER } }else true
            }else false
        }else false

        val authorChanged = if(appendAuthors.isNotEmpty()) {
            val existAuthors = metaManager.getMetaTags(thisId, IllustAuthorRelations, Authors)
            val notExportedIds = existAuthors.mapNotNull { (i, e) -> if(e == ExportType.NO) i.id else null }
            val appendIds = appendAuthors.filter { it !in notExportedIds }
            if(appendIds.isNotEmpty()) {
                val validatedAuthors = metaManager.validateAndExportAuthor(notExportedIds + appendIds, ignoreError = ignoreNotExist)
                val validatedIds = validatedAuthors.map { (i, _) -> i }
                val newAuthors = validatedAuthors + existAuthors.mapNotNull { (i, e) -> if(e == ExportType.FROM_RELATED && i.id !in validatedIds) i.id to e else null }
                metaManager.processMetaTags(thisId, creating = false, analyseStatisticCount = !isCollection, Authors, IllustAuthorRelations, newAuthors)
                true
            }else false
        }else false

        return (Illust.Tagme.EMPTY as Illust.Tagme).letIf(appdata.setting.meta.autoCleanTagme) { r -> r.letIf(tagChanged) { it + Illust.Tagme.TAG }.letIf(authorChanged) { it + Illust.Tagme.AUTHOR }.letIf(topicChanged) { it + Illust.Tagme.TOPIC } }
    }

    /**
     * 检验给出的tags/topics/authors的正确性，处理导出，并应用其更改。
     * @param copyFromParent 当当前对象没有任何meta tag关联时，从parent复制tag，并提供parent的id
     * @param copyFromChildren 当当前对象没有任何meta tag关联时，从children复制tag
     * @param ignoreNotExist 忽略不存在的项，以及其他任何错误。此选项用于模糊/近似地完成metaTag的设置，而不在乎完全精确
     * @throws ResourceNotExist ("topics", number[]) 部分topics资源不存在。给出不存在的topic id列表
     * @throws ResourceNotExist ("authors", number[]) 部分authors资源不存在。给出不存在的author id列表
     * @throws ResourceNotExist ("tags", number[]) 部分tags资源不存在。给出不存在的tag id列表
     * @throws ResourceNotSuitable ("tags", number[]) 部分tags资源不适用。地址段不适用于此项。给出不适用的tag id列表
     * @throws ConflictingGroupMembersError 发现标签冲突组
     * @return 返回一个Tagme用以标示此次更新涉及了对哪些类型的更改，可以直接用于Tagme属性的更新。需要注意它会受到setting中相关选项的影响。
     */
    fun updateMeta(thisId: Int, newTags: Opt<List<Int>>, newTopics: Opt<List<Int>>, newAuthors: Opt<List<Int>>,
                   creating: Boolean = false, copyFromParent: Int? = null, copyFromChildren: Boolean = false, ignoreNotExist: Boolean = false): Illust.Tagme {
        //1. 取出所有现有的tag
        //2. 检查是否newTag与当前notExported列表确实不一致
        //3. 对newTag列表进行validate校验
        //4. 重新导出之后需要从RELATED重新获取关联项，从关联项中移除在validate中的结果
        //5. 组合validate与RELATED的结果，应用给实体
        val tagChanged = if(newTags.isPresent) {
            val exist = metaManager.getMetaTags(thisId, IllustTagRelations, Tags)
            val notExportedIds = exist.mapNotNull { (i, e) -> if(e == ExportType.NO) i.id else null }.toSet()
            if(notExportedIds != newTags.value.toSet()) {
                val validated = if(newTags.value.isEmpty()) emptyList() else metaManager.validateAndExportTag(newTags.value, ignoreError = ignoreNotExist)
                val validatedIds = validated.map { (i, _) -> i }.toSet()

                val relatedIds = if(copyFromChildren) getOneMetaFromChildren(thisId, IllustTagRelations) else if(copyFromParent != null) getOneMetaFromParent(copyFromParent, IllustTagRelations) else emptyList()
                val filteredRelatedIds = (relatedIds - validatedIds).map { it to ExportType.FROM_RELATED }
                metaManager.processMetaTags(thisId, creating, !copyFromChildren, Tags, IllustTagRelations, validated + filteredRelatedIds)

                true
            }else false
        }else false

        val topicChanged = if(newTopics.isPresent) {
            val exist = metaManager.getMetaTags(thisId, IllustTopicRelations, Topics)
            val notExportedIds = exist.mapNotNull { (i, e) -> if(e == ExportType.NO) i.id else null }.toSet()
            if(notExportedIds != newTopics.value.toSet()) {
                val validated = if(newTopics.value.isEmpty()) emptyList() else metaManager.validateAndExportTopicModel(newTopics.value, ignoreError = ignoreNotExist)
                val validatedIds = validated.map { (i, _) -> i.id }.toSet()

                val relatedIds = if(copyFromChildren) getOneMetaFromChildren(thisId, IllustTopicRelations) else if(copyFromParent != null) getOneMetaFromParent(copyFromParent, IllustTopicRelations) else emptyList()
                val filteredRelatedIds = (relatedIds - validatedIds).map { it to ExportType.FROM_RELATED }
                metaManager.processMetaTags(thisId, creating, !copyFromChildren, Topics, IllustTopicRelations, validated.map { (i, e) -> i.id to e } + filteredRelatedIds)

                if(appdata.setting.meta.onlyCharacterTopic) { validated.any { (i, e) -> e == ExportType.NO && i.type == TagTopicType.CHARACTER } }else true
            }else false
        }else false

        val authorChanged = if(newAuthors.isPresent) {
            val exist = metaManager.getMetaTags(thisId, IllustAuthorRelations, Authors)
            val notExportedIds = exist.mapNotNull { (i, e) -> if(e == ExportType.NO) i.id else null }.toSet()
            if(notExportedIds != newAuthors.value.toSet()) {
                val validated = if(newAuthors.value.isEmpty()) emptyList() else metaManager.validateAndExportAuthor(newAuthors.value, ignoreError = ignoreNotExist)
                val validatedIds = validated.map { (i, _) -> i }.toSet()

                val relatedIds = if(copyFromChildren) getOneMetaFromChildren(thisId, IllustAuthorRelations) else if(copyFromParent != null) getOneMetaFromParent(copyFromParent, IllustAuthorRelations) else emptyList()
                val filteredRelatedIds = (relatedIds - validatedIds).map { it to ExportType.FROM_RELATED }
                metaManager.processMetaTags(thisId, creating, !copyFromChildren, Authors, IllustAuthorRelations, validated + filteredRelatedIds)

                true
            }else false
        }else false

        return (Illust.Tagme.EMPTY as Illust.Tagme).letIf(appdata.setting.meta.autoCleanTagme) { r -> r.letIf(tagChanged) { it + Illust.Tagme.TAG }.letIf(authorChanged) { it + Illust.Tagme.AUTHOR }.letIf(topicChanged) { it + Illust.Tagme.TOPIC } }
    }

    /**
     * 从现有列表中移除指定的tags/topics/authors，然后重新处理导出并应用更改。
     * @return 返回一个Tagme用以标示此次更新涉及了对哪些类型的更改。它不会受到setting中相关选项的影响。
     */
    fun removeMeta(thisId: Int, removeTags: List<Int>, removeTopics: List<Int>, removeAuthors: List<Int>, copyFromParent: Int? = null, copyFromChildren: Boolean = false, ignoreNotExist: Boolean = false): Illust.Tagme {
        //1. 取出所有现有的tag
        //2. 检查是否真的存在not exported的在remove中的项
        //3. 提取移去remove列表之后的not exported列表，并进行validate校验
        //4. 重新导出之后需要从RELATED重新获取关联项，从关联项中移除在validate中的结果
        //5. 组合validate与RELATED的结果，应用给实体
        val tagChanged = if(removeTags.isNotEmpty()) {
            val existTags = metaManager.getMetaTags(thisId, IllustTagRelations, Tags)
            if(existTags.any { (i, e) -> e == ExportType.NO && i.id in removeTags }) {
                val currentIds = existTags.mapNotNull { (i, e) -> if(e == ExportType.NO && i.id !in removeTags) i.id else null }
                val validated = if(currentIds.isEmpty()) emptyList() else metaManager.validateAndExportTag(currentIds, ignoreError = ignoreNotExist)
                val validatedIds = validated.map { (i, _) -> i }.toSet()

                val relatedIds = if(copyFromChildren) getOneMetaFromChildren(thisId, IllustTagRelations) else if(copyFromParent != null) getOneMetaFromParent(copyFromParent, IllustTagRelations) else emptyList()
                val filteredRelatedIds = (relatedIds - validatedIds).map { it to ExportType.FROM_RELATED }
                metaManager.processMetaTags(thisId, false, !copyFromChildren, Tags, IllustTagRelations, validated + filteredRelatedIds)

                true
            }else false
        }else false

        val topicChanged = if(removeTopics.isNotEmpty()) {
            val existTopics = metaManager.getMetaTags(thisId, IllustTopicRelations, Topics)
            if(existTopics.any { (i, e) -> e == ExportType.NO && i.id in removeTopics }) {
                val currentIds = existTopics.mapNotNull { (i, e) -> if(e == ExportType.NO && i.id !in removeTopics) i.id else null }
                val validated = if(currentIds.isEmpty()) emptyList() else metaManager.validateAndExportTopic(currentIds, ignoreError = ignoreNotExist)
                val validatedIds = validated.map { (i, _) -> i }.toSet()

                val relatedIds = if(copyFromChildren) getOneMetaFromChildren(thisId, IllustTopicRelations) else if(copyFromParent != null) getOneMetaFromParent(copyFromParent, IllustTopicRelations) else emptyList()
                val filteredRelatedIds = (relatedIds - validatedIds).map { it to ExportType.FROM_RELATED }
                metaManager.processMetaTags(thisId, false, !copyFromChildren, Topics, IllustTopicRelations, validated + filteredRelatedIds)

                true
            }else false
        }else false

        val authorChanged = if(removeAuthors.isNotEmpty()) {
            val existAuthors = metaManager.getMetaTags(thisId, IllustAuthorRelations, Authors)
            if(existAuthors.any { (i, e) -> e == ExportType.NO && i.id in removeAuthors }) {
                val currentIds = existAuthors.mapNotNull { (i, e) -> if(e == ExportType.NO && i.id !in removeAuthors) i.id else null }
                val validated = if(currentIds.isEmpty()) emptyList() else metaManager.validateAndExportAuthor(currentIds, ignoreError = ignoreNotExist)
                val validatedIds = validated.map { (i, _) -> i }.toSet()

                val relatedIds = if(copyFromChildren) getOneMetaFromChildren(thisId, IllustAuthorRelations) else if(copyFromParent != null) getOneMetaFromParent(copyFromParent, IllustAuthorRelations) else emptyList()
                val filteredRelatedIds = (relatedIds - validatedIds).map { it to ExportType.FROM_RELATED }
                metaManager.processMetaTags(thisId, false, !copyFromChildren, Authors, IllustAuthorRelations, validated + filteredRelatedIds)

                true
            }else false
        }else false

        return (Illust.Tagme.EMPTY as Illust.Tagme)
            .letIf(tagChanged) { it + Illust.Tagme.TAG }
            .letIf(topicChanged) { it + Illust.Tagme.TOPIC }
            .letIf(authorChanged) { it + Illust.Tagme.AUTHOR }
    }

    /**
     * 在没有改变主体的meta tag的情况下重新导出，以更新关联客体变更引发的连锁变更。
     * @param forceUpdate 开启此选项，对主体所持有的meta tag也强制重新导出。
     */
    fun refreshAllMeta(thisId: Int, copyFromParent: Int? = null, copyFromChildren: Boolean = false, forceUpdate: Boolean = false) {
        val analyseStatisticCount = !copyFromChildren

        //取出所有现有的meta tag
        val oldTags = metaManager.getMetaTags(thisId, IllustTagRelations, Tags)
        val oldTopics = metaManager.getMetaTags(thisId, IllustTopicRelations, Topics)
        val oldAuthors = metaManager.getMetaTags(thisId, IllustAuthorRelations, Authors)

        //根据关联客体，取出其持有的meta tag
        val relatedTagIds = if(copyFromChildren) getOneMetaFromChildren(thisId, IllustTagRelations) else if(copyFromParent != null) getOneMetaFromParent(copyFromParent, IllustTagRelations) else emptyList()
        val relatedTopicIds = if(copyFromChildren) getOneMetaFromChildren(thisId, IllustTopicRelations) else if(copyFromParent != null) getOneMetaFromParent(copyFromParent, IllustTopicRelations) else emptyList()
        val relatedAuthorIds = if(copyFromChildren) getOneMetaFromChildren(thisId, IllustAuthorRelations) else if(copyFromParent != null) getOneMetaFromParent(copyFromParent, IllustAuthorRelations) else emptyList()
        val relatedTags = if(relatedTagIds.isNotEmpty()) data.db.sequenceOf(Tags).filter { it.id inList relatedTagIds }.toList() else emptyList()
        val relatedTopics = if(relatedTopicIds.isNotEmpty()) data.db.sequenceOf(Topics).filter { it.id inList relatedTopicIds }.toList() else emptyList()
        val relatedAuthors = if(relatedAuthorIds.isNotEmpty()) data.db.sequenceOf(Authors).filter { it.id inList relatedAuthorIds }.toList() else emptyList()

        if(forceUpdate) {
            //强制刷新时，重新导出所有持有的meta tag
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
            metaManager.processMetaTags(thisId, false, analyseStatisticCount, Tags, IllustTagRelations, newTags)
            metaManager.processMetaTags(thisId, false, analyseStatisticCount, Topics, IllustTopicRelations, newTopics)
            metaManager.processMetaTags(thisId, false, analyseStatisticCount, Authors, IllustAuthorRelations, newAuthors)
        }else{
            //当前持有的meta tag过滤，仅保留不是FROM_RELATED的项，或者仍然在新的related中的项；新的related中的项去掉在原列表中已有的项，组合这两者形成新列表
            val oldTagIds = oldTags.map { (i, _) -> i.id }.toSet()
            val oldTopicIds = oldTopics.map { (i, _) -> i.id }.toSet()
            val oldAuthorIds = oldAuthors.map { (i, _) -> i.id }.toSet()
            val newTags = oldTags.filter { (i, e) -> e != ExportType.FROM_RELATED || i.id in relatedTagIds }.map { (i, e) -> i.id to e } + relatedTags.filter { it.id !in oldTagIds }.map { it.id to ExportType.FROM_RELATED }
            val newTopics = oldTopics.filter { (i, e) -> e != ExportType.FROM_RELATED || i.id in relatedTopicIds }.map { (i, e) -> i.id to e } + relatedTopics.filter { it.id !in oldTopicIds }.map { it.id to ExportType.FROM_RELATED }
            val newAuthors = oldAuthors.filter { (i, e) -> e != ExportType.FROM_RELATED || i.id in relatedAuthorIds }.map { (i, e) -> i.id to e } + relatedAuthors.filter { it.id !in oldAuthorIds }.map { it.id to ExportType.FROM_RELATED }

            //将新列表应用到实体
            metaManager.processMetaTags(thisId, false, analyseStatisticCount, Tags, IllustTagRelations, newTags)
            metaManager.processMetaTags(thisId, false, analyseStatisticCount, Topics, IllustTopicRelations, newTopics)
            metaManager.processMetaTags(thisId, false, analyseStatisticCount, Authors, IllustAuthorRelations, newAuthors)
        }
    }

    /**
     * 从parent获取meta。注意统一设定exportType=FROM_RELATED，以及修改MetaTag的计数。
     */
    private fun <R : EntityMetaRelationTable<*>> getOneMetaFromParent(parentId: Int, tagRelations: R): List<Int> {
        return data.db.from(tagRelations)
            .selectDistinct(tagRelations.metaId())
            .where { (tagRelations.entityId() eq parentId) and (tagRelations.exported() notEq ExportType.FROM_RELATED) }
            .map { it[tagRelations.metaId()]!! }
    }

    /**
     * 从当前项的所有子项获取meta。注意统一设定exportType=FROM_RELATED。
     */
    private fun <R> getOneMetaFromChildren(thisId: Int, tagRelations: R): List<Int> where R: EntityMetaRelationTable<*> {
        //读取这种tag类型下，每一个child拥有的not exported的tag的数量，筛选出至少有一个not exported的children。
        //每种metaTag分别判断即可，不需要联合判断某个child是否是“全部notExported”的，因为只要有一个，就肯定是；一个也没有，就肯定不是
        val availableChildren = data.db.from(Illusts)
            .innerJoin(tagRelations, tagRelations.entityId() eq Illusts.id and (tagRelations.exported() eq ExportType.NO))
            .select(Illusts.id, count(tagRelations.metaId()).aliased("count"))
            .where { Illusts.parentId eq thisId }
            .groupBy(Illusts.id)
            .having { count(tagRelations.metaId()).aliased("count") greater 0 }
            .map { it[Illusts.id]!! }
        return data.db.from(tagRelations)
            .selectDistinct(tagRelations.metaId())
            .where { (tagRelations.entityId() inList availableChildren) and (tagRelations.exported() notEq ExportType.FROM_RELATED) }
            .asSequence()
            .map { it[tagRelations.metaId()]!! }
            .toList()
    }

    /**
     * 从一组images中，获得firstCover导出属性和score导出属性。
     * 如果开启了相关选项以及指定了specifyPartitionTime，则partitionTime和orderTime将从指定分区内产生。
     * @throws ResourceNotExist ("specifyPartitionTime", LocalDate) 在指定的时间分区下没有存在的图像
     * @return (fileId, score, favorite, partitionTime, orderTime)
     */
    fun getExportedPropsFromList(images: List<Illust>, specifyPartitionTime: LocalDate?): Tuple6<Int, Int?, Boolean, Illust.Tagme, LocalDate, Long> {
        val fileId = images.minBy { it.orderTime }.fileId
        val score = images.asSequence().mapNotNull { it.score }.average().run { if(isNaN()) null else this }?.roundToInt()
        val favorite = images.any { it.favorite }
        val tagme = images.map { it.tagme }.reduce { acc, tagme -> acc + tagme }
        val partitionTime: LocalDate
        val orderTime: Long
        if(appdata.setting.meta.centralizeCollection && specifyPartitionTime != null) {
            partitionTime = specifyPartitionTime
            orderTime = images.filter { it.partitionTime == specifyPartitionTime }.minOfOrNull { it.orderTime } ?: throw be(ResourceNotExist("specifyPartitionTime", specifyPartitionTime))
        }else{
            partitionTime = images.asSequence().map { it.partitionTime }.groupBy { it }.maxBy { it.value.size }.key
            orderTime = images.filter { it.partitionTime == partitionTime }.minOf { it.orderTime }
        }

        return Tuple6(fileId, score, favorite, tagme, partitionTime, orderTime)
    }

    /**
     * collection：根据children列表，获得cachedBookIds和cachedFolderIds。
     * 该函数只需要使用在create中，因为create不触发imageChanged事件，而更新操作会触发，并触发backend exporter。
     */
    fun getCachedBookAndFolderFromImages(images: List<Illust>): Pair<List<Int>, List<Int>> {
        val imageIds = images.map { it.id }

        val bookIds = data.db.from(BookImageRelations)
            .select(BookImageRelations.bookId)
            .where { BookImageRelations.imageId inList imageIds }
            .groupBy(BookImageRelations.bookId)
            .map { it[BookImageRelations.bookId]!! }

        val folderIds = data.db.from(FolderImageRelations)
            .select(FolderImageRelations.folderId)
            .where { FolderImageRelations.imageId inList imageIds }
            .groupBy(FolderImageRelations.folderId)
            .map { it[FolderImageRelations.folderId]!! }

        return Pair(bookIds, folderIds)
    }

    /**
     * 重新导出列表中所有images的book flag，再重新导出它们关联的collection；同时，还重新设置collection的book relations cache。
     */
    fun exportIllustBookRelations(imageIds: List<Int>) {
        val images = data.db.from(Illusts)
            .leftJoin(BookImageRelations, BookImageRelations.imageId eq Illusts.id)
            .select(Illusts.id, Illusts.parentId, count(BookImageRelations.bookId).aliased("count"))
            .where { (Illusts.type notEq IllustModelType.COLLECTION) and (Illusts.id inList imageIds) }
            .groupBy(Illusts.id)
            .map { Tuple3(it[Illusts.id]!!, it[Illusts.parentId], it.getInt("count")) }

        if(images.isNotEmpty()) {
            data.db.batchUpdate(Illusts) {
                for ((id, _, cnt) in images) {
                    item {
                        where { it.id eq id }
                        set(it.cachedBookCount, cnt)
                    }
                }
            }

            val parentIds = images.mapNotNull { (_, parentId, _) -> parentId }.toSet()
            val j = Illusts.aliased("joined_image")

            val parentToBooks = data.db.from(Illusts)
                .innerJoin(j, Illusts.id eq j.parentId)
                .innerJoin(BookImageRelations, BookImageRelations.imageId eq j.id)
                .select(Illusts.id, BookImageRelations.bookId)
                .where { (Illusts.type eq IllustModelType.COLLECTION) and (Illusts.id inList parentIds) }
                .groupBy(Illusts.id, BookImageRelations.bookId)
                .map { Pair(it[Illusts.id]!!, it[BookImageRelations.bookId]!!) }
                .groupBy({ (i, _) -> i }) { (_, b) -> b }

            val parentWithNoBooks = parentIds - parentToBooks.keys

            if(parentToBooks.isNotEmpty() || parentWithNoBooks.isNotEmpty()) {
                data.db.batchUpdate(Illusts) {
                    for ((id, books) in parentToBooks) {
                        item {
                            where { it.id eq id }
                            set(it.cachedBookIds, books.ifEmpty { null })
                            set(it.cachedBookCount, books.size)
                        }
                    }
                    for (id in parentWithNoBooks) {
                        item {
                            where { it.id eq id }
                            set(it.cachedBookIds, null)
                            set(it.cachedBookCount, 0)
                        }
                    }
                }
            }
        }
    }

    /**
     * 重新设置collection的folder relations cache。
     */
    fun exportIllustFolderRelations(imageIds: List<Int>) {
        val parentIds = data.db.from(Illusts)
            .select(Illusts.parentId)
            .where { (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT) and (Illusts.id inList imageIds) and Illusts.parentId.isNotNull() }
            .map { it[Illusts.parentId]!! }
            .toSet()

        if(parentIds.isNotEmpty()) {
            val j = Illusts.aliased("joined_image")
            val parentToFolders = data.db.from(Illusts)
                .innerJoin(j, Illusts.id eq j.parentId)
                .innerJoin(FolderImageRelations, FolderImageRelations.imageId eq j.id)
                .select(Illusts.id, FolderImageRelations.folderId)
                .where { (Illusts.type eq IllustModelType.COLLECTION) and (Illusts.id inList parentIds) }
                .groupBy(Illusts.id, FolderImageRelations.folderId)
                .map { Pair(it[Illusts.id]!!, it[FolderImageRelations.folderId]!!) }
                .groupBy({ (i, _) -> i }) { (_, b) -> b }

            val parentWithNoFolders = parentIds - parentToFolders.keys

            if(parentToFolders.isNotEmpty() || parentWithNoFolders.isNotEmpty()) {
                data.db.batchUpdate(Illusts) {
                    for ((id, folders) in parentToFolders) {
                        item {
                            where { it.id eq id }
                            set(it.cachedFolderIds, folders.ifEmpty { null })
                        }
                    }
                    for (id in parentWithNoFolders) {
                        item {
                            where { it.id eq id }
                            set(it.cachedFolderIds, null)
                        }
                    }
                }
            }
        }
    }

    /**
     * 对给出项的排序时间进行微调。如果项和它们周围的项的排序时间相同或过近，就会微调一下位置，使彼此错开。
     * 如果有必要，邻近项的排序时间也会被调整。邻近项被调整时会发出相应的事件，给出的项则不会。
     * @param illustIds 已经排序的项与它们的排序时间，此参数必须已经按排序时间降序。在调用此函数之前，项的排序已经写入数据库，此参数仅作通知用，而不是使用此参数做修改。
     * @param eventForAllIllusts 为所有的项发送调整事件，而不只是项列表之外的项。
     */
    fun tuningOrderTime(illustIds: List<Pair<Int, Long>>, eventForAllIllusts: Boolean = false): List<Pair<Int, Long>> {
        if(illustIds.isEmpty()) return emptyList()

        fun reorderIllustIds(illustIds: List<Pair<Int, Long>>, allIllustIds: List<Pair<Int, Long>>): List<Pair<Int, Long>> {
            val groupedMap = illustIds.groupBy { it.second }.filterValues { it.size > 1 }.mapValues { (_, v) -> v.map { (id, _) -> id } }
            val nextMap = groupedMap.keys.associateWith { 0 }.toMutableMap()

            return allIllustIds.map { pair ->
                val (id, ot) = pair
                if(ot in groupedMap) {
                    val ids = groupedMap.getValue(ot)
                    if(id in ids) {
                        val nextIndex = nextMap.getValue(ot)
                        val nextId = ids[nextIndex]
                        nextMap[ot] = nextIndex + 1
                        Pair(nextId, ot)
                    }else{
                        pair
                    }
                }else{
                    pair
                }
            }
        }

        fun findArea(node: LinkedNodeList<Pair<Int, Long>>.Node?): Pair<LinkedNodeList<Pair<Int, Long>>.Node, LinkedNodeList<Pair<Int, Long>>.Node>? {
            var begin: LinkedNodeList<Pair<Int, Long>>.Node? = null
            run {
                var cur = node
                while (cur != null) {
                    if(cur.next != null && cur.next!!.value.second - cur.value.second < 1000L) {
                        begin = cur
                        break
                    }
                    cur = cur.next
                }
            }
            if(begin == null) return null
            run {
                var cur = begin!!.next!!
                while (true) {
                    if(cur.next == null || (cur.next != null && cur.next!!.value.second - cur.value.second >= 1000L)) {
                        return Pair(begin!!, cur)
                    }
                    cur = cur.next!!
                }
            }
        }

        fun findExpand(areas: MutableList<Tuple4<LinkedNodeList<Pair<Int, Long>>.Node, LinkedNodeList<Pair<Int, Long>>.Node, Long, Long>>, currentBegin: LinkedNodeList<Pair<Int, Long>>.Node, currentEnd: LinkedNodeList<Pair<Int, Long>>.Node, tuningLower: Long, tuningUpper: Long): Pair<LinkedNodeList<Pair<Int, Long>>.Node?, LinkedNodeList<Pair<Int, Long>>.Node?> {
            var expandBegin: LinkedNodeList<Pair<Int, Long>>.Node? = null
            var expandEnd: LinkedNodeList<Pair<Int, Long>>.Node? = null
            while(areas.isNotEmpty()) {
                if(areas.last().f4 > tuningLower - 1000L) {
                    expandBegin = areas.last().f1
                    areas.removeLast()
                }else{
                    break
                }
            }
            if(expandBegin == null) {
                var cur = currentBegin
                while (true) {
                    if(cur.prev == null) {
                        //在扩展达到当前项列表的两端后，需要去数据库再拉取更多的项，必须保证找到一个不需要调整的间隔才能停下。
                        val appends = data.db.from(Illusts)
                            .select(Illusts.id, Illusts.orderTime)
                            .where { (Illusts.type notEq IllustModelType.COLLECTION) and (Illusts.orderTime greaterEq cur.value.second - 1000 * 10) and ((Illusts.orderTime less cur.value.second)) }
                            .orderBy(Illusts.orderTime.asc())
                            .map { Pair(it[Illusts.id]!!, it[Illusts.orderTime]!!) }
                        if(appends.isNotEmpty()) appends.asReversed().forEach { cur.parent.addFirst(it) } else break
                    }
                    cur = cur.prev!!
                    if(cur.value.second > tuningLower - 1000L) expandBegin = cur else break
                }
            }
            run {
                var cur = currentEnd
                while (true) {
                    if(cur.next == null) {
                        //在扩展达到当前项列表的两端后，需要去数据库再拉取更多的项，必须保证找到一个不需要调整的间隔才能停下。
                        val appends = data.db.from(Illusts)
                            .select(Illusts.id, Illusts.orderTime)
                            .where { (Illusts.type notEq IllustModelType.COLLECTION) and (Illusts.orderTime lessEq cur.value.second + 1000 * 10) and ((Illusts.orderTime greater cur.value.second)) }
                            .orderBy(Illusts.orderTime.asc())
                            .map { Pair(it[Illusts.id]!!, it[Illusts.orderTime]!!) }
                        if(appends.isNotEmpty()) appends.forEach { cur.parent.addLast(it) } else break
                    }
                    cur = cur.next!!
                    if(cur.value.second < tuningUpper + 1000L) expandEnd = cur else break
                }
            }
            return Pair(expandBegin, expandEnd)
        }

        //根据给出的项，查询首尾时间外延10sec范围内的所有项。
        val allIllusts = data.db.from(Illusts)
            .select(Illusts.id, Illusts.orderTime)
            .where { (Illusts.type notEq IllustModelType.COLLECTION) and (Illusts.orderTime greaterEq illustIds.first().second - 1000 * 10) and (Illusts.orderTime lessEq illustIds.last().second + 1000 * 10) }
            .orderBy(Illusts.orderTime.asc(), Illusts.id.asc())
            .map { Pair(it[Illusts.id]!!, it[Illusts.orderTime]!!) }

        val db = LinkedNodeList(reorderIllustIds(illustIds, allIllusts))

        val areas = mutableListOf<Tuple4<LinkedNodeList<Pair<Int, Long>>.Node, LinkedNodeList<Pair<Int, Long>>.Node, Long, Long>>()

        while(true) {
            //找出下一个连锁片区。当两项之间的间隔小于1秒时，就认为这两项需要调整。连续多项需要调整时，构成调整片区。
            val area = findArea(if(areas.isNotEmpty()) areas.last().f2.next else db.head)
            var (begin, end) = area ?: break

            //开始针对这个片区的多轮调整。
            for(round in 1..1000) {
                //找出中点，根据极值计算中点排序时间，并以此时间为基准，向两侧计算出tuning范围，作为这个片区即将占据的时间范围。
                val distance = begin distance end
                val midOrderTime = (begin.value.second + end.value.second) / 2
                val tuningLower = midOrderTime - floor(distance / 2.0).toInt() * 1000L
                val tuningUpper = midOrderTime + ceil(distance / 2.0).toInt() * 1000L
                //之后，查找是否时间范围是否覆盖了两侧的其他项，或者与之前的area产生了连接。
                val expand = findExpand(areas, begin, end, tuningLower, tuningUpper)
                if(expand.first == null && expand.second == null) {
                    //不再能找到任何扩展覆盖项后，多轮调整结束。经过多轮调整之后，得到一个片区，该片区可以赋值为tuning所包含的时间范围，并且不会与更外侧的项有时间冲突了。
                    areas.add(Tuple4(begin, end, tuningLower, tuningUpper))
                    break
                }else{
                    //找到扩展覆盖项后，下一轮会将扩展项也加入片区，进行下一轮的计算调整。
                    begin = expand.first ?: begin
                    end = expand.second ?: end
                }
            }
        }

        //整个列表跑完一遍之后，获得了所有的可调整片区。将片区中每一项的时间计算出来，并应用其中发生了变化的项。
        val updatedIds = mutableListOf<Int>()
        val changed = areas.flatMap { (begin, end, tuningLower, tuningUpper) ->
            val items = (begin iterTo end).asSequence().toList()
            items.mapIndexedNotNull { index, (id, ot) ->
                val newOt = (tuningUpper - tuningLower) / (items.size - 1) * index + tuningLower
                if(newOt != ot) Pair(id, newOt) else null
            }
        }
        if(changed.isNotEmpty()) {
            data.db.batchUpdate(Illusts) {
                for ((id, ot) in changed) {
                    item {
                        where { it.id eq id }
                        set(it.orderTime, ot)
                    }
                }
            }
            updatedIds.addAll(changed.map { (id, _) -> id })
        }

        //最后，发送事件。
        val eventIllustIds =  if(!eventForAllIllusts) updatedIds - illustIds.map { (id, _) -> id }.toSet() else updatedIds
        bus.emit(eventIllustIds.map { IllustUpdated(it, IllustType.IMAGE, timeSot = true) })

        return changed
    }
}