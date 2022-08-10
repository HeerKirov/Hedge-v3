package com.heerkirov.hedge.server.utils

import com.heerkirov.hedge.server.utils.Json.parseJSONObject
import com.heerkirov.hedge.server.utils.Json.toJSONString
import java.io.File
import kotlin.io.path.Path
import kotlin.io.path.absolutePathString

object Fs {
    fun exists(path: String): Boolean {
        return File(path).exists()
    }

    inline fun <reified T> readFile(path: String): T? {
        val f = File(path)
        return if(f.exists()) { f.readText().parseJSONObject<T>() }else{ null }
    }

    fun <T> writeFile(path: String, content: T) {
        File(path).writeText(content.toJSONString())
    }

    fun readText(path: String): String? {
        val f = File(path)
        return if(f.exists()) { f.readText() }else{ null }
    }

    fun writeText(path: String, content: String) {
        File(path).writeText(content)
    }

    fun rm(path: String): Boolean {
        return File(path).delete()
    }

    fun mkdir(path: String) {
        val f = File(path)
        if(!f.exists()) {
            f.mkdirs()
        }
    }

    fun temp(extension: String? = null): File {
        return File.createTempFile("hedge-v2-server", ".$extension")
    }

    fun toAbsolutePath(path: String): String {
        val p = Path(path)
        return p.absolutePathString()
    }
}

/**
 * 使用此File。在方法块退出后，删除此文件。一般搭配tempFile使用。
 */
inline fun <T, F : File?> F.finallyUse(block: (F) -> T): T {
    try {
        return block(this)
    }finally {
        if(this != null && exists()) delete()
    }
}

/**
 * 如果此文件存在，就删除文件。
 */
fun File?.deleteIfExists() {
    if(this != null && exists()) delete()
}