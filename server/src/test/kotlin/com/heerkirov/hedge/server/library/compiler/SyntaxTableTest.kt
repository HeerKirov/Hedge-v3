package com.heerkirov.hedge.server.library.compiler

import com.heerkirov.hedge.server.library.compiler.grammar.definintion.KeyNotation
import com.heerkirov.hedge.server.library.compiler.grammar.definintion.SyntaxNotation
import com.heerkirov.hedge.server.library.compiler.grammar.definintion.printSyntaxTable
import com.heerkirov.hedge.server.library.compiler.grammar.definintion.readSyntaxExpression
import com.heerkirov.hedge.server.library.compiler.grammar.syntax.ExpandExpression
import com.heerkirov.hedge.server.library.compiler.grammar.syntax.SyntaxFamilyBuilder
import com.heerkirov.hedge.server.library.compiler.grammar.syntax.SyntaxItem
import com.heerkirov.hedge.server.library.compiler.grammar.syntax.SyntaxTableBuilder
import kotlin.test.Test
import kotlin.test.assertEquals

class SyntaxTableTest {
    @Test
    fun testClosure() {
        val expressions = listOf(
            ExpandExpression(0, null, listOf(KeyNotation.of("E"))),
            ExpandExpression(1, KeyNotation.of("E"), listOf(KeyNotation.of("E"), SyntaxNotation.of("+"), KeyNotation.of("T"))),
            ExpandExpression(2, KeyNotation.of("E"), listOf(KeyNotation.of("T"))),
            ExpandExpression(3, KeyNotation.of("T"), listOf(KeyNotation.of("T"), SyntaxNotation.of("*"), KeyNotation.of("F"))),
            ExpandExpression(4, KeyNotation.of("T"), listOf(KeyNotation.of("F"))),
            ExpandExpression(5, KeyNotation.of("F"), listOf(SyntaxNotation.of("("), KeyNotation.of("E"), SyntaxNotation.of(")"))),
            ExpandExpression(6, KeyNotation.of("F"), listOf(SyntaxNotation.of("id"))),
        )
        val familyBuilder = SyntaxFamilyBuilder(expressions)

        assertEquals(setOf(
            SyntaxItem(expressions[0], 0),
            SyntaxItem(expressions[1], 0),
            SyntaxItem(expressions[2], 0),
            SyntaxItem(expressions[3], 0),
            SyntaxItem(expressions[4], 0),
            SyntaxItem(expressions[5], 0),
            SyntaxItem(expressions[6], 0),
        ), familyBuilder.closure(setOf(SyntaxItem(expressions[0], 0))))

        assertEquals(setOf(
            SyntaxItem(expressions[5], 1),
            SyntaxItem(expressions[1], 0),
            SyntaxItem(expressions[2], 0),
            SyntaxItem(expressions[3], 0),
            SyntaxItem(expressions[4], 0),
            SyntaxItem(expressions[5], 0),
            SyntaxItem(expressions[6], 0),
        ), familyBuilder.closure(setOf(SyntaxItem(expressions[5], 1))))

        assertEquals(setOf(
            SyntaxItem(expressions[1], 2),
            SyntaxItem(expressions[3], 0),
            SyntaxItem(expressions[4], 0),
            SyntaxItem(expressions[5], 0),
            SyntaxItem(expressions[6], 0),
        ), familyBuilder.closure(setOf(SyntaxItem(expressions[1], 2))))
    }

    @Test
    fun testGoto() {
        val expressions = listOf(
            ExpandExpression(0, null, listOf(KeyNotation.of("E"))),
            ExpandExpression(1, KeyNotation.of("E"), listOf(KeyNotation.of("E"), SyntaxNotation.of("+"), KeyNotation.of("T"))),
            ExpandExpression(2, KeyNotation.of("E"), listOf(KeyNotation.of("T"))),
            ExpandExpression(3, KeyNotation.of("T"), listOf(KeyNotation.of("T"), SyntaxNotation.of("*"), KeyNotation.of("F"))),
            ExpandExpression(4, KeyNotation.of("T"), listOf(KeyNotation.of("F"))),
            ExpandExpression(5, KeyNotation.of("F"), listOf(SyntaxNotation.of("("), KeyNotation.of("E"), SyntaxNotation.of(")"))),
            ExpandExpression(6, KeyNotation.of("F"), listOf(SyntaxNotation.of("id"))),
        )
        val familyBuilder = SyntaxFamilyBuilder(expressions)

        val i0 = familyBuilder.closure(setOf(SyntaxItem(expressions[0], 0)))

        assertEquals(setOf(
            SyntaxItem(expressions[0], 1),
            SyntaxItem(expressions[1], 1),
        ), familyBuilder.goto(i0, KeyNotation.of("E")))

        assertEquals(setOf(
            SyntaxItem(expressions[2], 1),
            SyntaxItem(expressions[3], 1),
        ), familyBuilder.goto(i0, KeyNotation.of("T")))

        assertEquals(setOf(
            SyntaxItem(expressions[4], 1),
        ), familyBuilder.goto(i0, KeyNotation.of("F")))

        assertEquals(setOf(
            SyntaxItem(expressions[6], 1),
        ), familyBuilder.goto(i0, SyntaxNotation.of("id")))

        assertEquals(setOf(
            SyntaxItem(expressions[5], 1),
            SyntaxItem(expressions[1], 0),
            SyntaxItem(expressions[2], 0),
            SyntaxItem(expressions[3], 0),
            SyntaxItem(expressions[4], 0),
            SyntaxItem(expressions[5], 0),
            SyntaxItem(expressions[6], 0),
        ), familyBuilder.goto(i0, SyntaxNotation.of("(")))

        assertEquals(setOf(
            SyntaxItem(expressions[1], 2),
            SyntaxItem(expressions[3], 0),
            SyntaxItem(expressions[4], 0),
            SyntaxItem(expressions[5], 0),
            SyntaxItem(expressions[6], 0),
        ), familyBuilder.goto(setOf(
            SyntaxItem(expressions[1], 1),
            SyntaxItem(expressions[2], 1),
        ), SyntaxNotation.of("+")))
    }

    @Test
    fun testSyntaxTable() {
        val testExpressions = """
            E -> E + T
            E -> T
            T -> T * F
            T -> F
            F -> ( E )
            F -> id
        """.trimIndent()
        val syntaxExpressions = readSyntaxExpression(testExpressions)
        val syntaxTable = SyntaxTableBuilder.parse(syntaxExpressions)
        assertEquals("""
            6  (   )   *   +   id  ∑   E  F  T 
            0  s4  _   _   _   s5  _   1  3  2 
            1  _   _   _   s6  _   acc _  _  _ 
            2  _   r2  s7  r2  _   r2  _  _  _ 
            3  _   r4  r4  r4  _   r4  _  _  _ 
            4  s4  _   _   _   s5  _   8  3  2 
            5  _   r6  r6  r6  _   r6  _  _  _ 
            6  s4  _   _   _   s5  _   _  3  9 
            7  s4  _   _   _   s5  _   _  10 _ 
            8  _   s11 _   s6  _   _   _  _  _ 
            9  _   r1  s7  r1  _   r1  _  _  _ 
            10 _   r3  r3  r3  _   r3  _  _  _ 
            11 _   r5  r5  r5  _   r5  _  _  _ 
        """.trimIndent(), printSyntaxTable(syntaxTable))
    }
}