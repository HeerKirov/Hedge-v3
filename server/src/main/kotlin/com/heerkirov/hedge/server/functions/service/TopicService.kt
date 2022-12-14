package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.backend.exporter.BookMetadataExporterTask
import com.heerkirov.hedge.server.components.backend.exporter.BackendExporter
import com.heerkirov.hedge.server.components.backend.exporter.IllustMetadataExporterTask
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.functions.kit.TopicKit
import com.heerkirov.hedge.server.functions.manager.SourceMappingManager
import com.heerkirov.hedge.server.functions.manager.query.QueryManager
import com.heerkirov.hedge.server.dao.BookTopicRelations
import com.heerkirov.hedge.server.dao.IllustTopicRelations
import com.heerkirov.hedge.server.dao.TopicAnnotationRelations
import com.heerkirov.hedge.server.dao.Topics
import com.heerkirov.hedge.server.dto.filter.TopicFilter
import com.heerkirov.hedge.server.dto.form.TopicCreateForm
import com.heerkirov.hedge.server.dto.form.TopicUpdateForm
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.MetaType
import com.heerkirov.hedge.server.events.MetaTagCreated
import com.heerkirov.hedge.server.events.MetaTagDeleted
import com.heerkirov.hedge.server.events.MetaTagUpdated
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.utils.DateTime
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.runIf
import com.heerkirov.hedge.server.utils.tuples.Tuple2
import com.heerkirov.hedge.server.utils.tuples.Tuple3
import com.heerkirov.hedge.server.utils.types.*
import org.ktorm.dsl.*
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf

class TopicService(private val data: DataRepository,
                   private val bus: EventBus,
                   private val kit: TopicKit,
                   private val queryManager: QueryManager,
                   private val sourceMappingManager: SourceMappingManager,
                   private val backendExporter: BackendExporter) {
    private val orderTranslator = OrderTranslator {
        "id" to Topics.id
        "name" to Topics.name
        "score" to Topics.score nulls last
        "count" to Topics.cachedCount nulls last
        "createTime" to Topics.createTime
        "updateTime" to Topics.updateTime
    }

    fun list(filter: TopicFilter): ListResult<TopicRes> {
        val schema = if(filter.query.isNullOrBlank()) null else {
            queryManager.querySchema(filter.query, QueryManager.Dialect.TOPIC).executePlan ?: return ListResult(0, emptyList())
        }
        val rootAliased = Topics.aliased("tr")
        return data.db.from(Topics)
            .let {
                if(filter.annotationIds.isNullOrEmpty()) it else {
                    var joinCount = 0
                    filter.annotationIds.fold(it) { acc, id ->
                        val j = TopicAnnotationRelations.aliased("AR_${++joinCount}")
                        acc.innerJoin(j, (j.topicId eq Topics.id) and (j.annotationId eq id))
                    }
                }
            }
            .leftJoin(rootAliased, rootAliased.id eq Topics.parentRootId)
            .let { schema?.joinConditions?.fold(it) { acc, join -> if(join.left) acc.leftJoin(join.table, join.condition) else acc.innerJoin(join.table, join.condition) } ?: it }
            .select(*Topics.columns.toTypedArray(), rootAliased.id, rootAliased.name, rootAliased.type)
            .whereWithConditions {
                if(filter.favorite != null) { it += Topics.favorite eq filter.favorite }
                if(filter.type != null) { it += Topics.type eq filter.type }
                if(filter.parentId != null) { it += Topics.parentId eq filter.parentId }
                if(schema != null && schema.whereConditions.isNotEmpty()) {
                    it.addAll(schema.whereConditions)
                }
            }
            .runIf(schema?.distinct == true) { groupBy(Topics.id) }
            .orderBy(orderTranslator, filter.order, schema?.orderConditions, default = ascendingOrderItem("id"))
            .limit(filter.offset, filter.limit)
            .toListResult {
                val root = it[rootAliased.id]?.let { rootId -> Tuple3(rootId, it[rootAliased.name]!!, it[rootAliased.type]!!) }
                newTopicRes(Topics.createEntity(it), root, data.setting.meta.topicColors)
            }
    }

    /**
     * @throws AlreadyExists ("Topic", "name", string) ????????????topic?????????
     * @throws RecursiveParentError parentId????????????
     * @throws IllegalConstraintError ("type", "parent", TopicType[]) ?????????type???parent???type??????????????????parent???type
     * @throws ResourceNotExist ("parentId", number) ?????????parent??????????????????parentId
     * @throws ResourceNotExist ("annotations", number[]) ???annotation???????????????????????????????????????????????????annotation id??????
     * @throws ResourceNotSuitable ("annotations", number[]) ??????target??????????????????????????????????????????????????????????????????????????????annotation id??????
     * @throws ResourceNotExist ("site", string) ??????source mapping tags????????????site?????????
     */
    fun create(form: TopicCreateForm): Int {
        data.db.transaction {
            val (parentId, parentRootId) = if(form.parentId != null) kit.validateParent(form.parentId, form.type) else Tuple2(null, null)

            val name = kit.validateName(form.name, form.type, parentRootId)
            val otherNames = kit.validateOtherNames(form.otherNames)
            val keywords = kit.validateKeywords(form.keywords)

            val annotations = kit.validateAnnotations(form.annotations, form.type)

            val createTime = DateTime.now()

            val id = data.db.insertAndGenerateKey(Topics) {
                set(it.name, name)
                set(it.otherNames, otherNames)
                set(it.parentId, parentId)
                set(it.parentRootId, parentRootId)
                set(it.keywords, keywords)
                set(it.description, form.description)
                set(it.type, form.type)
                set(it.favorite, form.favorite)
                set(it.score, form.score)
                set(it.cachedCount, 0)
                set(it.cachedAnnotations, annotations)
                set(it.createTime, createTime)
                set(it.updateTime, createTime)
            } as Int

            form.mappingSourceTags?.also { sourceMappingManager.update(MetaType.TOPIC, id, it) }

            kit.processAnnotations(id, annotations.asSequence().map { it.id }.toSet(), creating = true)

            bus.emit(MetaTagCreated(id, MetaType.TOPIC))

            return id
        }
    }

    /**
     * @throws NotFound ?????????????????????
     */
    fun get(id: Int): TopicDetailRes {
        val topic = data.db.sequenceOf(Topics).firstOrNull { it.id eq id } ?: throw be(NotFound())
        val parents = kit.getAllParents(topic)
        val children = kit.getAllChildren(topic, data.setting.meta.topicColors)
        val mappingSourceTags = sourceMappingManager.query(MetaType.TOPIC, id)
        return newTopicDetailRes(topic, parents, children, data.setting.meta.topicColors, mappingSourceTags)
    }

    /**
     * @throws NotFound ?????????????????????
     * @throws AlreadyExists ("Topic", "name", string) ????????????topic?????????
     * @throws RecursiveParentError parentId????????????
     * @throws IllegalConstraintError ("type", "children" | "parent", TopicType[]) ?????????type???parent|children???type??????????????????parent|children???type
     * @throws ResourceNotExist ("parentId", number) ?????????parent??????????????????parentId
     * @throws ResourceNotExist ("annotations", number[]) ???annotation???????????????????????????????????????????????????annotation id??????
     * @throws ResourceNotSuitable ("annotations", number[]) ??????target??????????????????????????????????????????????????????????????????????????????annotation id??????
     * @throws ResourceNotExist ("site", string) ??????source mapping tags????????????site?????????
     */
    fun update(id: Int, form: TopicUpdateForm) {
        data.db.transaction {
            val record = data.db.sequenceOf(Topics).firstOrNull { it.id eq id } ?: throw be(NotFound())

            val newParentId = if(form.parentId.isPresent || form.type.isPresent) {
                val parentId = form.parentId.unwrapOr { record.parentId }
                if(parentId != null) optOf(kit.validateParent(parentId, form.type.unwrapOr { record.type }, id))
                else optOf(Tuple2(null, null))
            }else undefined()

            val newName = if(form.name.isPresent || newParentId.isPresent || form.type.isPresent) {
                //name/parentId/type??????????????????????????????????????????
                val name = form.name.unwrapOr { record.name }
                val parentRootId = if(newParentId.isPresent) newParentId.unwrap { f2 } else record.parentRootId
                val type = form.type.unwrapOr { record.type }
                val validatedName = kit.validateName(name, type, parentRootId, id)
                //????????????????????????name?????????????????????????????????opt????????????
                if(form.name.isPresent) optOf(validatedName) else undefined()
            }else undefined()
            val newOtherNames = form.otherNames.letOpt { kit.validateOtherNames(it) }
            val newKeywords = form.keywords.letOpt { kit.validateKeywords(it) }

            val newAnnotations = form.annotations.letOpt { kit.validateAnnotations(it, form.type.unwrapOr { record.type }) }

            form.type.letOpt { type -> kit.checkChildrenType(id, type) }

            form.mappingSourceTags.letOpt { sourceMappingManager.update(MetaType.TOPIC, id, it ?: emptyList()) }

            if(anyOpt(newName, newOtherNames, newKeywords, newParentId, form.type, form.description, form.favorite, form.score, newAnnotations)) {
                data.db.update(Topics) {
                    where { it.id eq id }
                    newName.applyOpt { set(it.name, this) }
                    newOtherNames.applyOpt { set(it.otherNames, this) }
                    newParentId.applyOpt {
                        set(it.parentId, this.f1)
                        set(it.parentRootId, this.f2)
                    }
                    newKeywords.applyOpt { set(it.keywords, this) }
                    form.type.applyOpt { set(it.type, this) }
                    form.description.applyOpt { set(it.description, this) }
                    form.favorite.applyOpt { set(it.favorite, this) }
                    form.score.applyOpt { set(it.score, this) }
                    newAnnotations.applyOpt { set(it.cachedAnnotations, this) }
                }
            }

            newAnnotations.letOpt { annotations -> kit.processAnnotations(id, annotations.asSequence().map { it.id }.toSet()) }

            if((newParentId.isPresent && newParentId.value.f1 != record.parentId) || (form.type.isPresent && form.type.value != record.type)) {
                //???parent/type????????????????????????????????????children???parentRootId
                kit.exportChildren(id, form.type.unwrapOr { record.type }, form.parentId.unwrapOr { record.parentId })
            }

            if(newAnnotations.isPresent || (newParentId.isPresent && newParentId.value.f1 != record.parentId)) {
                //???????????????????????????????????????illust/book?????????
                data.db.from(IllustTopicRelations)
                    .select(IllustTopicRelations.illustId)
                    .where { IllustTopicRelations.topicId eq id }
                    .map { IllustMetadataExporterTask(it[IllustTopicRelations.illustId]!!, exportMetaTag = true, exportDescription = false, exportFirstCover = false, exportScore = false) }
                    .let { backendExporter.add(it) }
                data.db.from(BookTopicRelations)
                    .select(BookTopicRelations.bookId)
                    .where { BookTopicRelations.topicId eq id }
                    .map { BookMetadataExporterTask(it[BookTopicRelations.bookId]!!, exportMetaTag = true) }
                    .let { backendExporter.add(it) }
            }

            val generalUpdated = anyOpt(newName, newOtherNames, newKeywords, form.type, form.description, form.favorite, form.score)
            val annotationUpdated = newAnnotations.isPresent
            val ordinalUpdated = newParentId.isPresent && newParentId.value.f1 != record.parentId
            val sourceTagMappingUpdated = form.mappingSourceTags.isPresent
            if(generalUpdated || annotationUpdated || ordinalUpdated || sourceTagMappingUpdated) {
                bus.emit(MetaTagUpdated(id, MetaType.TOPIC, generalUpdated, annotationUpdated, ordinalUpdated, sourceTagMappingUpdated))
            }
        }
    }

    /**
     * @throws NotFound ?????????????????????
     */
    fun delete(id: Int) {
        data.db.transaction {
            data.db.delete(Topics) { it.id eq id }.let {
                if(it <= 0) throw be(NotFound())
            }
            data.db.delete(IllustTopicRelations) { it.topicId eq id }
            data.db.delete(BookTopicRelations) { it.topicId eq id }
            data.db.delete(TopicAnnotationRelations) { it.topicId eq id }
            data.db.update(Topics) {
                //??????topic???????????????tag???????????????????????????????????????????????????parent??????null???
                where { it.parentId eq id }
                set(it.parentId, null)
            }

            bus.emit(MetaTagDeleted(id, MetaType.TOPIC))
        }
    }
}