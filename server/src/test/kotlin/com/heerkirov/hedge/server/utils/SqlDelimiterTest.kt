package com.heerkirov.hedge.server.utils

import kotlin.test.Test
import kotlin.test.assertEquals

class SqlDelimiterTest {
    @Test
    fun test() {
        assertEquals(
            listOf("SELECT * FROM TEST", "SELECT count(1)"),
            SqlDelimiter.splitByDelimiter("""
                SELECT * FROM TEST;
                SELECT count(1);
            """.trimIndent()))

        assertEquals(
            listOf("SELECT  * FROM TEST", "SELECT count(1)"),
            SqlDelimiter.splitByDelimiter("""
                SELECT/*hello?*/ * FROM TEST;
                --oh
                SELECT count(1);--ok
                --r
            """.trimIndent()))

        assertEquals(
            listOf("SELECT *\nFROM\nTEST", "SELECT count(1)"),
            SqlDelimiter.splitByDelimiter("""
                SELECT *
                FROM
                TEST;SELECT count(1);
            """.trimIndent()))
    }
}