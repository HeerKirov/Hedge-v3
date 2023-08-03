package com.heerkirov.hedge.server.constants

/**
 * 相对于userData目录的各种文件的名称定义。
 */
object Filename {
    const val SERVER_PID = "PID"

    const val SETTING_STORAGE_DAT = "setting.dat"
    const val APPDATA_STORAGE_DAT = "appdata.dat"

    const val DATA_SQLITE = "data.sqlite"
    const val META_SQLITE = "meta.sqlite"
    const val FILE_SQLITE = "file.sqlite"
    const val SOURCE_SQLITE = "source.sqlite"
    const val SYSTEM_SQLITE = "system.sqlite"

    const val VERSION_LOCK = "version.lock"

    const val SERVER_DIR = "server"
    const val DEFAULT_STORAGE_DIR = "archives"
    const val DEFAULT_CACHE_DIR = "cache"

    const val ORIGINAL_FILE_DIR = "original"
    const val THUMBNAIL_FILE_DIR = "thumbnail"
    const val SAMPLE_FILE_DIR = "sample"
}