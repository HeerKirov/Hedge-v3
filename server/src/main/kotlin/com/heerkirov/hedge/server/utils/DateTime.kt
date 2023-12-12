package com.heerkirov.hedge.server.utils

import java.time.*
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

/**
 * 提供时间日期相关内容的统一处理。
 * 在此项目中，对于时间使用规范，做出统一规定：
 *  - 在数据库中，所有时间都使用不含时区的LocalDateTime/TIMESTAMP格式存储，存储的时间是UTC时区的时间戳。
 *  - 对外暴露的接口都使用dateTimeFormat格式定义的标准时间戳，同样不含时区信息，基于UTC时区，这样前端可以最高效地转换利用。
 *  - 在项目内，总是使用基于用户当前时区的ZonedDateTime处理业务逻辑。在使用到时，利用此工具库提供的转换函数。
 */
object DateTime {
    private val DATE_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd")

    /**
     * 将数值毫秒解析为时刻。
     */
    fun Long.toInstant(): Instant = Instant.ofEpochMilli(this)

    /**
     * 将时刻转换为带有时区的时间，且使用的时区为当前系统时区。
     */
    fun Instant.toSystemZonedTime(): ZonedDateTime = this.atZone(ZoneId.systemDefault())

    /**
     * 将字符串解析为yyyy-MM-dd的日期格式。
     */
    fun String.parseDate(): LocalDate = LocalDate.parse(this, DATE_FORMAT)

    /**
     * 使用偏移量(小时)，将orderTime转换为对应的partitionTime。
     */
    fun Instant.toPartitionDate(timeOffsetHour: Int?): LocalDate {
        return this.runIf(timeOffsetHour != null && timeOffsetHour != 0) { this.minus(timeOffsetHour!!.toLong(), ChronoUnit.HOURS) }.toSystemZonedTime().toLocalDate()
    }
}
