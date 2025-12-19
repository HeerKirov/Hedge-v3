package com.heerkirov.hedge.server.dto.form

data class ExportForm(val imageIds: List<Int>? = null,
                      val bookId: Int? = null,
                      val location: String? = null,
                      val packageName: String? = null,
                      val nameType: NameType = NameType.ORIGINAL_FILENAME) {
    enum class NameType {
        ORIGINAL_FILENAME, SOURCE, ID
    }
}
