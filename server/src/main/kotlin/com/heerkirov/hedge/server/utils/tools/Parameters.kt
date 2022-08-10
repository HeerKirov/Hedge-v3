package com.heerkirov.hedge.server.utils.tools

/**
 * 用于快速分析启动参数。
 */
class Parameters(private val args: Array<String>) {
    fun contain(flag: String): Boolean {
        return args.any { it == flag }
    }

    operator fun get(key: String): String? {
        for(i in args.indices) {
            if(args[i] == key) {
                if(i < args.size - 1) {
                    return args[i + 1]
                }
                return null
            }
        }
        return null
    }
}