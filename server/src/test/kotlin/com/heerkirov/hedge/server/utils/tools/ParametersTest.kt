package com.heerkirov.hedge.server.utils.tools

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class ParametersTest {
    @Test
    fun test() {
        val p = Parameters(arrayOf("--arg1", "v", "--arg2", "2", "--flag", "--w", "-r"))
        assertTrue { p.contain("--arg1") }
        assertTrue { p.contain("--arg2") }
        assertTrue { p.contain("--flag") }
        assertTrue { p.contain("--w") }
        assertTrue { p.contain("-r") }
        assertEquals("v", p["--arg1"])
        assertEquals("2", p["--arg2"])
        assertEquals("--w", p["--flag"])
        assertEquals("-r", p["--w"])
    }
}