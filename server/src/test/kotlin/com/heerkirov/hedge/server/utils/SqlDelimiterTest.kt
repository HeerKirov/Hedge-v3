package com.heerkirov.hedge.server.utils

import kotlin.test.Test
import kotlin.test.assertEquals

class SqlDelimiterTest {
    @Test
    fun testSplitByDelimiter() {
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

    @Test
    fun testRender() {
        assertEquals(
            """
                -- comment
                UPDATE partition SET `date` = `date` + 12800 WHERE TRUE;
            """.trimIndent(),
            SqlDelimiter.render("""
                -- comment
                UPDATE partition SET `date` = `date` + ${'$'}{OFFSET} WHERE TRUE;
            """.trimIndent(), mapOf(
                "OFFSET" to "12800"
            ))
        )

        assertEquals(
            "-- comment\nUPDATE partition SET `date` = `date` + 12800 WHERE TRUE;",
            SqlDelimiter.render("\${COMMENT}\nUPDATE partition SET `date` = `date` + \${OFFSET} WHERE TRUE;", mapOf(
                "OFFSET" to "12800",
                "COMMENT" to "-- comment"
            ))
        )

        assertEquals(
            "UPDATE partition SET `date` = `date` + 12800 WHERE TRUE;\n-- comment",
            SqlDelimiter.render("UPDATE partition SET `date` = `date` + \${OFFSET} WHERE TRUE;\n\${COMMENT}", mapOf(
                "OFFSET" to "12800",
                "COMMENT" to "-- comment"
            ))
        )
    }
}