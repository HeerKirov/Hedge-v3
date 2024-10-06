package com.heerkirov.hedge.server.utils

import kotlin.test.Test
import kotlin.test.assertEquals

class StrTemplateTest {
    @Test
    fun testSplitSQL() {
        assertEquals(
            listOf("SELECT * FROM TEST", "SELECT count(1)"),
            StrTemplate.splitSQL("""
                SELECT * FROM TEST;
                SELECT count(1);
            """.trimIndent()))

        assertEquals(
            listOf("SELECT  * FROM TEST", "SELECT count(1)"),
            StrTemplate.splitSQL("""
                SELECT/*hello?*/ * FROM TEST;
                --oh
                SELECT count(1);--ok
                --r
            """.trimIndent()))

        assertEquals(
            listOf("SELECT *\nFROM\nTEST", "SELECT count(1)"),
            StrTemplate.splitSQL("""
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
            StrTemplate.render("""
                -- comment
                UPDATE partition SET `date` = `date` + ${'$'}{OFFSET} WHERE TRUE;
            """.trimIndent(), mapOf(
                "OFFSET" to "12800"
            ))
        )

        assertEquals(
            "-- comment\nUPDATE partition SET `date` = `date` + 12800 WHERE TRUE;",
            StrTemplate.render("\${COMMENT}\nUPDATE partition SET `date` = `date` + \${OFFSET} WHERE TRUE;", mapOf(
                "OFFSET" to "12800",
                "COMMENT" to "-- comment"
            ))
        )

        assertEquals(
            "UPDATE partition SET `date` = `date` + 12800 WHERE TRUE;\n-- comment",
            StrTemplate.render("UPDATE partition SET `date` = `date` + \${OFFSET} WHERE TRUE;\n\${COMMENT}", mapOf(
                "OFFSET" to "12800",
                "COMMENT" to "-- comment"
            ))
        )
    }
}