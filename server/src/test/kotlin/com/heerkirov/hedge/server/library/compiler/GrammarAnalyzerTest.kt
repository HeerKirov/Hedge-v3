package com.heerkirov.hedge.server.library.compiler

import com.heerkirov.hedge.server.library.compiler.grammar.DuplicatedAnnotationPrefix
import com.heerkirov.hedge.server.library.compiler.grammar.GrammarAnalyzer
import com.heerkirov.hedge.server.library.compiler.grammar.UnexpectedToken
import com.heerkirov.hedge.server.library.compiler.grammar.semantic.*
import com.heerkirov.hedge.server.library.compiler.grammar.semantic.Annotation
import com.heerkirov.hedge.server.library.compiler.grammar.semantic.Col
import com.heerkirov.hedge.server.library.compiler.lexical.LexicalAnalyzer
import com.heerkirov.hedge.server.library.compiler.utils.AnalysisResult
import com.heerkirov.hedge.server.library.compiler.utils.GrammarError
import kotlin.test.Test
import kotlin.test.assertEquals

class GrammarAnalyzerTest {
    @Test
    fun testPredicative() {
        //最简单的element - strList
        assertEquals(AnalysisResult(semanticRootOf(0, 5,
            sequenceItemOf(0, 5, minus = false, source = false,
                elementOf(0, 5, null,
                    sfpOf(0, 5,
                        strListOf(0, 5, strOf("hello", Str.Type.RESTRICTED, 0, 5))
                    )
                )
            )
        )), parse("hello"))
        //基本主系表和串列表
        assertEquals(AnalysisResult(semanticRootOf(0, 13,
            sequenceItemOf(0, 13, minus = false, source = false,
                elementOf(0, 13, null,
                    sfpOf(0, 13,
                        strListOf(0, 5, strOf("a", Str.Type.RESTRICTED, 0, 1), strOf("b", Str.Type.DOUBLE_QUOTES, 2, 5)),
                        familyOf(5, 6, ":"),
                        strListOf(6, 13, strOf("b", Str.Type.APOSTROPHE, 6 , 9),  strOf("c", Str.Type.BACKTICKS, 10, 13))
                    )
                )
            )
        )), parse("a.\"b\":'b'.`c`"))
        //排序列表
        assertEquals(AnalysisResult(semanticRootOf(0, 14,
            sequenceItemOf(0, 14, minus = false, source = false,
                elementOf(0, 14, null,
                    sfpOf(0, 14,
                        strListOf(0, 5, strOf("order", Str.Type.RESTRICTED, 0, 5)),
                        familyOf(5, 6, ":"),
                        sortListOf(6, 14,
                            sortItemOf(6, 7, 0, false, strOf("a", Str.Type.RESTRICTED, 6, 7)),
                            sortItemOf(8, 10, -1, false, strOf("b", Str.Type.RESTRICTED, 9, 10)),
                            sortItemOf(11, 14, 1, true, strOf("c", Str.Type.RESTRICTED, 13, 14))
                        )
                    )
                )
            )
        )), parse("order:a,-b,+^c"))
        //只有一个项的排序列表
        assertEquals(AnalysisResult(semanticRootOf(0, 4,
            sequenceItemOf(0, 4, minus = false, source = false,
                elementOf(0, 4, null,
                    sfpOf(0, 4,
                        strListOf(0, 1, strOf("a", Str.Type.RESTRICTED, 0, 1)),
                        familyOf(1, 2, ":"),
                        sortListOf(2, 4,
                            sortItemOf(2, 4, 1, false, strOf("b", Str.Type.RESTRICTED, 3, 4))
                        )
                    )
                )
            )
        )), parse("a:+b"))
        assertEquals(AnalysisResult(semanticRootOf(0, 5,
            sequenceItemOf(0, 5, minus = false, source = false,
                elementOf(0, 5, null,
                    sfpOf(0, 5,
                        strListOf(0, 1, strOf("a", Str.Type.RESTRICTED, 0, 1)),
                        familyOf(1, 2, ":"),
                        sortListOf(2, 5,
                            sortItemOf(2, 5, -1, true, strOf("b", Str.Type.RESTRICTED, 4, 5))
                        )
                    )
                )
            )
        )), parse("a:-^b"))
        //区间
        assertEquals(AnalysisResult(semanticRootOf(0, 7,
            sequenceItemOf(0, 7, minus = false, source = false,
                elementOf(0, 7, null,
                    sfpOf(0, 7,
                        strListOf(0, 1, strOf("a", Str.Type.RESTRICTED, 0, 1)),
                        familyOf(1, 2, ":"),
                        rangeOf(2, 7, strOf("1", Str.Type.RESTRICTED, 3, 4), strOf("2", Str.Type.RESTRICTED, 5, 6), includeFrom = true, includeTo = true)
                    )
                )
            )
        )), parse("a:[1,2]"))
        assertEquals(AnalysisResult(semanticRootOf(0, 7,
            sequenceItemOf(0, 7, minus = false, source = false,
                elementOf(0, 7, null,
                    sfpOf(0, 7,
                        strListOf(0, 1, strOf("a", Str.Type.RESTRICTED, 0, 1)),
                        familyOf(1, 2, ":"),
                        rangeOf(2, 7, strOf("1", Str.Type.RESTRICTED, 3, 4), strOf("2", Str.Type.RESTRICTED, 5, 6), includeTo = true)
                    )
                )
            )
        )), parse("a:(1,2]"))
        assertEquals(AnalysisResult(semanticRootOf(0, 7,
            sequenceItemOf(0, 7, minus = false, source = false,
                elementOf(0, 7, null,
                    sfpOf(0, 7,
                        strListOf(0, 1, strOf("a", Str.Type.RESTRICTED, 0, 1)),
                        familyOf(1, 2, ":"),
                        rangeOf(2, 7, strOf("1", Str.Type.RESTRICTED, 3, 4), strOf("2", Str.Type.RESTRICTED, 5, 6), includeFrom = true)
                    )
                )
            )
        )), parse("a:[1,2)"))
        assertEquals(AnalysisResult(semanticRootOf(0, 7,
            sequenceItemOf(0, 7, minus = false, source = false,
                elementOf(0, 7, null,
                    sfpOf(0, 7,
                        strListOf(0, 1, strOf("a", Str.Type.RESTRICTED, 0, 1)),
                        familyOf(1, 2, ":"),
                        rangeOf(2, 7, strOf("1", Str.Type.RESTRICTED, 3, 4), strOf("2", Str.Type.RESTRICTED, 5, 6))
                    )
                )
            )
        )), parse("a:(1,2)"))
        //集合
        assertEquals(AnalysisResult(semanticRootOf(0, 4,
            sequenceItemOf(0, 4, minus = false, source = false,
                elementOf(0, 4, null,
                    sfpOf(0, 4,
                        strListOf(0, 1, strOf("a", Str.Type.RESTRICTED, 0, 1)),
                        familyOf(1, 2, ":"),
                        collectionOf(2, 4)
                    )
                )
            )
        )), parse("a:{}"))
        assertEquals(AnalysisResult(semanticRootOf(0, 5,
            sequenceItemOf(0, 5, minus = false, source = false,
                elementOf(0, 5, null,
                    sfpOf(0, 5,
                        strListOf(0, 1, strOf("a", Str.Type.RESTRICTED, 0, 1)),
                        familyOf(1, 2, ":"),
                        collectionOf(2, 5,
                            strOf("x", Str.Type.RESTRICTED, 3, 4)
                        )
                    )
                )
            )
        )), parse("a:{x}"))
        assertEquals(AnalysisResult(semanticRootOf(0, 7,
            sequenceItemOf(0, 7, minus = false, source = false,
                elementOf(0, 7, null,
                    sfpOf(0, 7,
                        strListOf(0, 1, strOf("a", Str.Type.RESTRICTED, 0, 1)),
                        familyOf(1, 2, ":"),
                        collectionOf(2, 7,
                            strOf("x", Str.Type.RESTRICTED, 3, 4),
                            strOf("y", Str.Type.RESTRICTED, 5, 6),
                        )
                    )
                )
            )
        )), parse("a:{x,y}"))
        assertEquals(AnalysisResult(semanticRootOf(0, 11,
            sequenceItemOf(0, 11, minus = false, source = false,
                elementOf(0, 11, null,
                    sfpOf(0, 11,
                        strListOf(0, 1, strOf("a", Str.Type.RESTRICTED, 0, 1)),
                        familyOf(1, 2, ":"),
                        collectionOf(2, 11,
                            strOf("x", Str.Type.RESTRICTED, 3, 4),
                            strOf("y", Str.Type.RESTRICTED, 5, 6),
                            strOf("z", Str.Type.APOSTROPHE, 7, 10),
                        )
                    )
                )
            )
        )), parse("a:{x,y,'z'}"))
    }

    @Test
    fun testFamily() {
        //测试每种系语
        assertEquals(AnalysisResult(semanticRootOf(0, 3,
            sequenceItemOf(0, 3, minus = false, source = false,
                elementOf(0, 3, null,
                    sfpOf(0, 3,
                        strListOf(0, 1, strOf("a", Str.Type.RESTRICTED, 0, 1)),
                        familyOf(1, 2, ":"),
                        strListOf(2, 3, strOf("b", Str.Type.RESTRICTED, 2, 3))
                    )
                )
            )
        )), parse("a:b"))
        assertEquals(AnalysisResult(semanticRootOf(0, 3,
            sequenceItemOf(0, 3, minus = false, source = false,
                elementOf(0, 3, null,
                    sfpOf(0, 3,
                        strListOf(0, 1, strOf("a", Str.Type.RESTRICTED, 0, 1)),
                        familyOf(1, 2, "~"),
                        strListOf(2, 3, strOf("b", Str.Type.RESTRICTED, 2, 3))
                    )
                )
            )
        )), parse("a~b"))
        assertEquals(AnalysisResult(semanticRootOf(0, 3,
            sequenceItemOf(0, 3, minus = false, source = false,
                elementOf(0, 3, null,
                    sfpOf(0, 3,
                        strListOf(0, 1, strOf("a", Str.Type.RESTRICTED, 0, 1)),
                        familyOf(1, 2, ">"),
                        strListOf(2, 3, strOf("b", Str.Type.RESTRICTED, 2, 3))
                    )
                )
            )
        )), parse("a>b"))
        assertEquals(AnalysisResult(semanticRootOf(0, 3,
            sequenceItemOf(0, 3, minus = false, source = false,
                elementOf(0, 3, null,
                    sfpOf(0, 3,
                        strListOf(0, 1, strOf("a", Str.Type.RESTRICTED, 0, 1)),
                        familyOf(1, 2, "<"),
                        strListOf(2, 3, strOf("b", Str.Type.RESTRICTED, 2, 3))
                    )
                )
            )
        )), parse("a<b"))
        assertEquals(AnalysisResult(semanticRootOf(0, 4,
            sequenceItemOf(0, 4, minus = false, source = false,
                elementOf(0, 4, null,
                    sfpOf(0, 4,
                        strListOf(0, 1, strOf("a", Str.Type.RESTRICTED, 0, 1)),
                        familyOf(1, 3, ">="),
                        strListOf(3, 4, strOf("b", Str.Type.RESTRICTED, 3, 4))
                    )
                )
            )
        )), parse("a>=b"))
        assertEquals(AnalysisResult(semanticRootOf(0, 4,
            sequenceItemOf(0, 4, minus = false, source = false,
                elementOf(0, 4, null,
                    sfpOf(0, 4,
                        strListOf(0, 1, strOf("a", Str.Type.RESTRICTED, 0, 1)),
                        familyOf(1, 3, "<="),
                        strListOf(3, 4, strOf("b", Str.Type.RESTRICTED, 3, 4))
                    )
                )
            )
        )), parse("a<=b"))
        assertEquals(AnalysisResult(semanticRootOf(0, 3,
            sequenceItemOf(0, 3, minus = false, source = false,
                elementOf(0, 3, null,
                    sfpOf(0, 3,
                        strListOf(0, 1, strOf("a", Str.Type.RESTRICTED, 0, 1)),
                        familyOf(1, 3, "~+")
                    )
                )
            )
        )), parse("a~+"))
        assertEquals(AnalysisResult(semanticRootOf(0, 3,
            sequenceItemOf(0, 3, minus = false, source = false,
                elementOf(0, 3, null,
                    sfpOf(0, 3,
                        strListOf(0, 1, strOf("a", Str.Type.RESTRICTED, 0, 1)),
                        familyOf(1, 3, "~-")
                    )
                )
            )
        )), parse("a~-"))
    }

    @Test
    fun testSpace() {
        //测试消除的空格对index的影响
        assertEquals(AnalysisResult(semanticRootOf(0, 5,
            sequenceItemOf(0, 5, minus = false, source = false,
                elementOf(0, 5, null,
                    sfpOf(0, 5,
                        strListOf(0, 1, strOf("a", Str.Type.RESTRICTED, 0, 1)),
                        familyOf(2, 3, ":"),
                        strListOf(4, 5, strOf("b", Str.Type.RESTRICTED, 4, 5))
                    )
                )
            )
        )), parse("a : b"))
        assertEquals(AnalysisResult(semanticRootOf(1, 4,
            sequenceItemOf(1, 4, minus = false, source = false,
                elementOf(1, 4, null,
                    sfpOf(1, 4,
                        strListOf(1, 2, strOf("a", Str.Type.RESTRICTED, 1, 2)),
                        familyOf(2, 3, ":"),
                        strListOf(3, 4, strOf("b", Str.Type.RESTRICTED, 3, 4))
                    )
                )
            )
        )), parse(" a:b "))
    }

    @Test
    fun testElement() {
        //测试元素前缀
        assertEquals(AnalysisResult(semanticRootOf(0, 2,
            sequenceItemOf(0, 2, minus = false, source = false,
                elementOf(0, 2, symbolOf("@", 0, 1),
                    sfpOf(1, 2,
                        strListOf(1, 2, strOf("a", Str.Type.RESTRICTED, 1, 2))
                    )
                )
            )
        )), parse("@a"))
        assertEquals(AnalysisResult(semanticRootOf(0, 2,
            sequenceItemOf(0, 2, minus = false, source = false,
                elementOf(0, 2, symbolOf("#", 0, 1),
                    sfpOf(1, 2,
                        strListOf(1, 2, strOf("b", Str.Type.RESTRICTED, 1, 2))
                    )
                )
            )
        )), parse("#b"))
        assertEquals(AnalysisResult(semanticRootOf(0, 2,
            sequenceItemOf(0, 2, minus = false, source = false,
                elementOf(0, 2, symbolOf("$", 0, 1),
                    sfpOf(1, 2,
                        strListOf(1, 2, strOf("c", Str.Type.RESTRICTED, 1, 2))
                    )
                )
            )
        )), parse("${'$'}c"))
        //测试元素或
        assertEquals(AnalysisResult(semanticRootOf(0, 3,
            sequenceItemOf(0, 3, minus = false, source = false,
                elementOf(0, 3, null,
                    sfpOf(0, 1,
                        strListOf(0, 1, strOf("a", Str.Type.RESTRICTED, 0, 1))
                    ),
                    sfpOf(2, 3,
                        strListOf(2, 3, strOf("b", Str.Type.RESTRICTED, 2, 3))
                    )
                )
            )
        )), parse("a|b"))
        assertEquals(AnalysisResult(semanticRootOf(0, 8,
            sequenceItemOf(0, 8, minus = false, source = false,
                elementOf(0, 8, symbolOf("@", 0, 1),
                    sfpOf(1, 2,
                        strListOf(1, 2, strOf("a", Str.Type.RESTRICTED, 1, 2))
                    ),
                    sfpOf(3, 6,
                        strListOf(3, 6, strOf("b", Str.Type.RESTRICTED, 3, 4), strOf("c", Str.Type.RESTRICTED, 5, 6))
                    ),
                    sfpOf(7, 8,
                        strListOf(7, 8, strOf("d", Str.Type.RESTRICTED, 7, 8))
                    )
                )
            )
        )), parse("@a|b.c|d"))
        //在或项中使用前缀会抛出错误
        assertEquals(AnalysisResult<SemanticRoot, GrammarError<*>>(null, errors = listOf(
            UnexpectedToken("#", expected = listOf("str"), 3)
        )), parse("@a|#b"))
    }

    @Test
    fun testAnnotation() {
        //测试注解
        assertEquals(AnalysisResult(semanticRootOf(0, 3,
            sequenceItemOf(0, 3, minus = false, source = false,
                annotationOf(0, 3, emptyList(),
                    strOf("a", Str.Type.RESTRICTED, 1,2)
                )
            )
        )), parse("[a]"))
        //测试注解或
        assertEquals(AnalysisResult(semanticRootOf(0, 5,
            sequenceItemOf(0, 5, minus = false, source = false,
                annotationOf(0, 5, emptyList(),
                    strOf("a", Str.Type.RESTRICTED, 1,2),
                    strOf("b", Str.Type.RESTRICTED, 3,4)
                )
            )
        )), parse("[a|b]"))
        //注解不能外部或
        assertEquals(AnalysisResult<SemanticRoot, GrammarError<*>>(null, errors = listOf(
            UnexpectedToken("|", expected = listOf(), 3)
        )), parse("[a]|[b]"))
        //测试注解前缀
        assertEquals(AnalysisResult(semanticRootOf(0, 4,
            sequenceItemOf(0, 4, minus = false, source = false,
                annotationOf(0, 4, listOf(symbolOf("@", 1, 2)),
                    strOf("a", Str.Type.RESTRICTED, 2, 3)
                )
            )
        )), parse("[@a]"))
        assertEquals(AnalysisResult(semanticRootOf(0, 7,
            sequenceItemOf(0, 7, minus = false, source = false,
                annotationOf(0, 7, listOf(symbolOf("$", 1, 2), symbolOf("#", 2, 3)),
                    strOf("b", Str.Type.RESTRICTED, 3, 4),
                    strOf("c", Str.Type.RESTRICTED, 5, 6)
                )
            )
        )), parse("[${'$'}#b|c]"))
        //重复前缀会引发警告
        assertEquals(AnalysisResult(semanticRootOf(0, 6,
            sequenceItemOf(0, 6, minus = false, source = false,
                annotationOf(0, 6, listOf(symbolOf("@", 1, 2), symbolOf("#", 2, 3)),
                    strOf("a", Str.Type.RESTRICTED, 4, 5)
                )
            )
        ), warnings = listOf<GrammarError<*>>(DuplicatedAnnotationPrefix("@", 3))), parse("[@#@a]"))
        //注解项不能带有前缀
        assertEquals(AnalysisResult<SemanticRoot, GrammarError<*>>(null, errors = listOf(
            UnexpectedToken("#", expected = listOf(), 4),
            UnexpectedToken("]", expected = listOf(), 6)
        )), parse("[@a|#b]"))
    }

    @Test
    fun testSequenceItem() {
        //测试语句项的属性
        assertEquals(AnalysisResult(semanticRootOf(0, 3,
            sequenceItemOf(0, 3, minus = true, source = false,
                elementOf(2, 3, null,
                    sfpOf(2, 3,
                        strListOf(2, 3, strOf("a", Str.Type.RESTRICTED, 2, 3))
                    )
                )
            )
        )), parse("- a"))
        assertEquals(AnalysisResult(semanticRootOf(0, 2,
            sequenceItemOf(0, 2, minus = false, source = true,
                elementOf(1, 2, null,
                    sfpOf(1, 2,
                        strListOf(1, 2, strOf("a", Str.Type.RESTRICTED, 1, 2))
                    )
                )
            )
        )), parse("^a"))
        assertEquals(AnalysisResult(semanticRootOf(0, 5,
            sequenceItemOf(0, 5, minus = true, source = true,
                annotationOf(2, 5, emptyList(),
                    strOf("x", Str.Type.RESTRICTED, 3, 4)
                )
            )
        )), parse("-^[x]"))
        assertEquals(AnalysisResult(semanticRootOf(0, 7,
            sequenceItemOf(0, 7, minus = true, source = false,
                elementOf(1, 7, symbolOf("#", 1, 2),
                    sfpOf(2, 5,
                        strListOf(2, 3, strOf("a", Str.Type.RESTRICTED, 2, 3)),
                        familyOf(3, 4, ":"),
                        strListOf(4, 5, strOf("x", Str.Type.RESTRICTED, 4, 5)),
                    ),
                    sfpOf(6, 7,
                        strListOf(6, 7, strOf("b", Str.Type.RESTRICTED, 6, 7))
                    )
                )
            )
        )), parse("-#a:x|b"))
        //测试多个语句项
        assertEquals(AnalysisResult(semanticRootOf(0, 3,
            sequenceItemOf(0, 1, minus = false, source = false,
                elementOf(0, 1, null,
                    sfpOf(0, 1,
                        strListOf(0, 1, strOf("a", Str.Type.RESTRICTED, 0, 1))
                    )
                )
            ),
            sequenceItemOf(2, 3, minus = false, source = false,
                elementOf(2, 3, null,
                    sfpOf(2, 3,
                        strListOf(2, 3, strOf("b", Str.Type.RESTRICTED, 2, 3))
                    )
                )
            )
        )), parse("a b"))
        assertEquals(AnalysisResult(semanticRootOf(0, 3,
            sequenceItemOf(0, 1, minus = false, source = false,
                elementOf(0, 1, null,
                    sfpOf(0, 1,
                        strListOf(0, 1, strOf("a", Str.Type.RESTRICTED, 0, 1))
                    )
                )
            ),
            sequenceItemOf(2, 3, minus = false, source = false,
                elementOf(2, 3, null,
                    sfpOf(2, 3,
                        strListOf(2, 3, strOf("b", Str.Type.RESTRICTED, 2, 3))
                    )
                )
            )
        )), parse("a&b"))
        assertEquals(AnalysisResult(semanticRootOf(0, 4,
            sequenceItemOf(0, 1, minus = false, source = false,
                elementOf(0, 1, null,
                    sfpOf(0, 1,
                        strListOf(0, 1, strOf("a", Str.Type.RESTRICTED, 0, 1))
                    )
                )
            ),
            sequenceItemOf(2, 4, minus = true, source = false,
                elementOf(3, 4, null,
                    sfpOf(3, 4,
                        strListOf(3, 4, strOf("b", Str.Type.RESTRICTED, 3, 4))
                    )
                )
            )
        )), parse("a -b"))
    }

    @Test
    fun testExample() {
        //测试几个混合的复杂例子
        assertEquals(AnalysisResult(semanticRootOf(0, 125,
            sequenceItemOf(0, 12, minus = false, source = false,
                annotationOf(0, 12, listOf(symbolOf("@", 1, 2), symbolOf("#", 2, 3)),
                    strOf("fav", Str.Type.RESTRICTED, 3, 6),
                    strOf("like", Str.Type.RESTRICTED, 7, 11),
                )
            ),
            sequenceItemOf(12, 22, minus = false, source = false,
                annotationOf(12, 22, emptyList(),
                    strOf("updating", Str.Type.RESTRICTED, 13, 21)
                )
            ),
            sequenceItemOf(23, 42, minus = true, source = false,
                elementOf(24, 42, symbolOf("$", 24, 25),
                    sfpOf(25, 42,
                        strListOf(25, 42, strOf("rather", Str.Type.APOSTROPHE, 25, 33), strOf("than", Str.Type.BACKTICKS, 34, 40), strOf("x", Str.Type.RESTRICTED, 41, 42))
                    )
                )
            ),
            sequenceItemOf(43, 74, minus = false, source = false,
                elementOf(43, 74, null,
                    sfpOf(43, 56,
                        strListOf(43, 49, strOf("rating", Str.Type.RESTRICTED, 43, 49)),
                        familyOf(49, 50, ":"),
                        rangeOf(50, 56, strOf("A", Str.Type.RESTRICTED, 51, 52), strOf("C", Str.Type.RESTRICTED, 54, 55), includeFrom = true)
                    ),
                    sfpOf(57, 60,
                        strListOf(57, 58, strOf("D", Str.Type.RESTRICTED, 57, 58)),
                        familyOf(58, 59, "~"),
                        strListOf(59, 60, strOf("E", Str.Type.RESTRICTED, 59, 60))
                    ),
                    sfpOf(61, 64,
                        strListOf(61, 62, strOf("G", Str.Type.RESTRICTED, 61, 62)),
                        familyOf(62, 64, "~+")
                    ),
                    sfpOf(65, 74,
                        strListOf(65, 71, strOf("rating", Str.Type.RESTRICTED, 65, 71)),
                        familyOf(71, 73, ">="),
                        strListOf(73, 74, strOf("G", Str.Type.RESTRICTED, 73, 74))
                    ),
                )
            ),
            sequenceItemOf(75, 90, minus = false, source = false,
                elementOf(75, 90, null,
                    sfpOf(75, 90,
                        strListOf(75, 78, strOf("ext", Str.Type.RESTRICTED, 75, 78)),
                        familyOf(78, 79, ":"),
                        collectionOf(79, 90,
                            strOf("jpg", Str.Type.RESTRICTED, 80, 83),
                            strOf("jpeg", Str.Type.RESTRICTED, 85, 89)
                        )
                    )
                )
            ),
            sequenceItemOf(91, 103, minus = false, source = true,
                elementOf(92, 103, null,
                    sfpOf(92, 103,
                        strListOf(92, 94, strOf("id", Str.Type.RESTRICTED, 92, 94)),
                        familyOf(94, 95, ":"),
                        strListOf(95, 103, strOf("4396????", Str.Type.RESTRICTED, 95, 103))
                    )
                )
            ),
            sequenceItemOf(104, 125, minus = false, source = false,
                elementOf(104, 125, null,
                    sfpOf(104, 125,
                        strListOf(104, 109, strOf("order", Str.Type.RESTRICTED, 104, 109)),
                        familyOf(109, 110, ":"),
                        sortListOf(110, 125,
                            sortItemOf(110, 120, 1, source = false, strOf("partition", Str.Type.RESTRICTED, 111, 120)),
                            sortItemOf(121, 125, -1, source = true, strOf("id", Str.Type.RESTRICTED, 123, 125))
                        )
                    )
                )
            ),
        )), parse("""[@#fav|like][updating] -$'rather'.`than`.x rating:[A, C)|D~E|G~+|rating>=G ext:{jpg, jpeg} ^id:4396???? order:+partition,-^id"""))
    }

    private fun parse(text: String): AnalysisResult<SemanticRoot, GrammarError<*>> {
        val lexicalResult = LexicalAnalyzer.parse(text)
        return GrammarAnalyzer.parse(lexicalResult.result!!)
    }

    private fun semanticRootOf(beginIndex: Int, endIndex: Int, vararg items: SequenceItem) = SemanticRoot(items.toList(), beginIndex, endIndex)

    private fun sequenceItemOf(beginIndex: Int, endIndex: Int, minus: Boolean = false, source: Boolean = false, body: SequenceBody) = SequenceItem(minus, source, body, beginIndex, endIndex)

    private fun elementOf(beginIndex: Int, endIndex: Int, prefix: Symbol? = null, vararg items: SFP) = Element(prefix, items.toList(), beginIndex, endIndex)

    private fun annotationOf(beginIndex: Int, endIndex: Int, prefixes: List<Symbol> = emptyList(), vararg items: Str) = Annotation(prefixes, items.toList(), beginIndex, endIndex)

    private fun sfpOf(beginIndex: Int, endIndex: Int, subject: Subject, family: Family? = null, predicative: Predicative? = null) = SFP(subject, family, predicative, beginIndex, endIndex)

    private fun familyOf(beginIndex: Int, endIndex: Int, value: String) = Family(value, beginIndex, endIndex)

    private fun strListOf(beginIndex: Int, endIndex: Int, vararg items: Str) = StrListImpl(items.toMutableList(), beginIndex, endIndex)

    private fun collectionOf(beginIndex: Int, endIndex: Int, vararg items: Str) = Col(items.toList(), beginIndex, endIndex)

    private fun rangeOf(beginIndex: Int, endIndex: Int, from: Str, to: Str, includeFrom: Boolean = false, includeTo: Boolean = false) = Range(from, to, includeFrom, includeTo, beginIndex, endIndex)

    private fun sortListOf(beginIndex: Int, endIndex: Int, vararg items: SortItem) = SortListImpl(items.toMutableList(), beginIndex, endIndex)

    private fun sortItemOf(beginIndex: Int, endIndex: Int, direction: Int, source: Boolean, value: Str) = SortItem(value, source, direction, beginIndex, endIndex)

    private fun strOf(value: String, type: Str.Type, beginIndex: Int, endIndex: Int) = Str(value, type, beginIndex, endIndex)

    private fun symbolOf(value: String, beginIndex: Int, endIndex: Int) = Symbol(value, beginIndex, endIndex)
}