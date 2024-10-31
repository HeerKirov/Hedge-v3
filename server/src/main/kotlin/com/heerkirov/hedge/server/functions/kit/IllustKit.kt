package com.heerkirov.hedge.server.functions.kit

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.functions.manager.MetaManager
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.enums.TagTopicType
import com.heerkirov.hedge.server.events.IllustUpdated
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.utils.business.checkScore
import com.heerkirov.hedge.server.utils.ktorm.asSequence
import com.heerkirov.hedge.server.utils.letIf
import com.heerkirov.hedge.server.utils.splitWhen
import com.heerkirov.hedge.server.utils.types.Opt
import org.ktorm.dsl.*
import org.ktorm.dsl.where
import org.ktorm.entity.*
import java.time.Instant
import java.time.LocalDate
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
        return if(appendTags.isNotEmpty() || appendTopics.isNotEmpty() || appendAuthors.isNotEmpty()) {
            //检出每种tag的数量。这个数量指已存在的值中notExported的数量
            val existTags = metaManager.getNotExportMetaTags(thisId, IllustTagRelations, Tags)
            val existTopics = metaManager.getNotExportMetaTags(thisId, IllustTopicRelations, Topics)
            val existAuthors = metaManager.getNotExportMetaTags(thisId, IllustAuthorRelations, Authors)

            val newTags = (appendTags + existTags.map { it.id }).distinct()
            val newTopics = (appendTopics + existTopics.map { it.id }).distinct()
            val newAuthors = (appendAuthors + existAuthors.map { it.id }).distinct()

            val validatedTags = if(newTags.isEmpty()) emptyList() else metaManager.validateAndExportTagModel(newTags, ignoreError = ignoreNotExist)
            val validatedTopics = if(newTopics.isEmpty()) emptyList() else metaManager.validateAndExportTopicModel(newTopics, ignoreError = ignoreNotExist)
            val validatedAuthors = if(newAuthors.isEmpty()) emptyList() else metaManager.validateAndExportAuthorModel(newAuthors, ignoreError = ignoreNotExist)

            val tagAnnotations = if(validatedTags.isEmpty()) null else
                metaManager.processMetaTags(thisId, creating = false, analyseStatisticCount = !isCollection,
                    metaTag = Tags,
                    metaRelations = IllustTagRelations,
                    metaAnnotationRelations = TagAnnotationRelations,
                    newTagIds = validatedTags.map { (t, e) -> t.id to e })
            val topicAnnotations = if(validatedTopics.isEmpty()) null else
                metaManager.processMetaTags(thisId, creating = false, analyseStatisticCount = !isCollection,
                    metaTag = Topics,
                    metaRelations = IllustTopicRelations,
                    metaAnnotationRelations = TopicAnnotationRelations,
                    newTagIds = validatedTopics.map { (t, e) -> t.id to e })
            val authorAnnotations = if(validatedAuthors.isEmpty()) null else
                metaManager.processMetaTags(thisId, creating = false, analyseStatisticCount = !isCollection,
                    metaTag = Authors,
                    metaRelations = IllustAuthorRelations,
                    metaAnnotationRelations = AuthorAnnotationRelations,
                    newTagIds = validatedAuthors.map { (t, e) -> t.id to e })

            processAnnotationOfMeta(thisId, tagAnnotations = tagAnnotations, topicAnnotations = topicAnnotations, authorAnnotations = authorAnnotations)

            (Illust.Tagme.EMPTY as Illust.Tagme).letIf(appdata.setting.meta.autoCleanTagme) { r ->
                r.letIf(validatedTags.any { (_, isExported) -> !isExported }) { it + Illust.Tagme.TAG }
                    .letIf(validatedAuthors.any { (_, isExported) -> !isExported }) { it + Illust.Tagme.AUTHOR }
                    .letIf(validatedTopics.any { (t, isExported) -> !isExported && if(appdata.setting.meta.onlyCharacterTopic) t.type == TagTopicType.CHARACTER else true }) { it + Illust.Tagme.TOPIC }
            }
        }else{
            Illust.Tagme.EMPTY
        }
    }

    /**
     * 检验给出的tags/topics/authors的正确性，处理导出，并应用其更改。此外，annotations的更改也会被一并导出处理。
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

        val analyseStatisticCount = !copyFromChildren

        //检出每种tag的数量。这个数量指新设定的值或已存在的值中notExported的数量
        val tagCount = if(newTags.isPresent) newTags.value.size else if(creating) 0 else metaManager.getNotExportedMetaCount(thisId, IllustTagRelations)
        val topicCount = if(newTopics.isPresent) newTopics.value.size else if(creating) 0 else metaManager.getNotExportedMetaCount(thisId, IllustTopicRelations)
        val authorCount = if(newAuthors.isPresent) newAuthors.value.size else if(creating) 0 else metaManager.getNotExportedMetaCount(thisId, IllustAuthorRelations)

        return if(tagCount == 0 && topicCount == 0 && authorCount == 0) {
            //如果发现所有count都是0，意味着这个illust即将被设置为无metaTag。根据业务规则，此时将寻求从parent或children生成它的metaTag。
            //首先清理现在可能还存在的metaTag。用XXX.isPresent作为判断条件，是因为若有新设值为空，那么可能意味着之前有值；而isUndefined时，旧值一定是空，不需要清理
            if(newTags.isPresent) metaManager.deleteMetaTags(thisId, IllustTagRelations, Tags, analyseStatisticCount)
            if(newAuthors.isPresent) metaManager.deleteMetaTags(thisId, IllustAuthorRelations, Authors, analyseStatisticCount)
            if(newTopics.isPresent) metaManager.deleteMetaTags(thisId, IllustTopicRelations, Topics, analyseStatisticCount)
            metaManager.deleteAnnotations(thisId, IllustAnnotationRelations)

            if(copyFromParent != null) {
                //如果发现parent有notExported的metaTag，那么从parent直接拷贝全部metaTag
                if(anyNotExportedMetaExists(copyFromParent)) copyAllMetaFromParent(thisId, copyFromParent)
            }else if (copyFromChildren) {
                //从children拷贝全部metaTag
                copyAllMetaFromChildren(thisId)
            }

            Illust.Tagme.EMPTY
        }else if(newTags.isPresent || newAuthors.isPresent || newTopics.isPresent) {
            //存在任意一项已修改
            if((newAuthors.isPresent || authorCount == 0) //这行表示，要么列表数量是0，要么它是已修改的项，也就满足下面的"未修改的列表数量都是0"
                && (newTopics.isPresent || topicCount == 0)
                && (newTags.isPresent || tagCount == 0)) {
                //若发现未修改列表数量都为0，已修改至少一项不为0: 此时从"从依赖项获得exportedTag"的状态转向"自己持有tag"的状态，清除所有metaTag
                //tips: 在copyFromChildren为false的情况下，认为是image的更改，要求修改统计计数；否则不予修改
                metaManager.deleteMetaTags(thisId, IllustTagRelations, Tags, analyseStatisticCount, true)
                metaManager.deleteMetaTags(thisId, IllustAuthorRelations, Authors, analyseStatisticCount, true)
                metaManager.deleteMetaTags(thisId, IllustTopicRelations, Topics, analyseStatisticCount, true)
                metaManager.deleteAnnotations(thisId, IllustAnnotationRelations)
            }
            val validatedTags = newTags.map { metaManager.validateAndExportTagModel(it, ignoreError = ignoreNotExist) }
            val validatedTopics = newTopics.map { metaManager.validateAndExportTopicModel(it, ignoreError = ignoreNotExist) }
            val validatedAuthors = newAuthors.map { metaManager.validateAndExportAuthorModel(it, ignoreError = ignoreNotExist) }

            val tagAnnotations = validatedTags.map {
                metaManager.processMetaTags(thisId, creating, analyseStatisticCount,
                    metaTag = Tags,
                    metaRelations = IllustTagRelations,
                    metaAnnotationRelations = TagAnnotationRelations,
                    newTagIds = it.map { (t, e) -> t.id to e }
                )
            }.unwrapOrNull()
            val topicAnnotations = validatedTopics.map {
                metaManager.processMetaTags(thisId, creating, analyseStatisticCount,
                    metaTag = Topics,
                    metaRelations = IllustTopicRelations,
                    metaAnnotationRelations = TopicAnnotationRelations,
                    newTagIds = it.map { (t, e) -> t.id to e }
                )
            }.unwrapOrNull()
            val authorAnnotations = validatedAuthors.map {
                metaManager.processMetaTags(thisId, creating, analyseStatisticCount,
                    metaTag = Authors,
                    metaRelations = IllustAuthorRelations,
                    metaAnnotationRelations = AuthorAnnotationRelations,
                    newTagIds = it.map { (t, e) -> t.id to e }
                )
            }.unwrapOrNull()

            processAnnotationOfMeta(thisId, tagAnnotations = tagAnnotations, topicAnnotations = topicAnnotations, authorAnnotations = authorAnnotations)

            (Illust.Tagme.EMPTY as Illust.Tagme).letIf(appdata.setting.meta.autoCleanTagme) { r ->
                r.letIf(validatedTags.isPresentAnd { it.any { (_, isExported) -> !isExported } }) { it + Illust.Tagme.TAG }
                .letIf(validatedAuthors.isPresentAnd { it.any { (_, isExported) -> !isExported } }) { it + Illust.Tagme.AUTHOR }
                .letIf(validatedTopics.isPresentAnd { it.any { (t, isExported) -> !isExported && if(appdata.setting.meta.onlyCharacterTopic) t.type == TagTopicType.CHARACTER else true } }) { it + Illust.Tagme.TOPIC }
            }
        }else{
            Illust.Tagme.EMPTY
        }
    }

    /**
     * 从现有列表中移除指定的tags/topics/authors，然后重新处理导出并应用更改。
     */
    fun removeMeta(thisId: Int, removeTags: List<Int>, removeTopics: List<Int>, removeAuthors: List<Int>, copyFromParent: Int? = null, copyFromChildren: Boolean = false, ignoreNotExist: Boolean = false) {
        if(removeTags.isNotEmpty() || removeTopics.isNotEmpty() || removeAuthors.isNotEmpty()) {
            val existTags = metaManager.getNotExportMetaTags(thisId, IllustTagRelations, Tags).map { it.id }
            val existTopics = metaManager.getNotExportMetaTags(thisId, IllustTopicRelations, Topics).map { it.id }
            val existAuthors = metaManager.getNotExportMetaTags(thisId, IllustAuthorRelations, Authors).map { it.id }

            if(removeTags.any { it in existTags } || removeTopics.any { it in existTopics } || removeAuthors.any { it in existAuthors }) {
                val newTags = existTags - removeTags.toSet()
                val newTopics = existTopics - removeTopics.toSet()
                val newAuthors = existAuthors - removeAuthors.toSet()

                if(newTags.isEmpty() && newTopics.isEmpty() && newAuthors.isEmpty()) {
                    if(existTags.isNotEmpty()) metaManager.deleteMetaTags(thisId, IllustTagRelations, Tags, !copyFromChildren)
                    if(existAuthors.isNotEmpty()) metaManager.deleteMetaTags(thisId, IllustAuthorRelations, Authors, !copyFromChildren)
                    if(existTopics.isNotEmpty()) metaManager.deleteMetaTags(thisId, IllustTopicRelations, Topics, !copyFromChildren)
                    metaManager.deleteAnnotations(thisId, IllustAnnotationRelations)

                    if(copyFromParent != null) {
                        if(anyNotExportedMetaExists(copyFromParent)) copyAllMetaFromParent(thisId, copyFromParent)
                    }else if (copyFromChildren) {
                        copyAllMetaFromChildren(thisId)
                    }
                }else{
                    val tagAnnotations = metaManager.processMetaTags(thisId, creating = false, analyseStatisticCount = !copyFromChildren,
                            metaTag = Tags,
                            metaRelations = IllustTagRelations,
                            metaAnnotationRelations = TagAnnotationRelations,
                            newTagIds = metaManager.validateAndExportTag(newTags, ignoreError = ignoreNotExist))
                    val topicAnnotations = metaManager.processMetaTags(thisId, creating = false, analyseStatisticCount = !copyFromChildren,
                            metaTag = Topics,
                            metaRelations = IllustTopicRelations,
                            metaAnnotationRelations = TopicAnnotationRelations,
                            newTagIds = metaManager.validateAndExportTopic(newTopics, ignoreError = ignoreNotExist))
                    val authorAnnotations = metaManager.processMetaTags(thisId, creating = false, analyseStatisticCount = !copyFromChildren,
                            metaTag = Authors,
                            metaRelations = IllustAuthorRelations,
                            metaAnnotationRelations = AuthorAnnotationRelations,
                            newTagIds = metaManager.validateAndExportAuthor(newAuthors, ignoreError = ignoreNotExist))

                    processAnnotationOfMeta(thisId, tagAnnotations = tagAnnotations, topicAnnotations = topicAnnotations, authorAnnotations = authorAnnotations)
                }
            }
        }
    }

    /**
     * 在没有改变主体的meta tag的情况下，重新导出meta tag。用于当关联客体发生变更时更新。
     * @param forceUpdate 默认情况下，如果主体有自己的meta tags，则不会更新。开启此选项，在这种情况下强制更新。
     */
    fun refreshAllMeta(thisId: Int, copyFromParent: Int? = null, copyFromChildren: Boolean = false, forceUpdate: Boolean = false) {
        val analyseStatisticCount = !copyFromChildren

        val tags = metaManager.getNotExportMetaTags(thisId, IllustTagRelations, Tags)
        val topics = metaManager.getNotExportMetaTags(thisId, IllustTopicRelations, Topics)
        val authors = metaManager.getNotExportMetaTags(thisId, IllustAuthorRelations, Authors)

        val tagCount = tags.size
        val topicCount = topics.size
        val authorCount = authors.size

        if(tagCount == 0 && topicCount == 0 && authorCount == 0) {
            //若发现当前列表数全部为0，那么从依赖项拷贝tag。在拷贝之前，清空全列表，防止duplicated key。
            deleteAllMeta(thisId, analyseStatisticCount = analyseStatisticCount, tagCount = tagCount, topicCount = topicCount, authorCount = authorCount)
            if (copyFromChildren) {
                copyAllMetaFromChildren(thisId)
            }else if(copyFromParent != null && anyNotExportedMetaExists(copyFromParent)) {
                copyAllMetaFromParent(thisId, copyFromParent)
            }
        }else if(forceUpdate) {
            //至少一个列表不为0时，清空所有为0的列表的全部tag
            //在copyFromChildren为false的情况下，认为是image的更改，要求修改统计计数；否则不予修改
            deleteAllMeta(thisId, remainNotExported = true, analyseStatisticCount = analyseStatisticCount, tagCount = tagCount, topicCount = topicCount, authorCount = authorCount)

            val tagAnnotations = metaManager.processMetaTags(thisId, false, analyseStatisticCount,
                metaTag = Tags,
                metaRelations = IllustTagRelations,
                metaAnnotationRelations = TagAnnotationRelations,
                newTagIds = metaManager.exportTag(tags).first) //直接忽略任何冲突组错误
            val topicAnnotations = metaManager.processMetaTags(thisId, false, analyseStatisticCount,
                metaTag = Topics,
                metaRelations = IllustTopicRelations,
                metaAnnotationRelations = TopicAnnotationRelations,
                newTagIds = metaManager.exportTopic(topics))
            val authorAnnotations = metaManager.processMetaTags(thisId, false, analyseStatisticCount,
                metaTag = Authors,
                metaRelations = IllustAuthorRelations,
                metaAnnotationRelations = AuthorAnnotationRelations,
                newTagIds = metaManager.exportAuthor(authors))

            processAnnotationOfMeta(thisId, tagAnnotations = tagAnnotations, topicAnnotations = topicAnnotations, authorAnnotations = authorAnnotations)
        }
    }

    /**
     * 使用目标的所有relations，拷贝一份赋给当前项，统一设定为exported。
     */
    private fun copyAllMetaFromParent(thisId: Int, fromId: Int) {
        val now = Instant.now()
        fun <R : EntityMetaRelationTable<*>, T : MetaTagTable<*>> copyOneMeta(tagRelations: R, metaTag: T) {
            //在调用此方法之前，已有anyNotExportedMetaExists调用，保证parent一定是有自己的meta的，不会产生错误的传递。
            val ids = data.db.from(tagRelations).select(tagRelations.metaId()).where { tagRelations.entityId() eq fromId }.map { it[tagRelations.metaId()]!! }
            if(ids.isNotEmpty()) data.db.batchInsert(tagRelations) {
                for (tagId in ids) {
                    item {
                        set(tagRelations.entityId(), thisId)
                        set(tagRelations.metaId(), tagId)
                        set(tagRelations.exported(), true)
                    }
                }
            }
            //修改统计计数
            data.db.update(metaTag) {
                where { it.id inList ids }
                set(it.cachedCount, it.cachedCount plus 1)
                set(it.updateTime, now)
            }
        }
        fun copyAnnotation() {
            val items = data.db.from(IllustAnnotationRelations)
                .select(IllustAnnotationRelations.annotationId)
                .where { IllustAnnotationRelations.illustId eq fromId }
                .map { it[IllustAnnotationRelations.annotationId]!! }
            if(items.isNotEmpty()) data.db.batchInsert(IllustAnnotationRelations) {
                for (id in items) {
                    item {
                        set(IllustAnnotationRelations.illustId, thisId)
                        set(IllustAnnotationRelations.annotationId, id)
                    }
                }
            }
        }

        copyOneMeta(IllustTagRelations, Tags)
        copyOneMeta(IllustAuthorRelations, Authors)
        copyOneMeta(IllustTopicRelations, Topics)
        copyAnnotation()
    }

    /**
     * 从当前项的所有子项拷贝meta，统一设定为exported。
     */
    private fun copyAllMetaFromChildren(thisId: Int) {
        val sumAvailableChildren = mutableSetOf<Int>()
        fun <R> copyOneMeta(tagRelations: R) where R: EntityMetaRelationTable<*> {
            //读取这种tag类型下，每一个child拥有的not exported的tag的数量，筛选出至少有一个not exported的children。
            //每种metaTag分别判断即可，不需要联合判断某个child是否是“全部notExported”的，因为只要有一个，就肯定是；一个也没有，就肯定不是
            val availableChildren = data.db.from(Illusts)
                .innerJoin(tagRelations, tagRelations.entityId() eq Illusts.id and tagRelations.exported().not())
                .select(Illusts.id, count(tagRelations.metaId()).aliased("count"))
                .where { Illusts.parentId eq thisId }
                .groupBy(Illusts.id)
                .having { count(tagRelations.metaId()).aliased("count") greater 0 }
                .map { it[Illusts.id]!! }
            val metaIds = data.db.from(tagRelations)
                .select(tagRelations.metaId())
                .where { tagRelations.entityId() inList availableChildren }
                .asSequence()
                .map { it[tagRelations.metaId()]!! }
                .toSet()
            if(metaIds.isNotEmpty()) data.db.batchInsert(tagRelations) {
                for (tagId in metaIds) {
                    item {
                        set(tagRelations.entityId(), thisId)
                        set(tagRelations.metaId(), tagId)
                        set(tagRelations.exported(), true)
                    }
                }
            }

            sumAvailableChildren.addAll(availableChildren)
        }
        fun copyAnnotation() {
            //拷贝注解时，也只从之前那些确定是notExported的children中拷贝
            val items = data.db.from(Illusts)
                .innerJoin(IllustAnnotationRelations, IllustAnnotationRelations.illustId eq Illusts.id)
                .select(IllustAnnotationRelations.annotationId)
                .where { Illusts.id inList sumAvailableChildren }
                .asSequence()
                .map { it[IllustAnnotationRelations.annotationId]!! }
                .toSet()
            if(items.isNotEmpty()) data.db.batchInsert(IllustAnnotationRelations) {
                for (id in items) {
                    item {
                        set(IllustAnnotationRelations.illustId, thisId)
                        set(IllustAnnotationRelations.annotationId, id)
                    }
                }
            }
        }

        copyOneMeta(IllustTagRelations)
        copyOneMeta(IllustAuthorRelations)
        copyOneMeta(IllustTopicRelations)
        copyAnnotation()
    }

    /**
     * 删除所有的meta。
     */
    private fun deleteAllMeta(thisId: Int, remainNotExported: Boolean = false, analyseStatisticCount: Boolean? = null,
                              tagCount: Int? = null, authorCount: Int? = null, topicCount: Int? = null) {
        if(tagCount == 0) metaManager.deleteMetaTags(thisId, IllustTagRelations, Tags, analyseStatisticCount ?: false, remainNotExported)
        if(authorCount == 0) metaManager.deleteMetaTags(thisId, IllustAuthorRelations, Authors, analyseStatisticCount ?: false, remainNotExported)
        if(topicCount == 0) metaManager.deleteMetaTags(thisId, IllustTopicRelations, Topics, analyseStatisticCount ?: false, remainNotExported)
        metaManager.deleteAnnotations(thisId, IllustAnnotationRelations)
    }

    /**
     * 当关联的meta变化时，会引发间接关联的annotation的变化，处理这种变化。
     */
    private fun processAnnotationOfMeta(thisId: Int, tagAnnotations: Set<Int>?, authorAnnotations: Set<Int>?, topicAnnotations: Set<Int>?) {
        if(tagAnnotations != null || topicAnnotations != null || authorAnnotations != null) {
            val oldAnnotations = data.db.from(IllustAnnotationRelations).select()
                .where { IllustAnnotationRelations.illustId eq thisId }
                .asSequence()
                .map { it[IllustAnnotationRelations.annotationId]!! }
                .toSet()

            val newAnnotations = mutableSetOf<Int>()
            tagAnnotations?.let(newAnnotations::addAll)
            topicAnnotations?.let(newAnnotations::addAll)
            authorAnnotations?.let(newAnnotations::addAll)

            val adds = newAnnotations - oldAnnotations
            val deletes = oldAnnotations - newAnnotations

            if(adds.isNotEmpty()) data.db.batchInsert(IllustAnnotationRelations) {
                for (addId in adds) {
                    item {
                        set(it.illustId, thisId)
                        set(it.annotationId, addId)
                    }
                }
            }
            if(deletes.isNotEmpty()) data.db.delete(IllustAnnotationRelations) { (it.illustId eq thisId) and (it.annotationId inList deletes) }
        }
    }

    /**
     * 当目标对象存在任意一个not exported的meta tag时，返回true。
     */
    private fun anyNotExportedMetaExists(illustId: Int): Boolean {
        return metaManager.getNotExportedMetaCount(illustId, IllustTagRelations) > 0
                || metaManager.getNotExportedMetaCount(illustId, IllustAuthorRelations) > 0
                || metaManager.getNotExportedMetaCount(illustId, IllustTopicRelations) > 0
    }

    /**
     * 从一组images中，获得firstCover导出属性和score导出属性。
     * 如果开启了相关选项以及指定了specifyPartitionTime，则partitionTime和orderTime将从指定分区内产生。
     * @throws ResourceNotExist ("specifyPartitionTime", LocalDate) 在指定的时间分区下没有存在的图像
     * @return (fileId, score, favorite, partitionTime, orderTime)
     */
    fun getExportedPropsFromList(images: List<Illust>, specifyPartitionTime: LocalDate?): Tuple5<Int, Int?, Boolean, LocalDate, Long> {
        val fileId = images.minBy { it.orderTime }.fileId
        val score = images.asSequence().mapNotNull { it.score }.average().run { if(isNaN()) null else this }?.roundToInt()
        val favorite = images.any { it.favorite }
        val partitionTime: LocalDate
        val orderTime: Long
        if(appdata.setting.meta.centralizeCollection && specifyPartitionTime != null) {
            partitionTime = specifyPartitionTime
            orderTime = images.filter { it.partitionTime == specifyPartitionTime }.minOfOrNull { it.orderTime } ?: throw be(ResourceNotExist("specifyPartitionTime", specifyPartitionTime))
        }else{
            partitionTime = images.asSequence().map { it.partitionTime }.groupBy { it }.maxBy { it.value.size }.key
            orderTime = images.filter { it.partitionTime == partitionTime }.minOf { it.orderTime }
        }

        return Tuple5(fileId, score, favorite, partitionTime, orderTime)
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
     * @param eventForAllIllusts 为所有的项发送调整事件，而不只是项列表之外的项。
     */
    fun tuningOrderTime(illustIds: List<Pair<Int, Long>>, eventForAllIllusts: Boolean = false) {
        fun toGapFlag(illusts: List<Pair<Int, Long>>): ByteArray {
            val gapFlag = ByteArray(illusts.size - 1)
            for(i in 0 until illusts.size - 1) {
                if(illusts[i + 1].second - illusts[i].second < 1000L) gapFlag[i] = 2
                else if(illusts[i + 1].second - illusts[i].second == 1000L) gapFlag[i] = 1
            }
            return gapFlag
        }

        fun makeAreaFlag(gapFlag: ByteArray): ByteArray {
            var i = 0
            while(i < gapFlag.size) {
                if(gapFlag[i] == 2.toByte()) {
                    if(i > 0 && gapFlag[i - 1] == 1.toByte()) {
                        for(j in (i - 1) downTo 0) {
                            if(gapFlag[j] == 1.toByte()) {
                                gapFlag[j] = 2
                            }else{
                                break
                            }
                        }
                    }
                    if(i < gapFlag.size - 1 && gapFlag[i + 1] == 1.toByte()) {
                        for(j in (i + 1) until gapFlag.size) {
                            if(gapFlag[j] == 1.toByte()) {
                                gapFlag[j] = 2
                            }else{
                                i = j - 1
                                break
                            }
                        }
                    }
                }
                i += 1
            }
            return gapFlag
        }

        fun toAreas(gapFlag: ByteArray): List<Pair<Int, Int>> {
            val areas = mutableListOf<Pair<Int, Int>>()
            var areaCurrentIndex: Int? = null
            var i = 0
            while(i < gapFlag.size) {
                if(gapFlag[i] == 2.toByte() && areaCurrentIndex == null) {
                    areaCurrentIndex = i
                }else if(gapFlag[i] != 2.toByte() && areaCurrentIndex != null) {
                    areas.add(Pair(areaCurrentIndex, i + 1))
                    areaCurrentIndex = null
                }
                i += 1
            }
            if(areaCurrentIndex != null) areas.add(Pair(areaCurrentIndex, gapFlag.size + 1))
            return areas
        }

        //这里首先需要给出的一组illusts是较为临近的，不会间隔太远。如果间隔太远了(相邻两项间隔超过1小时)，会将它划分成几组分别处理。
        val groups = illustIds.sortedBy { it.second }.splitWhen { a, b -> b.second - a.second >= 1000 * 60 * 60  }
        val updatedIds = mutableSetOf<Int>()
        for (group in groups) {
            //对于每一个小组，获得两侧端点，查询补全端点间的所有项，还包括端点两侧超出一定秒数内的项。
            val items = data.db.from(Illusts)
                .select(Illusts.id, Illusts.orderTime)
                .where { (Illusts.type notEq IllustModelType.COLLECTION) and (Illusts.orderTime greaterEq group.first().second - 1000 * 10) and (Illusts.orderTime lessEq group.last().second + 1000 * 10) }
                .orderBy(Illusts.orderTime.asc(), Illusts.id.asc())
                .map { Pair(it[Illusts.id]!!, it[Illusts.orderTime]!!) }
                .toMutableList()

            val betweenIllustIds = items.map { it.first }.toSet()
            val notInBetweenIllusts = group.filter { it.first !in betweenIllustIds }
            if(notInBetweenIllusts.isNotEmpty()) {
                items.addAll(notInBetweenIllusts)
                items.sortWith { a, b -> if(a.second != b.second) a.second.compareTo(b.second) else a.first.compareTo(b.first) }
            }
            val originMap = items.toMap().toMutableMap()

            for (round in 1..5) {
                //在这些所有项中，判断是否有任意项之间的间隔小于1秒。如果小于1秒，就要调整时间。这种项称之为初始调整项。从两个初始调整项开始，向两侧搜索间隔小于等于1秒的所有项，构成一个调整片区。
                //这里将小于1秒间隔标记为2，等于1秒间隔标记为1。之后将所有与2紧邻的1都调整为2，这样就可以获得所有应当调整的片区。
                val areas = toGapFlag(items).let(::makeAreaFlag).let(::toAreas)
                if(areas.isEmpty()) {
                    break
                }

                //对于一个调整片区，找到它的中点时间，从中点开始向两侧疏散片区里的项。
                val minTimestamp = items.first().second
                val maxTimestamp = items.last().second
                for ((begin, end) in areas) {
                    val mid = (begin + end) / 2
                    for(i in begin until mid) {
                        items[i] = Pair(items[i].first, items[mid].second - (mid - i) * 1000L)
                    }
                    for(i in mid + 1 until end) {
                        items[i] = Pair(items[i].first, items[mid].second + (i - mid) * 1000L)
                    }
                }

                //在调整中，如果最两侧的项要被调整，那么就需要再额外查询更外面的几项。这种扩充理论上不会太多，但仍需要设置一个扩充上限，扩充的项数不应超过原项数的2倍。
                if(items.size < group.size * 2) {
                    val itemIds by lazy { items.map { it.first }.toSet() }
                    if(areas.any { it.first == 0 } && items.first().second < minTimestamp) {
                        data.db.from(Illusts)
                            .select(Illusts.id, Illusts.orderTime)
                            .where { (Illusts.type notEq IllustModelType.COLLECTION) and (Illusts.orderTime less minTimestamp) and (Illusts.orderTime greaterEq items.first().second - 1000 * 10) }
                            .orderBy(Illusts.orderTime.asc(), Illusts.id.asc())
                            .limit(100)
                            .map { Pair(it[Illusts.id]!!, it[Illusts.orderTime]!!) }
                            .filter { it.first !in itemIds }
                            .also { items.addAll(it) }
                            .also { originMap.putAll(it.toMap()) }
                    }
                    if(areas.any { it.second == items.size } && items.last().second > maxTimestamp) {
                        data.db.from(Illusts)
                            .select(Illusts.id, Illusts.orderTime)
                            .where { (Illusts.type notEq IllustModelType.COLLECTION) and (Illusts.orderTime greater maxTimestamp) and (Illusts.orderTime lessEq items.last().second + 1000 * 10) }
                            .orderBy(Illusts.orderTime.asc(), Illusts.id.asc())
                            .limit(100)
                            .map { Pair(it[Illusts.id]!!, it[Illusts.orderTime]!!) }
                            .filter { it.first !in itemIds }
                            .also { items.addAll(it) }
                            .also { originMap.putAll(it.toMap()) }
                    }
                }

                items.sortWith { a, b -> if(a.second != b.second) a.second.compareTo(b.second) else a.first.compareTo(b.first) }

                //做完一轮调整之后，开始第二轮的搜索，因为上一轮的调整可能会使原本不相邻的片区相邻相交。调整进行多轮，直到不再存在片区，或者调整轮数过多，主动终止防止死循环。
            }
            //应用所有调整。
            val changed = items.filter { (id, ot) -> originMap[id] != ot }
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
        }
        //最后，发送事件。
        val eventIllustIds =  if(!eventForAllIllusts) updatedIds - illustIds.map { (id, _) -> id }.toSet() else updatedIds
        bus.emit(eventIllustIds.map { IllustUpdated(it, IllustType.IMAGE, timeSot = true) })
    }
}