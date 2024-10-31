package com.heerkirov.hedge.server.utils

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class PrimitiveTest {
    @Test
    fun testApplyIf() {
        assertFailsWith<RuntimeException> { 1.applyIf(true) { throw RuntimeException() } }
        assertEquals(1, 1.applyIf(false) { throw RuntimeException() })
    }

    @Test
    fun testRunIf() {
        assertEquals(2, 1.runIf(true) { 2 })
        assertEquals(1, 1.runIf(false) { 2 })
    }

    @Test
    fun testMap() {
        assertEquals(listOf(3, 2, 5), iterator { yield(2); yield(1); yield(4) }.map { it + 1 })
    }

    @Test
    fun testEachTwo() {
        run {
            val output = mutableListOf<Pair<Int, Int>>()
            emptyList<Int>().forEachTwo { a, b -> output += a to b }
            assertEquals(emptyList(), output)
        }

        run {
            val output = mutableListOf<Pair<Int, Int>>()
            listOf(1).forEachTwo { a, b -> output += a to b }
            assertEquals(emptyList(), output)
        }

        run {
            val output = mutableListOf<Pair<Int, Int>>()
            listOf(1, 2).forEachTwo { a, b -> output += a to b }
            assertEquals(listOf(1 to 2), output)
        }

        run {
            val output = mutableListOf<Pair<Int, Int>>()
            listOf(1, 2, 3).forEachTwo { a, b -> output += a to b }
            assertEquals(listOf(1 to 2, 1 to 3, 2 to 3), output)
        }

        run {
            val output = mutableListOf<Pair<Int, Int>>()
            listOf(1, 2, 3, 4).forEachTwo { a, b -> output += a to b }
            assertEquals(listOf(1 to 2, 1 to 3, 1 to 4, 2 to 3, 2 to 4, 3 to 4), output)
        }
    }

    @Test
    fun testSplitWhen() {
        assertEquals(listOf(listOf(1, 2), listOf(4, 5), listOf(9, 10, 11)), listOf(1, 2, 4, 5, 9, 10, 11).splitWhen { a, b -> b - a > 1 })
        assertEquals(listOf(listOf(1), listOf(3), listOf(5)), listOf(1, 3, 5).splitWhen { a, b -> b - a > 1 })
        assertEquals(listOf(listOf(1), listOf(3), listOf(5, 6, 7)), listOf(1, 3, 5, 6, 7).splitWhen { a, b -> b - a > 1 })
        assertEquals(listOf(listOf(1, 2, 3, 4)), listOf(1, 2, 3, 4).splitWhen { a, b -> b - a > 1 })
        assertEquals(emptyList(), emptyList<Int>().splitWhen { a, b -> b - a > 1 })
    }
}