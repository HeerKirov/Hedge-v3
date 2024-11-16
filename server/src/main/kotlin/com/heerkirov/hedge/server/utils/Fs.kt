package com.heerkirov.hedge.server.utils

import com.heerkirov.hedge.server.utils.Json.parseJSONObject
import com.heerkirov.hedge.server.utils.Json.toJSONString
import java.io.File
import java.io.InputStream
import java.io.OutputStream
import java.util.zip.CRC32
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream
import kotlin.io.path.Path

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
        return File.createTempFile("hedge-v3", ".$extension")
    }

    fun toAbsolutePath(path: String): String {
        val p = Path(path)
        return p.toAbsolutePath().normalize().toString()
    }
}

/**
 * 如果此文件存在，就删除文件。
 */
fun File?.deleteIfExists() {
    if(this != null && exists()) delete()
}

/**
 * 向Zip流添加一个文件。为这个文件添加mtime和CRC。
 */
fun ZipOutputStream.putFile(file: File) {
    val entry = ZipEntry(file.name)
    entry.time = file.lastModified()
    entry.crc = CRC32().let { crc32 ->
        file.inputStream().use { fis -> fis.writeTo(crc32) }
        crc32.value
    }
    entry.size = file.length()

    this.putNextEntry(entry)

    file.inputStream().use { fis -> fis.writeTo(this,1024 * 1024 * 4) }

    this.closeEntry()
}

/**
 * 向Zip流添加一个由ZipEntry和InputStream构成的文件。
 */
fun ZipOutputStream.putEntry(entry: ZipEntry, inputStream: InputStream) {
    this.putNextEntry(entry)
    inputStream.writeTo(this,1024 * 1024 * 4)
    this.closeEntry()
}

/**
 * 将当前InputStream的内容写入到目标OutputStream。
 */
fun InputStream.writeTo(os: OutputStream, bufferSize: Int = DEFAULT_BUFFER_SIZE) {
    var len: Int
    val buffer = ByteArray(bufferSize)
    while(this.read(buffer).also { len = it } != -1) {
        os.write(buffer, 0, len)
    }
}

/**
 * 将当前InputStream的内容计算为CRC32，并写入到目标。
 */
fun InputStream.writeTo(os: CRC32) {
    var len: Int
    val buffer = ByteArray(1024 * 1024 * 4)
    while(this.read(buffer).also { len = it } != -1) {
        os.update(buffer, 0, len)
    }
}