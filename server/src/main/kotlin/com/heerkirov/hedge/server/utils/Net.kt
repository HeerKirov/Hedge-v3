package com.heerkirov.hedge.server.utils

import org.slf4j.LoggerFactory
import java.net.ServerSocket

object Net {
    private val log = LoggerFactory.getLogger(Net::class.java)

    /**
     * 解析一段port范围。
     * @param port 例如"8080, 8090-9000"这样的端口范围
     * @return 可用端口的迭代器
     */
    fun analyzePort(port: String): List<Int> {
        return try {
            port.split(",")
                .asSequence()
                .map { s -> s.split("-").map { it.toInt() } }
                .flatMap { s ->
                    when (s.size) {
                        0 -> sequenceOf()
                        1 -> sequenceOf(s[0])
                        else -> sequence {
                            for(i in s[0] until s[s.size - 1]) {
                                yield(i)
                            }
                        }
                    }
                }
                .toList()
        }catch (e: Exception) {
            log.warn("Option port '$port' cannot be analyzed as port sequence: ${e.message}")
            return emptyList()
        }
    }

    /**
     * 从一个起始port开始迭代端口。
     * @param begin 起始端口
     * @param step 迭代步长
     */
    fun generatePort(begin: Int, step: Int = 10): List<Int> {
        return sequence {
            for(i in begin .. 65535 step step) {
                yield(i)
            }
        }.toList()
    }

    /**
     * 判断端口是否可用。
     */
    fun isPortAvailable(port: Int): Boolean {
        fun bind(port: Int) {
            ServerSocket(port).close()
        }

        return try {
            bind(port)
            true
        }catch (e: Exception) {
            false
        }
    }
}