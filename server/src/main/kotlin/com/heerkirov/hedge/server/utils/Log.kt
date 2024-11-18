package com.heerkirov.hedge.server.utils

import ch.qos.logback.classic.LoggerContext
import ch.qos.logback.classic.encoder.PatternLayoutEncoder
import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.core.rolling.RollingFileAppender
import ch.qos.logback.core.rolling.TimeBasedRollingPolicy
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import java.io.File
import java.io.FileInputStream
import java.io.FileNotFoundException
import java.io.InputStream

fun registerRollingFileLog(serverDir: String) {
    val ctx = LoggerFactory.getILoggerFactory() as LoggerContext
    val logger = ctx.getLogger(Logger.ROOT_LOGGER_NAME)

    val fileAppender = RollingFileAppender<ILoggingEvent>().also {
        it.context = ctx
        it.name = "FILE"
        it.file = "$serverDir/logs/server.log"
        it.rollingPolicy = TimeBasedRollingPolicy<ILoggingEvent>().apply {
            context = ctx
            fileNamePattern = "$serverDir/logs/server.%d{yyyy-MM-dd}.log"
            maxHistory = 30
            setParent(it)
            start()
        }
        it.encoder = object : PatternLayoutEncoder() {
            init {
                setContext(ctx)
                pattern = "%d{yyyy-MM-dd HH:mm:ss} %-5level %logger{36} - %msg%n"
                start()
            }
        }
        it.start()
    }

    logger.addAppender(fileAppender)
}

fun listLogFiles(serverDir: String): List<String> {
    return File("$serverDir/logs").listFiles { file: File -> file.isFile && file.extension == "log" }?.map { it.name }?.sorted() ?: emptyList()
}

fun readLogFile(serverDir: String, logFileName: String, offset: Long = 0): Pair<InputStream, Long> {
    val filepath = "$serverDir/logs/$logFileName"
    val file = File(filepath)
    if (!file.exists()) throw FileNotFoundException()

    if(offset >= file.length()) return Pair(InputStream.nullInputStream(), 0L)

    val inputStream = FileInputStream(file)
    inputStream.skip(offset)

    val newOffset = file.length()

    return Pair(inputStream, newOffset)
}