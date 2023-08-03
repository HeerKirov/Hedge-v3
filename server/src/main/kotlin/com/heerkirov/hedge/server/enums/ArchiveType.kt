package com.heerkirov.hedge.server.enums

import com.heerkirov.hedge.server.constants.Filename

enum class ArchiveType {
    ORIGINAL,
    THUMBNAIL,
    SAMPLE;

    override fun toString(): String {
        return when(this) {
            ORIGINAL -> Filename.ORIGINAL_FILE_DIR
            THUMBNAIL -> Filename.THUMBNAIL_FILE_DIR
            SAMPLE -> Filename.SAMPLE_FILE_DIR
        }
    }
}