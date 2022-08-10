package com.heerkirov.hedge.server.utils

import java.util.*

object Token {
    /**
     * 生成uuid格式的完全随机token。
     */
    fun uuid(): String = UUID.randomUUID().toString()

    /**
     * 生成供client使用的base token。
     */
    fun token(): String = "base:${UUID.randomUUID()}"
}