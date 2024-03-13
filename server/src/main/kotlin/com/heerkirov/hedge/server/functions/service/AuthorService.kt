package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.AuthorAnnotationRelations
import com.heerkirov.hedge.server.dao.Authors
import com.heerkirov.hedge.server.dao.BookAuthorRelations
import com.heerkirov.hedge.server.dao.IllustAuthorRelations
import com.heerkirov.hedge.server.dto.filter.AuthorFilter
import com.heerkirov.hedge.server.dto.form.AuthorBulkForm
import com.heerkirov.hedge.server.dto.form.AuthorCreateForm
import com.heerkirov.hedge.server.dto.form.AuthorUpdateForm
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.MetaType
import com.heerkirov.hedge.server.enums.TagAuthorType
import com.heerkirov.hedge.server.events.MetaTagCreated
import com.heerkirov.hedge.server.events.MetaTagDeleted
import com.heerkirov.hedge.server.events.MetaTagUpdated
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.kit.AuthorKit
import com.heerkirov.hedge.server.functions.manager.SourceMappingManager
import com.heerkirov.hedge.server.functions.manager.query.QueryManager
import com.heerkirov.hedge.server.model.Author
import com.heerkirov.hedge.server.utils.business.collectBulkResult
import com.heerkirov.hedge.server.utils.business.toListResult
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.first
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.runIf
import com.heerkirov.hedge.server.utils.types.*
import org.ktorm.dsl.*
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import java.time.Instant

class AuthorService(private val appdata: AppDataManager,
                    private val data: DataRepository,
                    private val bus: EventBus,
                    private val kit: AuthorKit,
                    private val queryManager: QueryManager,
                    private val sourceMappingManager: SourceMappingManager) {
    private val orderTranslator = OrderTranslator {
        "id" to Authors.id
        "name" to Authors.name
        "score" to Authors.score nulls last
        "count" to Authors.cachedCount nulls last
        "createTime" to Authors.createTime
        "updateTime" to Authors.updateTime
    }

    fun list(filter: AuthorFilter): ListResult<AuthorRes> {
        val schema = if(filter.query.isNullOrBlank()) null else {
            queryManager.querySchema(filter.query, QueryManager.Dialect.AUTHOR).executePlan ?: return ListResult(0, emptyList())
        }
        val authorColors = appdata.setting.meta.authorColors

        return data.db.from(Authors)
            .let {
                if(filter.annotationIds.isNullOrEmpty()) it else {
                    var joinCount = 0
                    filter.annotationIds.fold(it) { acc, id ->
                        val j = AuthorAnnotationRelations.aliased("AR_${++joinCount}")
                        acc.innerJoin(j, (j.authorId eq Authors.id) and (j.annotationId eq id))
                    }
                }
            }
            .let { schema?.joinConditions?.fold(it) { acc, join -> if(join.left) acc.leftJoin(join.table, join.condition) else acc.innerJoin(join.table, join.condition) } ?: it }
            .select()
            .whereWithConditions {
                if(filter.favorite != null) { it += Authors.favorite eq filter.favorite }
                if(filter.type != null) { it += Authors.type eq filter.type }
                if(schema != null && schema.whereConditions.isNotEmpty()) {
                    it.addAll(schema.whereConditions)
                }
            }
            .runIf(schema?.distinct == true) { groupBy(Authors.id) }
            .orderBy(orderTranslator, filter.order, schema?.orderConditions, default = ascendingOrderItem("id"))
            .limit(filter.offset, filter.limit)
            .toListResult { newAuthorRes(Authors.createEntity(it), authorColors) }
    }

    /**
     * @throws AlreadyExists ("Author", "name", string) 此名称的author已存在
     * @throws ResourceNotExist ("annotations", number[]) 有annotation不存在时，抛出此异常。给出不存在的annotation id列表
     * @throws ResourceNotSuitable ("annotations", number[]) 指定target类型且有元素不满足此类型时，抛出此异常。给出不适用的annotation id列表
     * @throws ResourceNotExist ("site", string) 更新source mapping tags时给出的site不存在
     * @throws ResourceNotExist ("sourceTagType", string[]) 更新source mapping tags时列出的tagType不存在
     */
    fun create(form: AuthorCreateForm): Int {
        data.db.transaction {
            val name = kit.validateName(form.name)
            val otherNames = kit.validateOtherNames(form.otherNames)
            val keywords = kit.validateKeywords(form.keywords)

            val annotations = kit.validateAnnotations(form.annotations, form.type)
            val createTime = Instant.now()

            val id = data.db.insertAndGenerateKey(Authors) {
                set(it.name, name)
                set(it.otherNames, otherNames)
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

            val verifyId = data.db.from(Authors).select(max(Authors.id).aliased("id")).first().getInt("id")
            if(verifyId != id) {
                throw RuntimeException("Author insert failed. generatedKey is $id but queried verify id is $verifyId.")
            }

            form.mappingSourceTags?.also { sourceMappingManager.update(MetaType.AUTHOR, id, it) }

            kit.processAnnotations(id, annotations.asSequence().map { it.id }.toSet(), creating = true)

            bus.emit(MetaTagCreated(id, MetaType.AUTHOR))

            return id
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun get(id: Int): AuthorDetailRes {
        return data.db.sequenceOf(Authors).firstOrNull { it.id eq id }
            ?.let {
                val mappingSourceTags = sourceMappingManager.query(MetaType.AUTHOR, id)
                newAuthorDetailRes(it, appdata.setting.meta.authorColors, mappingSourceTags)
            }
            ?: throw be(NotFound())
    }

    /**
     * @throws NotFound 请求对象不存在
     * @throws AlreadyExists ("Author", "name", string) 此名称的author已存在
     * @throws ResourceNotExist ("annotations", number[]) 有annotation不存在时，抛出此异常。给出不存在的annotation id列表
     * @throws ResourceNotSuitable ("annotations", number[]) 指定target类型且有元素不满足此类型时，抛出此异常。给出不适用的annotation id列表
     * @throws ResourceNotExist ("site", string) 更新source mapping tags时给出的site不存在
     * @throws ResourceNotExist ("sourceTagType", string[]) 更新source mapping tags时列出的tagType不存在
     */
    fun update(id: Int, form: AuthorUpdateForm) {
        data.db.transaction {
            val record = data.db.sequenceOf(Authors).firstOrNull { it.id eq id } ?: throw be(NotFound())

            val newType = form.type.isPresentThen { it != record.type }
            val newName = form.name.isPresentThen { it != record.name }.letOpt { kit.validateName(it, id) }
            val newOtherNames = form.otherNames.isPresentThen { (it ?: emptyList()) != record.otherNames }.letOpt { kit.validateOtherNames(it) }
            val newKeywords = form.keywords.isPresentThen { (it ?: emptyList()) != record.keywords }.letOpt { kit.validateKeywords(it) }
            val newDescription = form.description.isPresentThen { it != record.description }
            val newFavorite = form.favorite.isPresentThen { it != record.favorite }
            val newScore = form.score.isPresentThen { it != record.score }

            val newAnnotations = form.annotations.letOpt { kit.validateAnnotations(it, newType.unwrapOr { record.type }) }
                .isPresentThen { kit.processAnnotations(id, it.asSequence().map(Author.CachedAnnotation::id).toSet()) }

            val sourceTagMappingSot = form.mappingSourceTags.letOpt { sourceMappingManager.update(MetaType.AUTHOR, id, it ?: emptyList()) }.unwrapOr { false }

            if(anyOpt(newName, newOtherNames, newKeywords, newType, newDescription, newFavorite, newScore, newAnnotations)) {
                data.db.update(Authors) {
                    where { it.id eq id }
                    newName.applyOpt { set(it.name, this) }
                    newOtherNames.applyOpt { set(it.otherNames, this) }
                    newKeywords.applyOpt { set(it.keywords, this) }
                    newType.applyOpt { set(it.type, this) }
                    newDescription.applyOpt { set(it.description, this) }
                    newFavorite.applyOpt { set(it.favorite, this) }
                    newScore.applyOpt { set(it.score, this) }
                    newAnnotations.applyOpt { set(it.cachedAnnotations, this) }
                }
            }

            val listUpdated = anyOpt(newName, newOtherNames, newKeywords, newType, newFavorite, newScore)
            val detailUpdated = listUpdated || newAnnotations.isPresent || sourceTagMappingSot || newDescription.isPresent
            if(listUpdated || detailUpdated) {
                bus.emit(MetaTagUpdated(id, MetaType.AUTHOR, listUpdated = listUpdated, detailUpdated = true, annotationSot = newAnnotations.isPresent, sourceTagMappingSot = sourceTagMappingSot, parentSot = false))
            }
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun delete(id: Int) {
        data.db.transaction {
            data.db.delete(Authors) { it.id eq id }.let {
                if(it <= 0) throw be(NotFound())
            }
            data.db.delete(IllustAuthorRelations) { it.authorId eq id }
            data.db.delete(BookAuthorRelations) { it.authorId eq id }
            data.db.delete(AuthorAnnotationRelations) { it.authorId eq id }

            bus.emit(MetaTagDeleted(id, MetaType.AUTHOR))
        }
    }

    /**
     * 对author进行声明式的批量操作。
     */
    fun bulk(bulks: List<AuthorBulkForm>): BulkResult<String> {
        return bulks.collectBulkResult({ it.name }) { form ->
            val record = data.db.sequenceOf(Authors).firstOrNull { it.name eq form.name }
            if(record == null) {
                //当给出rename字段时，此操作被强制为更新操作，因此当走到这里时要报NotFound
                if(form.rename.isPresent) throw be(NotFound()) else create(AuthorCreateForm(
                    form.name, form.otherNames.unwrapOrNull(), form.type.unwrapOr { TagAuthorType.UNKNOWN },
                    form.keywords.unwrapOrNull(), form.description.unwrapOr { "" }, form.annotations.unwrapOrNull(),
                    form.favorite.unwrapOr { false }, form.score.unwrapOrNull(), form.mappingSourceTags.unwrapOrNull()
                ))
            }else{
                update(record.id, AuthorUpdateForm(form.rename, form.otherNames, form.type, form.keywords, form.description, form.annotations, form.favorite, form.score, form.mappingSourceTags))
            }
        }
    }
}