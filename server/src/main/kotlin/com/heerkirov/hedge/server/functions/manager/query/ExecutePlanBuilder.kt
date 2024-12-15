package com.heerkirov.hedge.server.functions.manager.query

import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.enums.TagAddressType
import com.heerkirov.hedge.server.library.compiler.semantic.dialect.BookDialect
import com.heerkirov.hedge.server.library.compiler.semantic.dialect.IllustDialect
import com.heerkirov.hedge.server.library.compiler.semantic.dialect.SourceDataDialect
import com.heerkirov.hedge.server.library.compiler.semantic.framework.FilterFieldDefinition
import com.heerkirov.hedge.server.library.compiler.semantic.plan.*
import com.heerkirov.hedge.server.library.compiler.semantic.plan.FilterValue
import com.heerkirov.hedge.server.library.compiler.translator.ExecuteBuilder
import com.heerkirov.hedge.server.library.compiler.translator.visual.*
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.utils.composition.unionComposition
import com.heerkirov.hedge.server.utils.filterInto
import com.heerkirov.hedge.server.utils.ktorm.compositionAny
import com.heerkirov.hedge.server.utils.ktorm.escapeLike
import com.heerkirov.hedge.server.utils.letIf
import org.ktorm.database.Database
import org.ktorm.dsl.*
import org.ktorm.expression.ArgumentExpression
import org.ktorm.expression.OrderByExpression
import org.ktorm.expression.ScalarExpression
import org.ktorm.schema.*
import java.time.*
import kotlin.collections.ArrayList

interface ExecutePlanBuilder : ExecuteBuilder {
    fun build(): ExecutePlan
}

interface SortByColumn<SORT> : ExecuteBuilder {
    fun getSortDeclareMapping(sort: SORT): ColumnDefinition

    fun setOrderBy(orderByExpressions: List<OrderByExpression>)

    override fun mapSorts(sorts: List<Sort<*>>) {
        setOrderBy(sorts.flatMap {
            @Suppress("UNCHECKED_CAST")
            val definition = getSortDeclareMapping(it.value as SORT)
            if(definition.nullsLast) {
                listOf(definition.column.isNotNull().desc(), if(it.isAscending()) definition.column.asc() else definition.column.desc())
            }else{
                listOf(if(it.isAscending()) definition.column.asc() else definition.column.desc())
            }
        })
    }

    data class ColumnDefinition(val column: Column<*>, val nullsLast: Boolean = false)
}

interface FilterByColumn : ExecuteBuilder {
    fun getFilterDeclareMapping(field: FilterFieldDefinition<*>): ColumnDeclaring<*>

    fun addWhereCondition(whereCondition: ColumnDeclaring<Boolean>)

    fun mapFilterSpecial(field: FilterFieldDefinition<*>, value: Any): Any {
        return value
    }

    fun mapCompositionFilterSpecial(field: FilterFieldDefinition<*>, column: ColumnDeclaring<*>, values: Collection<Any>): ColumnDeclaring<Boolean> {
        throw RuntimeException("Implemented composition field ${field.key}.")
    }

    override fun mapFilter(unionItems: Collection<Filter<out FilterValue>>, exclude: Boolean) {
        if(unionItems.isNotEmpty()) {
            unionItems.map { filter ->
                val column = getFilterDeclareMapping(filter.field)
                @Suppress("UNCHECKED_CAST")
                when (filter) {
                    is EqualFilter<*> -> {
                        val c = (column as ColumnDeclaring<Any>)
                        val values = filter.values.map { mapFilterSpecial(filter.field, it.equalValue) }
                        if (values.size == 1) { c eq values.first() } else { c inList values }
                    }
                    is RangeFilter<*> -> {
                        val c = (column as ColumnDeclaring<Comparable<Any>>)
                        val conditions = ArrayList<ScalarExpression<Boolean>>(2)
                        if (filter.begin != null) {
                            val v = mapFilterSpecial(filter.field, filter.begin.compareValue) as Comparable<Any>
                            conditions.add(if (filter.includeBegin) { c greaterEq v } else { c greater v })
                        }
                        if (filter.end != null) {
                            val v = mapFilterSpecial(filter.field, filter.end.compareValue) as Comparable<Any>
                            conditions.add(if (filter.includeEnd) { c lessEq v } else { c less v })
                        }
                        conditions.reduce { a, b -> a and b }
                    }
                    is MatchFilter<*> -> if(filter.exact) {
                        //开启exact参数时，使用近似精确模式，所有项使用仅X匹配，且当X不包含任何通配符时退化为equal
                        val c = (column as ColumnDeclaring<Any>)
                        val (sp, eq) = filter.values.map { mapFilterSpecial(filter.field, it.matchValue) as String }.filterInto { MetaParserUtil.isAnySqlSpecial(it) }
                        val matches = sp.map { column escapeLike MetaParserUtil.compileMatchFilter(it, exact = true) }
                        val equals = if(eq.size == 1) { c eq eq.first() }else if(eq.size > 1) { c inList eq }else{ null }
                        if(matches.isNotEmpty() && equals != null) {
                            matches.reduce { a, b -> a or b } or equals
                        }else if(matches.isNotEmpty()) {
                            matches.reduce { a, b -> a or b }
                        }else{
                            equals ?: throw RuntimeException("Matches and equals are both empty.")
                        }
                    }else{
                        //关闭exact参数时，使用完全模糊模式，即所有项都进行%X%匹配，也不会有任何优化
                        filter.values.map { column escapeLike MetaParserUtil.compileMatchFilter(mapFilterSpecial(filter.field, it.matchValue) as String) }.reduce { a, b -> a or b }
                    }
                    is CompositionFilter<*> -> mapCompositionFilterSpecial(filter.field, column, filter.values.map { it.equalValue })
                    is FlagFilter -> column as ColumnDeclaring<Boolean>
                    else -> throw RuntimeException("Unsupported filter type ${filter::class.simpleName}.")
                }
            }.reduce { a, b -> a or b }.letIf(exclude) { it.not() }.let { addWhereCondition(it) }
        }
    }
}

data class ExecutePlan(val whereConditions: List<ColumnDeclaring<Boolean>>, val joinConditions: List<Join>, val orderConditions: List<OrderByExpression>, val distinct: Boolean) {
    data class Join(val table: BaseTable<*>, val condition: ColumnDeclaring<Boolean>, val left: Boolean = false)
}

class IllustExecutePlanBuilder(private val db: Database) : ExecutePlanBuilder, SortByColumn<IllustDialect.IllustSortItem>, FilterByColumn {
    private val orders: MutableList<OrderByExpression> = ArrayList()
    private val wheres: MutableList<ColumnDeclaring<Boolean>> = ArrayList()
    private val joins: MutableList<ExecutePlan.Join> = ArrayList()

    //在连接查询中，如果遇到一整层查询的项为空，这一层按逻辑不会产生任何结果匹配，那么相当于结果恒为空。使用这个flag来优化这种情况。
    private var alwaysFalseFlag: Boolean = false

    //根据某些条件，可能需要额外连接数据表。使用flag来存储这种情况。
    private var joinSourceData: Boolean = false

    //在连接查询中，如果一层中有复数项，那么需要做去重。
    private var needDistinct: Boolean = false

    //在连接查询中，出现多次连接时需要alias dao，使用count做计数。
    private var joinCount = 0

    //在exclude连接查询中，具有相同类型的连接会被联合成同一个where nested查询来实现，在这里存储这个信息。
    private val excludeTags: MutableCollection<Int> = mutableSetOf()
    private val excludeTopics: MutableCollection<Int> = mutableSetOf()
    private val excludeAuthors: MutableCollection<Int> = mutableSetOf()
    private val excludeSourceTags: MutableCollection<Int> = mutableSetOf()

    private val orderDeclareMapping = mapOf(
        IllustDialect.IllustSortItem.ID to SortByColumn.ColumnDefinition(Illusts.id),
        IllustDialect.IllustSortItem.SCORE to SortByColumn.ColumnDefinition(Illusts.score, nullsLast = true),
        IllustDialect.IllustSortItem.ORDER_TIME to SortByColumn.ColumnDefinition(Illusts.orderTime),
        IllustDialect.IllustSortItem.PARTITION to SortByColumn.ColumnDefinition(Illusts.partitionTime),
        IllustDialect.IllustSortItem.CREATE_TIME to SortByColumn.ColumnDefinition(Illusts.createTime),
        IllustDialect.IllustSortItem.UPDATE_TIME to SortByColumn.ColumnDefinition(Illusts.updateTime),
        IllustDialect.IllustSortItem.SOURCE_ID to SortByColumn.ColumnDefinition(Illusts.sortableSourceId, nullsLast = true),
        IllustDialect.IllustSortItem.SOURCE_SITE to SortByColumn.ColumnDefinition(Illusts.sourceSite, nullsLast = true),
        IllustDialect.IllustSortItem.SOURCE_PUBLISH_TIME to SortByColumn.ColumnDefinition(SourceDatas.publishTime, nullsLast = true)
    )

    private val filterDeclareMapping = mapOf(
        IllustDialect.id to Illusts.id,
        IllustDialect.favorite to Illusts.favorite,
        IllustDialect.bookMember to (Illusts.cachedBookCount greater 0),
        IllustDialect.score to Illusts.exportedScore,
        IllustDialect.partition to Illusts.partitionTime,
        IllustDialect.orderTime to Illusts.orderTime,
        IllustDialect.createTime to Illusts.createTime,
        IllustDialect.updateTime to Illusts.updateTime,
        IllustDialect.description to Illusts.exportedDescription,
        IllustDialect.fileType to FileRecords.extension,
        IllustDialect.filesize to FileRecords.size,
        IllustDialect.resolutionWidth to FileRecords.resolutionWidth,
        IllustDialect.resolutionHeight to FileRecords.resolutionHeight,
        IllustDialect.resolutionArea to (FileRecords.resolutionWidth times FileRecords.resolutionHeight),
        IllustDialect.resolutionRatio to (FileRecords.resolutionWidth.cast(DoubleSqlType) div FileRecords.resolutionHeight.cast(DoubleSqlType)),
        IllustDialect.videoDuration to FileRecords.videoDuration,
        IllustDialect.sourceId to Illusts.sourceId,
        IllustDialect.sourcePage to Illusts.sourcePart,
        IllustDialect.sourcePageName to Illusts.sourcePartName,
        IllustDialect.sourceSite to Illusts.sourceSite,
        IllustDialect.sourceTitle to SourceDatas.title,
        IllustDialect.sourceDescription to SourceDatas.description,
        IllustDialect.sourcePublishTime to SourceDatas.publishTime,
        IllustDialect.tagme to Illusts.tagme
    )

    override fun getSortDeclareMapping(sort: IllustDialect.IllustSortItem): SortByColumn.ColumnDefinition {
        if(sort == IllustDialect.IllustSortItem.SOURCE_PUBLISH_TIME) joinSourceData = true
        return orderDeclareMapping[sort]!!
    }

    override fun getFilterDeclareMapping(field: FilterFieldDefinition<*>): ColumnDeclaring<*> {
        if(field == IllustDialect.sourceDescription || field == IllustDialect.sourceTitle || field == IllustDialect.sourcePublishTime) joinSourceData = true
        return filterDeclareMapping[field]!!
    }

    override fun setOrderBy(orderByExpressions: List<OrderByExpression>) {
        orders.addAll(orderByExpressions)
    }

    override fun addWhereCondition(whereCondition: ColumnDeclaring<Boolean>) {
        wheres.add(whereCondition)
    }

    override fun mapFilterSpecial(field: FilterFieldDefinition<*>, value: Any): Any {
        return when (field) {
            IllustDialect.orderTime -> (value as LocalDate).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli()
            IllustDialect.createTime, IllustDialect.updateTime -> (value as LocalDate).atStartOfDay(ZoneId.systemDefault()).toInstant()
            else -> value
        }
    }

    override fun mapCompositionFilterSpecial(field: FilterFieldDefinition<*>, column: ColumnDeclaring<*>, values: Collection<Any>): ColumnDeclaring<Boolean> {
        return when (field) {
            IllustDialect.fileType -> {
                val extensions = values.flatMap {
                    when(it as String) {
                        "VIDEO" -> listOf("mp4", "webm")
                        "IMAGE" -> listOf("jpeg", "jpg", "png", "gif")
                        "JPEG" -> listOf("jpeg", "jpg")
                        else -> listOf(it.lowercase())
                    }
                }.distinct()
                @Suppress("UNCHECKED_CAST")
                (column as ColumnDeclaring<String>) inList extensions
            }
            IllustDialect.tagme -> {
                val tagme = if(values.isEmpty()) Illust.Tagme.baseElements.unionComposition() else values.map {
                    when (it as String) {
                        "AUTHOR" -> Illust.Tagme.AUTHOR
                        "TOPIC" -> Illust.Tagme.TOPIC
                        "TAG" -> Illust.Tagme.TAG
                        "SOURCE" -> Illust.Tagme.SOURCE
                        else -> throw RuntimeException("Illegal IllustDialect Tagme value '$it'.")
                    }
                }.unionComposition()
                @Suppress("UNCHECKED_CAST")
                (column as ColumnDeclaring<Illust.Tagme>) compositionAny tagme
            }
            else -> super.mapCompositionFilterSpecial(field, column, values)
        }
    }

    override fun mapTopicElement(unionItems: List<ElementTopic>, exclude: Boolean) {
        when {
            exclude -> excludeTopics.addAll(unionItems.map { it.id })
            unionItems.isEmpty() -> alwaysFalseFlag = true
            else -> {
                val j = IllustTopicRelations.aliased("IR_${++joinCount}")
                val condition = if(unionItems.size == 1) {
                    j.topicId eq unionItems.first().id
                }else{
                    needDistinct = true
                    j.topicId inList unionItems.map { it.id }
                }
                joins.add(ExecutePlan.Join(j, j.illustId eq Illusts.id and condition))
            }
        }
    }

    override fun mapAuthorElement(unionItems: List<ElementAuthor>, exclude: Boolean) {
        when {
            exclude -> excludeAuthors.addAll(unionItems.map { it.id })
            unionItems.isEmpty() -> alwaysFalseFlag = true
            else -> {
                val j = IllustAuthorRelations.aliased("IR_${++joinCount}")
                val condition = if(unionItems.size == 1) {
                    j.authorId eq unionItems.first().id
                }else{
                    needDistinct = true
                    j.authorId inList unionItems.map { it.id }
                }
                joins.add(ExecutePlan.Join(j, j.illustId eq Illusts.id and condition))
            }
        }
    }

    override fun mapTagElement(unionItems: List<ElementTag>, exclude: Boolean) {
        val ids = unionItems.flatMap { if(it.tagType == TagAddressType.VIRTUAL_ADDR && it.realTags != null) it.realTags.map { t -> t.id } else listOf(it.id) }
        when {
            exclude -> excludeTags.addAll(ids)
            ids.isEmpty() -> alwaysFalseFlag = true
            else -> {
                val j = IllustTagRelations.aliased("IR_${++joinCount}")
                val condition = if(ids.size == 1) {
                    j.tagId eq ids.first()
                }else{
                    needDistinct = true
                    j.tagId inList ids
                }
                joins.add(ExecutePlan.Join(j, j.illustId eq Illusts.id and condition))
            }
        }
    }

    override fun mapCommentElement(unionItems: List<ElementString>, exclude: Boolean) {
        //一个comment bracket下可以包含多个str，在查找时会将这多个str组合成一个有序查找串，要求一个字段同时满足整个查找串
        val condition = if(unionItems.size == 1 && unionItems.first().precise) {
            //如果其中只存在一个precise字符串，则使其仅完全匹配整个description
            Illusts.description eq unionItems.first().value
        }else{
            val matchFilter = MetaParserUtil.compileMatchFilter(unionItems.joinToString("*") { it.value })
            Illusts.description like matchFilter
        }
        wheres.add(condition.let { if(exclude) it.not() else it })
    }

    override fun mapSourceTagElement(unionItems: List<ElementSourceTag>, exclude: Boolean) {
        when {
            exclude -> excludeSourceTags.addAll(unionItems.map { it.id })
            unionItems.isEmpty() -> alwaysFalseFlag = true
            else -> {
                val j = SourceTagRelations.aliased("IR_${++joinCount}")
                val condition = if(unionItems.size == 1) {
                    j.sourceTagId eq unionItems.first().id
                }else{
                    needDistinct = true
                    j.sourceTagId inList unionItems.map { it.id }
                }
                joins.add(ExecutePlan.Join(j, j.sourceDataId eq Illusts.sourceDataId and condition))
            }
        }
    }

    override fun build(): ExecutePlan {
        if(alwaysFalseFlag) {
            return ExecutePlan(listOf(ArgumentExpression(false, BooleanSqlType)), emptyList(), emptyList(), false)
        }
        if(excludeTags.isNotEmpty()) {
            wheres.add(Illusts.id notInList db.from(IllustTagRelations).select(IllustTagRelations.illustId).where {
                if(excludeTags.size == 1) IllustTagRelations.tagId eq excludeTags.first() else IllustTagRelations.tagId inList excludeTags
            })
        }
        if(excludeTopics.isNotEmpty()) {
            wheres.add(Illusts.id notInList db.from(IllustTopicRelations).select(IllustTopicRelations.illustId).where {
                if(excludeTopics.size == 1) IllustTopicRelations.topicId eq excludeTopics.first() else IllustTopicRelations.topicId inList excludeTopics
            })
        }
        if(excludeAuthors.isNotEmpty()) {
            wheres.add(Illusts.id notInList db.from(IllustAuthorRelations).select(IllustAuthorRelations.illustId).where {
                if(excludeAuthors.size == 1) IllustAuthorRelations.authorId eq excludeAuthors.first() else IllustAuthorRelations.authorId inList excludeAuthors
            })
        }
        if(excludeSourceTags.isNotEmpty()) {
            wheres.add(Illusts.id notInList db.from(Illusts)
                .innerJoin(SourceTagRelations, SourceTagRelations.sourceDataId eq Illusts.sourceDataId)
                .select(Illusts.id))
        }
        if(joinSourceData) {
            joins.add(ExecutePlan.Join(SourceDatas, SourceDatas.id eq Illusts.sourceDataId, left = true))
        }
        return ExecutePlan(wheres, joins, orders, needDistinct)
    }
}

class BookExecutePlanBuilder(private val db: Database) : ExecutePlanBuilder, SortByColumn<BookDialect.BookSortItem>, FilterByColumn {
    private val orders: MutableList<OrderByExpression> = ArrayList()
    private val wheres: MutableList<ColumnDeclaring<Boolean>> = ArrayList()
    private val joins: MutableList<ExecutePlan.Join> = ArrayList()

    //在连接查询中，如果遇到一整层查询的项为空，这一层按逻辑不会产生任何结果匹配，那么相当于结果恒为空。使用这个flag来优化这种情况。
    private var alwaysFalseFlag: Boolean = false

    //在连接查询中，如果一层中有复数项，那么需要做去重。
    private var needDistinct: Boolean = false

    //在连接查询中，出现多次连接时需要alias dao，使用count做计数。
    private var joinCount = 0

    //在exclude连接查询中，具有相同类型的连接会被联合成同一个where nested查询来实现，在这里存储这个信息。
    private val excludeTags: MutableCollection<Int> = mutableSetOf()
    private val excludeTopics: MutableCollection<Int> = mutableSetOf()
    private val excludeAuthors: MutableCollection<Int> = mutableSetOf()

    private val orderDeclareMapping = mapOf(
        BookDialect.BookSortItem.ID to SortByColumn.ColumnDefinition(Books.id),
        BookDialect.BookSortItem.SCORE to SortByColumn.ColumnDefinition(Books.score, nullsLast = true),
        BookDialect.BookSortItem.IMAGE_COUNT to SortByColumn.ColumnDefinition(Books.cachedCount),
        BookDialect.BookSortItem.CREATE_TIME to SortByColumn.ColumnDefinition(Books.createTime),
        BookDialect.BookSortItem.UPDATE_TIME to SortByColumn.ColumnDefinition(Books.updateTime),
    )

    private val filterDeclareMapping = mapOf(
        BookDialect.id to Books.id,
        BookDialect.favorite to Books.favorite,
        BookDialect.score to Books.score,
        BookDialect.imageCount to Books.cachedCount,
        BookDialect.createTime to Books.createTime,
        BookDialect.updateTime to Books.updateTime,
        BookDialect.title to Books.title,
        BookDialect.description to Books.description,
    )

    override fun getSortDeclareMapping(sort: BookDialect.BookSortItem): SortByColumn.ColumnDefinition {
        return orderDeclareMapping[sort]!!
    }

    override fun getFilterDeclareMapping(field: FilterFieldDefinition<*>): Column<*> {
        return filterDeclareMapping[field]!!
    }

    override fun setOrderBy(orderByExpressions: List<OrderByExpression>) {
        this.orders.addAll(orderByExpressions)
    }

    override fun addWhereCondition(whereCondition: ColumnDeclaring<Boolean>) {
        wheres.add(whereCondition)
    }

    override fun mapFilterSpecial(field: FilterFieldDefinition<*>, value: Any): Any {
        return when (field) {
            BookDialect.createTime, BookDialect.updateTime -> (value as LocalDate).atStartOfDay(ZoneId.systemDefault()).toInstant()
            else -> value
        }
    }

    override fun mapTopicElement(unionItems: List<ElementTopic>, exclude: Boolean) {
        when {
            exclude -> excludeTopics.addAll(unionItems.map { it.id })
            unionItems.isEmpty() -> alwaysFalseFlag = true
            else -> {
                val j = BookTopicRelations.aliased("AR_${++joinCount}")
                val condition = if(unionItems.size == 1) {
                    j.topicId eq unionItems.first().id
                }else{
                    needDistinct = true
                    j.topicId inList unionItems.map { it.id }
                }
                joins.add(ExecutePlan.Join(j, j.bookId eq Books.id and condition))
            }
        }
    }

    override fun mapAuthorElement(unionItems: List<ElementAuthor>, exclude: Boolean) {
        when {
            exclude -> excludeAuthors.addAll(unionItems.map { it.id })
            unionItems.isEmpty() -> alwaysFalseFlag = true
            else -> {
                val j = BookAuthorRelations.aliased("AR_${++joinCount}")
                val condition = if(unionItems.size == 1) {
                    j.authorId eq unionItems.first().id
                }else{
                    needDistinct = true
                    j.authorId inList unionItems.map { it.id }
                }
                joins.add(ExecutePlan.Join(j, j.bookId eq Books.id and condition))
            }
        }
    }

    override fun mapTagElement(unionItems: List<ElementTag>, exclude: Boolean) {
        val ids = unionItems.flatMap { if(it.tagType == TagAddressType.VIRTUAL_ADDR && it.realTags != null) it.realTags.map { t -> t.id } else listOf(it.id) }
        when {
            exclude -> excludeTags.addAll(ids)
            ids.isEmpty() -> alwaysFalseFlag = true
            else -> {
                val j = BookTagRelations.aliased("IR_${++joinCount}")
                val condition = if(ids.size == 1) {
                    j.tagId eq ids.first()
                }else{
                    needDistinct = true
                    j.tagId inList ids
                }
                joins.add(ExecutePlan.Join(j, j.bookId eq Books.id and condition))
            }
        }
    }

    override fun mapCommentElement(unionItems: List<ElementString>, exclude: Boolean) {
        //一个comment bracket下可以包含多个str，在查找时会将这多个str组合成一个有序查找串，要求一个字段同时满足整个查找串
        val condition = if(unionItems.size == 1 && unionItems.first().precise) {
            //如果其中只存在一个precise字符串，则使其仅完全匹配整个title或description
            (Books.description eq unionItems.first().value) or (Books.title eq unionItems.first().value)
        }else{
            val matchFilter = MetaParserUtil.compileMatchFilter(unionItems.joinToString("*") { it.value })
            (Books.description like matchFilter) or (Books.title like matchFilter)
        }
        wheres.add(condition.let { if(exclude) it.not() else it })
    }

    override fun build(): ExecutePlan {
        if(alwaysFalseFlag) {
            return ExecutePlan(listOf(ArgumentExpression(false, BooleanSqlType)), emptyList(), emptyList(), false)
        }
        if(excludeTags.isNotEmpty()) {
            wheres.add(Books.id notInList db.from(BookTagRelations).select(BookTagRelations.bookId).where {
                if(excludeTags.size == 1) BookTagRelations.tagId eq excludeTags.first() else BookTagRelations.tagId inList excludeTags
            })
        }
        if(excludeTopics.isNotEmpty()) {
            wheres.add(Books.id notInList db.from(BookTopicRelations).select(BookTopicRelations.bookId).where {
                if(excludeTopics.size == 1) BookTopicRelations.topicId eq excludeTopics.first() else BookTopicRelations.topicId inList excludeTopics
            })
        }
        if(excludeAuthors.isNotEmpty()) {
            wheres.add(Books.id notInList db.from(BookAuthorRelations).select(BookAuthorRelations.bookId).where {
                if(excludeAuthors.size == 1) BookAuthorRelations.authorId eq excludeAuthors.first() else BookAuthorRelations.authorId inList excludeAuthors
            })
        }
        return ExecutePlan(wheres, joins, orders, needDistinct)
    }
}

class AuthorExecutePlanBuilder : ExecutePlanBuilder {
    private val wheres: MutableList<ColumnDeclaring<Boolean>> = ArrayList()
    private val joins: MutableList<ExecutePlan.Join> = ArrayList()

    override fun mapNameElement(unionItems: List<ElementString>, exclude: Boolean) {
        wheres.add(unionItems.map {
            if(it.precise) {
                Authors.name eq it.value
            }else{
                val matchFilter = MetaParserUtil.compileMatchFilter(it.value)
                (Authors.name like matchFilter) or (Authors.otherNames like matchFilter)
            }
        }.reduce { a, b -> a or b }.let {
            if(exclude) it.not() else it
        })
    }

    override fun mapCommentElement(unionItems: List<ElementString>, exclude: Boolean) {
        //一个comment bracket下可以包含多个str，在查找时会将这多个str组合成一个有序查找串，要求一个字段同时满足整个查找串
        val condition = if(unionItems.size == 1 && unionItems.first().precise) {
            //如果其中只存在一个precise字符串，则使其仅完全匹配keyword或整个description
            val matchFilter = "%|${MetaParserUtil.compileMatchFilter(unionItems.first().value, exact = true)}|%"
            (Authors.keywords like matchFilter) or (Authors.description eq unionItems.first().value)
        }else{
            val matchFilter = MetaParserUtil.compileMatchFilter(unionItems.joinToString("*") { it.value })
            (Authors.keywords like matchFilter) or (Authors.description like matchFilter)
        }
        wheres.add(condition.let { if(exclude) it.not() else it })
    }

    override fun build(): ExecutePlan {
        return ExecutePlan(wheres, joins, emptyList(), false)
    }
}

class TopicExecutePlanBuilder : ExecutePlanBuilder {
    private val wheres: MutableList<ColumnDeclaring<Boolean>> = ArrayList()
    private val joins: MutableList<ExecutePlan.Join> = ArrayList()

    override fun mapNameElement(unionItems: List<ElementString>, exclude: Boolean) {
        wheres.add(unionItems.map {
            if(it.precise) {
                Topics.name eq it.value
            }else{
                val matchFilter = MetaParserUtil.compileMatchFilter(it.value)
                (Topics.name like matchFilter) or (Topics.otherNames like matchFilter)
            }
        }.reduce { a, b -> a or b }.let {
            if(exclude) it.not() else it
        })
    }

    override fun mapCommentElement(unionItems: List<ElementString>, exclude: Boolean) {
        //一个comment bracket下可以包含多个str，在查找时会将这多个str组合成一个有序查找串，要求一个字段同时满足整个查找串
        val condition = if(unionItems.size == 1 && unionItems.first().precise) {
            //如果其中只存在一个precise字符串，则使其仅完全匹配keyword
            val matchFilter = "%|${MetaParserUtil.compileMatchFilter(unionItems.first().value, exact = true)}|%"
            (Topics.keywords like matchFilter) or (Topics.description eq unionItems.first().value)
        }else{
            val matchFilter = MetaParserUtil.compileMatchFilter(unionItems.joinToString("*") { it.value })
            (Topics.keywords like matchFilter) or (Topics.description like matchFilter)
        }
        wheres.add(condition.let { if(exclude) it.not() else it })
    }

    override fun build(): ExecutePlan {
        return ExecutePlan(wheres, joins, emptyList(), false)
    }
}

class SourceDataExecutePlanBuilder(private val db: Database): ExecutePlanBuilder, SortByColumn<SourceDataDialect.SortItem>, FilterByColumn {
    private val orders: MutableList<OrderByExpression> = ArrayList()
    private val wheres: MutableList<ColumnDeclaring<Boolean>> = ArrayList()
    private val joins: MutableList<ExecutePlan.Join> = ArrayList()

    //在连接查询中，如果遇到一整层查询的项为空，这一层按逻辑不会产生任何结果匹配，那么相当于结果恒为空。使用这个flag来优化这种情况。
    private var alwaysFalseFlag: Boolean = false

    //在连接查询中，如果一层中有复数项，那么需要做去重。
    private var needDistinct: Boolean = false

    //在连接查询中，出现多次连接时需要alias dao，使用count做计数。
    private var joinCount = 0

    //在exclude连接查询中，具有相同类型的连接会被联合成同一个where nested查询来实现，在这里存储这个信息。
    private val excludeSourceTags: MutableCollection<Int> = mutableSetOf()

    private val orderDeclareMapping = mapOf(
        SourceDataDialect.SortItem.SOURCE_ID to SortByColumn.ColumnDefinition(SourceDatas.sortableSourceId),
        SourceDataDialect.SortItem.SOURCE_SITE to SortByColumn.ColumnDefinition(SourceDatas.sourceSite),
        SourceDataDialect.SortItem.PUBLISH_TIME to SortByColumn.ColumnDefinition(SourceDatas.publishTime, nullsLast = true)
    )

    private val filterDeclareMapping = mapOf(
        SourceDataDialect.sourceId to SourceDatas.sourceId,
        SourceDataDialect.sourceSite to SourceDatas.sourceSite,
        SourceDataDialect.title to SourceDatas.title,
        SourceDataDialect.description to SourceDatas.description,
        SourceDataDialect.publishTime to SourceDatas.publishTime,
        SourceDataDialect.status to SourceDatas.status
    )

    override fun getSortDeclareMapping(sort: SourceDataDialect.SortItem): SortByColumn.ColumnDefinition {
        return orderDeclareMapping[sort]!!
    }

    override fun getFilterDeclareMapping(field: FilterFieldDefinition<*>): Column<*> {
        return filterDeclareMapping[field]!!
    }

    override fun setOrderBy(orderByExpressions: List<OrderByExpression>) {
        this.orders.addAll(orderByExpressions)
    }

    override fun addWhereCondition(whereCondition: ColumnDeclaring<Boolean>) {
        wheres.add(whereCondition)
    }

    override fun mapCommentElement(unionItems: List<ElementString>, exclude: Boolean) {
        //一个comment bracket下可以包含多个str，在查找时会将这多个str组合成一个有序查找串，要求一个字段同时满足整个查找串
        val condition = if(unionItems.size == 1 && unionItems.first().precise) {
            //如果其中只存在一个precise字符串，则使其仅完全匹配整个title或description
            (SourceDatas.description eq unionItems.first().value) or (SourceDatas.title eq unionItems.first().value)
        }else{
            val matchFilter = MetaParserUtil.compileMatchFilter(unionItems.joinToString("*") { it.value })
            (SourceDatas.description like matchFilter) or (SourceDatas.title like matchFilter)
        }
        wheres.add(condition.let { if(exclude) it.not() else it })
    }

    override fun mapSourceTagElement(unionItems: List<ElementSourceTag>, exclude: Boolean) {
        when {
            exclude -> excludeSourceTags.addAll(unionItems.map { it.id })
            unionItems.isEmpty() -> alwaysFalseFlag = true
            else -> {
                val j = SourceTagRelations.aliased("IR_${++joinCount}")
                val condition = if(unionItems.size == 1) {
                    j.sourceTagId eq unionItems.first().id
                }else{
                    needDistinct = true
                    j.sourceTagId inList unionItems.map { it.id }
                }
                joins.add(ExecutePlan.Join(j, j.sourceDataId eq SourceDatas.id and condition))
            }
        }
    }

    override fun build(): ExecutePlan {
        if(alwaysFalseFlag) {
            return ExecutePlan(listOf(ArgumentExpression(false, BooleanSqlType)), emptyList(), emptyList(), false)
        }
        if(excludeSourceTags.isNotEmpty()) {
            wheres.add(SourceDatas.id notInList db.from(SourceTagRelations).select(SourceTagRelations.sourceDataId).where {
                if(excludeSourceTags.size == 1) SourceTagRelations.sourceTagId eq excludeSourceTags.first() else SourceTagRelations.sourceTagId inList excludeSourceTags
            })
        }
        return ExecutePlan(wheres, joins, orders, needDistinct)
    }
}