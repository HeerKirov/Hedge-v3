package com.heerkirov.hedge.server.library.compiler

import com.heerkirov.hedge.server.library.compiler.grammar.GrammarAnalyzer
import com.heerkirov.hedge.server.library.compiler.lexical.LexicalAnalyzer
import com.heerkirov.hedge.server.library.compiler.semantic.*
import com.heerkirov.hedge.server.library.compiler.semantic.dialect.BookDialect
import com.heerkirov.hedge.server.library.compiler.semantic.dialect.AnnotationDialect
import com.heerkirov.hedge.server.library.compiler.semantic.dialect.AuthorAndTopicDialect
import com.heerkirov.hedge.server.library.compiler.semantic.dialect.IllustDialect
import com.heerkirov.hedge.server.library.compiler.semantic.framework.QueryDialect
import com.heerkirov.hedge.server.library.compiler.semantic.plan.*
import com.heerkirov.hedge.server.library.compiler.utils.AnalysisResult
import com.heerkirov.hedge.server.library.compiler.utils.SemanticError
import java.time.LocalDate
import kotlin.reflect.KClass
import kotlin.test.Test
import kotlin.test.assertEquals

class SemanticAnalyzerTest {
    @Test
    fun testElement() {
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                authorElementOf(MetaString("hello"))
            )
        )), parse("hello", IllustDialect::class))
        //测试逻辑关系
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                authorElementOf(MetaString("a"), MetaString("b")),
                authorElementOf(MetaString("c"))
            )
        )), parse("a|b&c", IllustDialect::class))

    }

    @Test
    fun testElementPrefix() {
        //测试前缀
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                authorElementOf(MetaString("hello"), exclude = true)
            )
        )), parse("-hello", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                sourceElementOf(MetaString("hello"))
            )
        )), parse("^hello", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                sourceElementOf(MetaString("hello"), exclude = true)
            )
        )), parse("-^hello", IllustDialect::class))
    }

    @Test
    fun testElementTypePrefix() {
        //测试不同的标签
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                topicElementOf(listOf(MetaString("a"), MetaString("b")))
            )
        )), parse("a.b", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                topicElementOf(listOf(MetaString("a"), MetaString("b", precise = true), MetaString("c")))
            )
        )), parse("'a'.`b`.\"c\"", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                tagElementOf(SequentialMetaValueOfCollection(listOf(MetaString("a")), listOf(MetaString("b"))))
            )
        )), parse("a:b", IllustDialect::class))
        //测试标记了类型的标签
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                authorElementOf(MetaString("a"), metaType = MetaType.AUTHOR)
            )
        )), parse("@a", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                topicElementOf(listOf(MetaString("a"), MetaString("b")), metaType = MetaType.TOPIC)
            )
        )), parse("#a.b", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                tagElementOf(SequentialMetaValueOfCollection(listOf(MetaString("a")), listOf(MetaString("b"))), metaType = MetaType.TAG)
            )
        )), parse("${'$'}a:b", IllustDialect::class))
        //测试错误类型标记
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            InvalidMetaTagForThisPrefix("@", 0, 4)
        )), parse("@a.b", IllustDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            InvalidMetaTagForThisPrefix("@", 0, 4)
        )), parse("@a:b", IllustDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            InvalidMetaTagForThisPrefix("#", 0, 4)
        )), parse("#a:b", IllustDialect::class))
    }

    @Test
    fun testElementValue() {
        //测试元素值
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                tagElementOf(SequentialMetaValueOfRange(listOf(MetaString("a")), begin = MetaString("1"), end = MetaString("2"), includeBegin = true, includeEnd = true))
            )
        )), parse("a:[1, 2]", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                tagElementOf(SequentialMetaValueOfRange(listOf(MetaString("a")), begin = MetaString("1"), end = MetaString("2"), includeBegin = true, includeEnd = false))
            )
        )), parse("a:[1, 2)", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                tagElementOf(SequentialMetaValueOfRange(listOf(MetaString("a")), begin = MetaString("1"), end = MetaString("2"), includeBegin = false, includeEnd = true))
            )
        )), parse("a:(1, 2]", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                tagElementOf(SequentialMetaValueOfRange(listOf(MetaString("a")), begin = MetaString("1"), end = MetaString("2"), includeBegin = false, includeEnd = false))
            )
        )), parse("a:(1, 2)", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                tagElementOf(SequentialMetaValueOfCollection(listOf(MetaString("a")), listOf(MetaString("1"), MetaString("2"))))
            )
        )), parse("a:{1, 2}", IllustDialect::class))
        //测试元素关系
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                tagElementOf(SequentialMetaValueOfRange(listOf(MetaString("a")), begin = MetaString("1"), end = null, includeBegin = true, includeEnd = false))
            )
        )), parse("a>=1", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                tagElementOf(SequentialMetaValueOfRange(listOf(MetaString("a")), begin = MetaString("1"), end = null, includeBegin = false, includeEnd = false))
            )
        )), parse("a>1", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                tagElementOf(SequentialMetaValueOfRange(listOf(MetaString("a")), begin = null, end = MetaString("1"), includeBegin = false, includeEnd = true))
            )
        )), parse("a<=1", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                tagElementOf(SequentialMetaValueOfRange(listOf(MetaString("a")), begin = null, end = MetaString("1"), includeBegin = false, includeEnd = false))
            )
        )), parse("a<1", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                tagElementOf(SequentialItemMetaValueToOther(listOf(MetaString("a")), MetaString("b")))
            )
        )), parse("a~b", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                tagElementOf(SequentialItemMetaValueToDirection(listOf(MetaString("a")), desc = false))
            )
        )), parse("a~+", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                tagElementOf(SequentialItemMetaValueToDirection(listOf(MetaString("a")), desc = true))
            )
        )), parse("a~-", IllustDialect::class))
        //测试错误的元素关系和值
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            UnsupportedElementValueType("meta-tag", ValueType.SORT_LIST, 2, 5)
        )), parse("a:1,2", IllustDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            UnsupportedElementValueTypeOfRelation("meta-tag", ValueType.RANGE, ">", 2, 7)
        )), parse("a>[1,2]", IllustDialect::class))
    }

    @Test
    fun testElementDialect() {
        //测试其他方言
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                authorElementOf(MetaString("hello"))
            )
        )), parse("hello", BookDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                nameElementOf(MetaString("hello"))
            )
        )), parse("hello", AuthorAndTopicDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                nameElementOf(MetaString("hello"))
            )
        )), parse("hello", AnnotationDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            ElementPrefixNotRequired("name", 0, 6)
        )), parse("@hello", AnnotationDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            ElementValueNotRequired("name", 0, 7)
        )), parse("hello:1", AnnotationDialect::class))
    }

    @Test
    fun testAnnotation() {
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                annotationElementOf(MetaString("a"), metaType = null)
            )
        )), parse("[a]", IllustDialect::class))
        //测试注解前缀
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                annotationElementOf(MetaString("a"), metaType = MetaType.AUTHOR)
            )
        )), parse("[@a]", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                annotationElementOf(MetaString("a"), metaType = MetaType.TOPIC)
            )
        )), parse("[#a]", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                annotationElementOf(MetaString("a"), metaType = MetaType.TAG)
            )
        )), parse("[${'$'}a]", IllustDialect::class))
        //测试排除和错误的source
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                annotationElementOf(MetaString("a"), metaType = null, exclude = true)
            )
        )), parse("-[a]", IllustDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            AnnotationCannotHaveSourceFlag(0, 4)
        )), parse("^[a]", IllustDialect::class))
        //测试注解关系
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                annotationElementOf(MetaString("a"), MetaString("b", precise = true), metaType = null)
            )
        )), parse("[a|`b`]", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                annotationElementOf(MetaString("a", precise = true), MetaString("b"), metaType = null),
                annotationElementOf(MetaString("updating"), metaType = MetaType.TOPIC)
            )
        )), parse("[`a`|b][#updating]", IllustDialect::class))
        //测试其他方言的注解
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = listOf(
                metaAnnotationElementOf(MetaString("a"))
            )
        )), parse("[a]", AuthorAndTopicDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            ElementPrefixNotRequired("annotation", 0, 4)
        )), parse("[@a]", AuthorAndTopicDialect::class))
    }

    @Test
    fun testOrder() {
        //测试排序
        assertEquals(AnalysisResult(QueryPlan(
            orders = listOf(Order(IllustDialect.IllustOrderItem.ID, desc = false)),
            filters = emptyList(),
            elements = emptyList()
        )), parse("order:id", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = listOf(Order(IllustDialect.IllustOrderItem.ID, desc = false)),
            filters = emptyList(),
            elements = emptyList()
        )), parse("order:ID", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = listOf(Order(IllustDialect.IllustOrderItem.SOURCE_ID, desc = false)),
            filters = emptyList(),
            elements = emptyList()
        )), parse("order:^ID", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = listOf(Order(IllustDialect.IllustOrderItem.ID, desc = true)),
            filters = emptyList(),
            elements = emptyList()
        )), parse("order:-id", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = listOf(Order(IllustDialect.IllustOrderItem.ID, desc = false)),
            filters = emptyList(),
            elements = emptyList()
        )), parse("order:+id", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = listOf(Order(IllustDialect.IllustOrderItem.ID, desc = false), Order(IllustDialect.IllustOrderItem.SCORE, desc = false)),
            filters = emptyList(),
            elements = emptyList()
        )), parse("order:id,score", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = listOf(Order(IllustDialect.IllustOrderItem.ID, desc = false), Order(IllustDialect.IllustOrderItem.SCORE, desc = true)),
            filters = emptyList(),
            elements = emptyList()
        )), parse("order:id, -score", IllustDialect::class))
        //测试关系
        assertEquals(AnalysisResult(QueryPlan(
            orders = listOf(Order(IllustDialect.IllustOrderItem.ID, desc = false), Order(IllustDialect.IllustOrderItem.SCORE, desc = false)),
            filters = emptyList(),
            elements = emptyList()
        )), parse("order:id order:score", IllustDialect::class))
        //测试错误
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            OrderIsIndependent(0, 20)
        )), parse("order:id|order:score", IllustDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            OrderIsIndependent(0, 13)
        )), parse("order:id|id:1", IllustDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            OrderIsIndependent(0, 9)
        )), parse("-order:id", IllustDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            ThisIdentifyCannotHaveSourceFlag("order", 1, 6)
        )), parse("^order:score", IllustDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            OrderValueRequired(0, 5)
        )), parse("order", IllustDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            OrderValueMustBeSortList(0, 9)
        )), parse("order:{1}", IllustDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            OrderValueMustBeSortList(0, 7)
        )), parse("order>1", IllustDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            InvalidOrderItem("x", listOf("id", "score", "s", "ordinal", "ord", "partition", "pt", "create-time", "create", "ct", "update-time", "update", "ut", "^id", "source-id", "^site", "source-site"), 6, 7)
        )), parse("order:x", IllustDialect::class))
    }

    @Test
    fun testFilterValue() {
        //string类型
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(MatchFilter(IllustDialect.description, listOf(FilterStringValueImpl("hello-world")))))),
            elements = emptyList()
        )), parse("desc:hello-world", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(EqualFilter(IllustDialect.description, listOf(FilterStringValueImpl("hello, world")))))),
            elements = emptyList()
        )), parse("desc:`hello, world`", IllustDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            EnumTypeCastError("x", "Tagme", listOf("tag", "author", "topic", "source"), 6, 7)
        )), parse("tagme:x", IllustDialect::class))
        //number类型
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(EqualFilter(IllustDialect.score, listOf(FilterNumberValueImpl(5)))))),
            elements = emptyList()
        )), parse("score:5", IllustDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            TypeCastError("a", TypeCastError.Type.NUMBER, 6, 7)
        )), parse("score:a", IllustDialect::class))
        //pattern number类型
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(MatchFilter(IllustDialect.id, listOf(FilterPatternNumberValueImpl("*")))))),
            elements = emptyList()
        )), parse("id:*", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(MatchFilter(IllustDialect.id, listOf(FilterPatternNumberValueImpl("2*5")))))),
            elements = emptyList()
        )), parse("id:2*5", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(MatchFilter(IllustDialect.id, listOf(FilterPatternNumberValueImpl("256*1?")))))),
            elements = emptyList()
        )), parse("id:256*1?", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(MatchFilter(IllustDialect.id, listOf(FilterPatternNumberValueImpl("1?2?")))))),
            elements = emptyList()
        )), parse("id:1?2?", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(EqualFilter(IllustDialect.id, listOf(FilterPatternNumberValueImpl(12)))))),
            elements = emptyList()
        )), parse("id:12", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(RangeFilter(IllustDialect.id, FilterPatternNumberValueImpl(100), FilterPatternNumberValueImpl(110), includeBegin = true, includeEnd = false)))),
            elements = emptyList()
        )), parse("id:10?", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(RangeFilter(IllustDialect.id, FilterPatternNumberValueImpl(43960000), FilterPatternNumberValueImpl(43970000), includeBegin = true, includeEnd = false)))),
            elements = emptyList()
        )), parse("id:4396????", IllustDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            TypeCastError("a", TypeCastError.Type.NUMBER, 3, 4)
        )), parse("id:a", IllustDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            TypeCastError("a*", TypeCastError.Type.NUMBER, 3, 5)
        )), parse("id:a*", IllustDialect::class))
        //date类型
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(EqualFilter(IllustDialect.partition, listOf(FilterDateValueImpl(LocalDate.of(2021, 1, 1))))))),
            elements = emptyList()
        )), parse("pt:2021-01-01", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(EqualFilter(IllustDialect.createTime, listOf(FilterDateValueImpl(LocalDate.of(2021, 12, 31))))))),
            elements = emptyList()
        )), parse("create-time:2021-12-31", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(EqualFilter(IllustDialect.updateTime, listOf(FilterDateValueImpl(LocalDate.of(2021, 1, 1))))))),
            elements = emptyList()
        )), parse("update-time:'2021/01.01'", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(RangeFilter(IllustDialect.partition, FilterDateValueImpl(LocalDate.of(2021, 1, 1)), FilterDateValueImpl(LocalDate.of(2021, 2, 1)), includeBegin = true, includeEnd = false)))),
            elements = emptyList()
        )), parse("pt:2021-01", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(RangeFilter(IllustDialect.partition, FilterDateValueImpl(LocalDate.of(2021, 1, 1)), FilterDateValueImpl(LocalDate.of(2022, 1, 1)), includeBegin = true, includeEnd = false)))),
            elements = emptyList()
        )), parse("pt:2021", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(EqualFilter(IllustDialect.partition, listOf(FilterDateValueImpl(LocalDate.of(LocalDate.now().year, 12, 1))))))),
            elements = emptyList()
        )), parse("pt:12-01", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(RangeFilter(IllustDialect.partition, FilterDateValueImpl(LocalDate.of(LocalDate.now().year, 12, 1)), FilterDateValueImpl(LocalDate.of(LocalDate.now().year + 1, 1, 1)), includeBegin = true, includeEnd = false)))),
            elements = emptyList()
        )), parse("pt:12", IllustDialect::class))
        //size类型
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(EqualFilter(IllustDialect.filesize, listOf(FilterSizeValueImpl(1)))))),
            elements = emptyList()
        )), parse("filesize:1B", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(EqualFilter(IllustDialect.filesize, listOf(FilterSizeValueImpl(1000)))))),
            elements = emptyList()
        )), parse("filesize:1KB", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(EqualFilter(IllustDialect.filesize, listOf(FilterSizeValueImpl(1000 * 1000)))))),
            elements = emptyList()
        )), parse("filesize:1m", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(EqualFilter(IllustDialect.filesize, listOf(FilterSizeValueImpl(1000 * 1000 * 1000)))))),
            elements = emptyList()
        )), parse("filesize:1Gb", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(EqualFilter(IllustDialect.filesize, listOf(FilterSizeValueImpl(1000 * 1000 * 1000 * 1000L)))))),
            elements = emptyList()
        )), parse("filesize:1T", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(EqualFilter(IllustDialect.filesize, listOf(FilterSizeValueImpl(1 shl 10)))))),
            elements = emptyList()
        )), parse("filesize:1kib", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(EqualFilter(IllustDialect.filesize, listOf(FilterSizeValueImpl(1 shl 20)))))),
            elements = emptyList()
        )), parse("filesize:1MiB", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(EqualFilter(IllustDialect.filesize, listOf(FilterSizeValueImpl(1 shl 30)))))),
            elements = emptyList()
        )), parse("filesize:1Gib", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(EqualFilter(IllustDialect.filesize, listOf(FilterSizeValueImpl(1L shl 40)))))),
            elements = emptyList()
        )), parse("filesize:1tiB", IllustDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            TypeCastError("1", TypeCastError.Type.SIZE, 9, 10)
        )), parse("filesize:1", IllustDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            TypeCastError("1PB", TypeCastError.Type.SIZE, 9, 12)
        )), parse("filesize:1PB", IllustDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            TypeCastError("1ki", TypeCastError.Type.SIZE, 9, 12)
        )), parse("filesize:1ki", IllustDialect::class))
    }

    @Test
    fun testFilterRelation() {
        //错误的关系或值类型
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            UnsupportedFilterValueType("ID", ValueType.SORT_LIST, 4, 7)
        )), parse("id: 1,2", IllustDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            FilterValueRequired("ID", 0, 2)
        )), parse("id", IllustDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            FilterValueNotRequired("FAVORITE", 0, 10)
        )), parse("favorite:1", IllustDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            UnsupportedFilterValueTypeOfRelation("ID", ValueType.RANGE, ">", 3, 8)
        )), parse("id>[1,2]", IllustDialect::class))
        assertEquals(AnalysisResult<QueryPlan, SemanticError<*>>(null, errors = listOf(
            UnsupportedFilterRelationSymbol("ID", "~", 2, 3)
        )), parse("id~1", IllustDialect::class))
        //集合类型
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(MatchFilter(IllustDialect.description, listOf(FilterStringValueImpl("a"), FilterStringValueImpl("b"), FilterStringValueImpl("c")))))),
            elements = emptyList()
        )), parse("desc:{a, b, c}", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(
                EqualFilter(IllustDialect.id, listOf(FilterPatternNumberValueImpl(124))),
                MatchFilter(IllustDialect.id, listOf(FilterPatternNumberValueImpl("28*")))
            ))),
            elements = emptyList()
        )), parse("id:{124, 28*}", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(
                EqualFilter(IllustDialect.id, listOf(FilterPatternNumberValueImpl(124))),
                RangeFilter(IllustDialect.id, FilterPatternNumberValueImpl(280), FilterPatternNumberValueImpl(290), includeBegin = true, includeEnd = false)
            ))),
            elements = emptyList()
        )), parse("id:{124, 28?}", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = emptyList(),
            elements = emptyList()
        )), parse("desc:{}", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(EqualFilter(IllustDialect.id, listOf(FilterPatternNumberValueImpl(1), FilterPatternNumberValueImpl(2)))))),
            elements = emptyList()
        )), parse("desc:{}|id:{1,2}", IllustDialect::class))
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(MatchFilter(IllustDialect.description, listOf(FilterStringValueImpl("a"), FilterStringValueImpl("b"), FilterStringValueImpl("c")))))),
            elements = emptyList()
        )), parse("desc:{a, b, c}|desc:{}", IllustDialect::class))
        //区间类型
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(
                RangeFilter(IllustDialect.id, FilterPatternNumberValueImpl(5), FilterPatternNumberValueImpl(10), includeBegin = true, includeEnd = true)
            ))),
            elements = emptyList()
        )), parse("id:[5, 10]", IllustDialect::class))
        //关系运算
        assertEquals(AnalysisResult(QueryPlan(
            orders = emptyList(),
            filters = listOf(UnionFilters(listOf(
                RangeFilter(IllustDialect.id, FilterPatternNumberValueImpl(8), null, includeBegin = true, includeEnd = false)
            ))),
            elements = emptyList()
        )), parse("id>=8", IllustDialect::class))
    }

    @Test
    fun testPerformance() {
        //预热
        parseAndTestPerformance("""hello""", IllustDialect::class)
        //高复杂度
        parseAndTestPerformance("""[@fav|like][updating] -$'rather'.`than`.x rating:[A, C)|D~E|G~+|rating>=G ext:{jpg, jpeg} ^id:4396???? order:+partition,-^id""", IllustDialect::class)
        //中复杂度
        parseAndTestPerformance("""[@fav|like][updating] -$'rather'.`than`.x ^id:4396???? order:+partition,-^id""", IllustDialect::class)
        //低复杂度
        parseAndTestPerformance("""[updating] $'rather' order:+partition""", IllustDialect::class)
    }

    private fun parseAndTestPerformance(text: String, dialect: KClass<out QueryDialect<*>>) {
        val t1 = System.currentTimeMillis()
        val (lexicalResult) = LexicalAnalyzer.parse(text)
        if(lexicalResult == null) {
            throw RuntimeException("lexical error.")
        }
        val t2 = System.currentTimeMillis()
        println("lexical time cost = ${t2 - t1}ms")
        val (grammarResult) = GrammarAnalyzer.parse(lexicalResult)
        if(grammarResult == null) {
            throw RuntimeException("grammar error.")
        }
        val t3 = System.currentTimeMillis()
        println("grammar time cost = ${t3 - t2}ms")
        val (semanticResult) = SemanticAnalyzer.parse(grammarResult, dialect)
        if(semanticResult == null) {
            throw RuntimeException("semantic error.")
        }
        val t4 = System.currentTimeMillis()
        println("semantic time cost = ${t4 - t3}ms")
        println("sum time cost = ${t4 - t1}ms")
    }

    private fun parse(text: String, dialect: KClass<out QueryDialect<*>>): AnalysisResult<QueryPlan, SemanticError<*>> {
        val (lexicalResult) = LexicalAnalyzer.parse(text)
        if(lexicalResult == null) {
            throw RuntimeException("lexical error.")
        }
        val (grammarResult) = GrammarAnalyzer.parse(lexicalResult)
        if(grammarResult == null) {
            throw RuntimeException("grammar error.")
        }
        return SemanticAnalyzer.parse(grammarResult, dialect)
    }

    private fun authorElementOf(vararg items: MetaString, metaType: MetaType? = null, exclude: Boolean = false) = AuthorElementImpl(items.map { SingleMetaValue(it) }, metaType, exclude)

    private fun topicElementOf(vararg items: MetaAddress, metaType: MetaType? = null, exclude: Boolean = false) = TopicElementImpl(items.map { SimpleMetaValue(it) }, metaType, exclude)

    private fun tagElementOf(vararg items: MetaValue, metaType: MetaType? = null, exclude: Boolean = false) = TagElementImpl(items.toList(), metaType, exclude)

    private fun annotationElementOf(vararg items: MetaString, metaType: MetaType?, exclude: Boolean = false) = AnnotationElement(items.toList(), metaType, exclude)

    private fun metaAnnotationElementOf(vararg items: MetaString, exclude: Boolean = false) = AnnotationElementForMeta(items.toList(), exclude)

    private fun sourceElementOf(vararg items: MetaString, exclude: Boolean = false) = SourceTagElement(items.toList(), exclude)

    private fun nameElementOf(vararg items: MetaString, exclude: Boolean = false) = NameElementForMeta(items.toList(), exclude)
}