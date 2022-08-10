package com.heerkirov.hedge.server.dto.form

data class IllustIdForm(val illustIds: List<Int>)

data class BookSituationForm(val illustIds: List<Int>, val bookId: Int, val onlyExists: Boolean = false)

data class FolderSituationForm(val illustIds: List<Int>, val folderId: Int, val onlyExists: Boolean = false)