package com.heerkirov.hedge.server.utils

import com.heerkirov.hedge.server.utils.DateTime.asUTCTime
import com.heerkirov.hedge.server.utils.DateTime.asZonedTime
import com.heerkirov.hedge.server.utils.DateTime.parseDate
import com.heerkirov.hedge.server.utils.DateTime.parseDateTime
import com.heerkirov.hedge.server.utils.DateTime.toDateString
import com.heerkirov.hedge.server.utils.DateTime.toDateTimeString
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.ZonedDateTime
import java.time.format.DateTimeParseException
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith

class DateTimeTest {
    @Test
    fun testParse() {
        assertEquals(LocalDateTime.of(2020, 12, 8, 0, 0, 0), "2020-12-08T00:00:00Z".parseDateTime())
        assertFailsWith<DateTimeParseException> { "2020-12-08 00:00:00".parseDateTime() }
        assertEquals(LocalDate.of(2020, 12, 8), "2020-12-08".parseDate())
        assertFailsWith<DateTimeParseException> { "2020-12-08T00:00:00Z".parseDate() }
    }

    @Test
    fun testZoneTranslate() {
        assertEquals(
            ZonedDateTime.of(2020, 12, 8, 8, 0, 0, 0, ZoneId.of("Asia/Shanghai")),
            LocalDateTime.of(2020, 12, 8, 0, 0, 0).asZonedTime(ZoneId.of("Asia/Shanghai")))
        assertEquals(
            LocalDateTime.of(2020, 12, 7, 16, 0, 0),
            ZonedDateTime.of(2020, 12, 8, 0, 0, 0, 0, ZoneId.of("Asia/Shanghai")).asUTCTime())
    }

    @Test
    fun testFormatToString() {
        assertEquals("2020-12-08T08:00:00Z", LocalDateTime.of(2020, 12, 8, 8, 0, 0).toDateTimeString())
        assertEquals("2020-12-08", LocalDate.of(2020, 12, 8).toDateString())
    }
}