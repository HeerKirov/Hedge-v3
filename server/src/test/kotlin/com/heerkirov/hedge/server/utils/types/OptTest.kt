package com.heerkirov.hedge.server.utils.types

import kotlin.test.*

class OptTest {
    @Test
    fun test() {
        assertEquals(optOf(1), optOf(1))
        assertNotEquals(undefined(), optOf(1))

        assertTrue { optOf(1).isPresent }
        assertFalse { optOf(1).isUndefined }
        assertTrue { undefined<Nothing>().isUndefined }
        assertFalse { undefined<Nothing>().isPresent }

        assertEquals(1, optOf(1).value)
        assertFailsWith<NullPointerException> { undefined<Any>().value }

        assertEquals(2, optOf(1).unwrap { this + 1 })
        assertFailsWith<NullPointerException> { undefined<Int>().unwrap { } }

        assertEquals(1, optOf(1).unwrapOr { 2 })
        assertEquals(2, undefined<Int>().unwrapOr { 2 })

        assertEquals(optOf(2), optOf(1).runOpt { this + 1 })
        assertEquals(undefined(), undefined<Int>().runOpt { this + 1 })

        assertEquals(optOf(2), optOf(1).letOpt { it + 1 })
        assertEquals(undefined(), undefined<Int>().letOpt { it + 1 })

        assertFailsWith<RuntimeException> { optOf(1).applyOpt { throw RuntimeException() } }
        assertEquals(undefined(), undefined<Nothing>().applyOpt { throw RuntimeException() })

        assertEquals(optOf(1), optOf(1).elseOr { 2 })
        assertEquals(optOf(2), undefined<Int>().elseOr { 2 })
    }
}