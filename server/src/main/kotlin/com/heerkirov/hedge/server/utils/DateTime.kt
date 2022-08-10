package com.heerkirov.hedge.server.utils

import java.time.*
import java.time.format.DateTimeFormatter

/**
 * 提供时间日期相关内容的统一处理。
 * 在此项目中，对于时间使用规范，做出统一规定：
 *  - 在数据库中，所有时间都使用不含时区的LocalDateTime/TIMESTAMP格式存储，存储的时间是UTC时区的时间戳。
 *  - 对外暴露的接口都使用dateTimeFormat格式定义的标准时间戳，同样不含时区信息，基于UTC时区，这样前端可以最高效地转换利用。
 *  - 在项目内，总是使用基于用户当前时区的ZonedDateTime处理业务逻辑。在使用到时，利用此工具库提供的转换函数。
 */
object DateTime {
    private val ZONE_UTC = ZoneId.of("UTC")
    private val DATETIME_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss[.SSS]'Z'")
    private val DATE_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")

    /**
     * 将毫秒时间戳解析为时间。
     */
    fun Long.parseDateTime(): LocalDateTime = LocalDateTime.ofInstant(Instant.ofEpochMilli(this), ZONE_UTC)

    /**
     * 将字符串解析为yyyy-MM-ddTHH:mm:ssZ的时间格式。
     */
    fun String.parseDateTime(): LocalDateTime = LocalDateTime.parse(this, DATETIME_FORMAT)

    /**
     * 将字符串解析为yyyy-MM-dd的日期格式。
     */
    fun String.parseDate(): LocalDate = LocalDate.parse(this, DATE_FORMAT)

    /**
     * 获得不包含时区的当前UTC时间。
     */
    fun now(): LocalDateTime = LocalDateTime.now(Clock.systemUTC())

    /**
     * 获得当前系统的默认时区。
     */
    private fun zone(): ZoneId = ZoneId.systemDefault()

    /**
     * 将UTC时间转换为目标时区的时间。
     */
    fun LocalDateTime.asZonedTime(zoneId: ZoneId): ZonedDateTime = this.atZone(ZONE_UTC).withZoneSameInstant(zoneId)

    /**
     * 将UTC时间转换为当前系统时区的时间。
     */
    fun LocalDateTime.asZonedTime(): ZonedDateTime = asZonedTime(zone())

    /**
     * 将目标时区时间转换为UTC时间。
     */
    fun ZonedDateTime.asUTCTime(): LocalDateTime = this.withZoneSameInstant(ZoneId.of("UTC")).toLocalDateTime()

    /**
     * 将时间格式化为yyyy-MM-ddThh:mm:ssZ。
     */
    fun LocalDateTime.toDateTimeString(): String = format(DATETIME_FORMAT)

    /**
     * 将日期格式化为yyyy-MM-dd。
     */
    fun LocalDate.toDateString(): String = format(DATE_FORMAT)

    /**
     * 将时间转换为时间戳。
     */
    fun LocalDateTime.toMillisecond(): Long = toInstant(ZoneOffset.UTC).toEpochMilli()
}
