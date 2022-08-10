package com.heerkirov.hedge.server.utils

import java.io.File
import java.util.concurrent.ConcurrentHashMap

object Resources {
    private val resourceCaches: MutableMap<String, String> = ConcurrentHashMap()
    private val filesCaches: MutableMap<String, String> = ConcurrentHashMap()

    fun getResourceAsText(path: String): String {
        val resource = this.javaClass.getResource("/$path")!!
        return resourceCaches[path] ?: resource.readText().also {
            resourceCaches[path] = it
        }
    }

    fun getFileAsText(path: String): String {
        return filesCaches[path] ?: File(path).readText().also {
            filesCaches[path] = it
        }
    }
}