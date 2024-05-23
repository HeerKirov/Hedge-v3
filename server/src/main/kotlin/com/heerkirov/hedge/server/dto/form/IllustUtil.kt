package com.heerkirov.hedge.server.dto.form

data class IllustIdForm(val illustIds: List<Int>)

data class BookSituationForm(val illustIds: List<Int>, val bookId: Int, val onlyExists: Boolean = false)

data class FolderSituationForm(val illustIds: List<Int>, val folderId: Int, val onlyExists: Boolean = false)

data class OrganizationSituationForm(val illustIds: List<Int>,
                                     val onlyNeighbours: Boolean = false,
                                     val gatherGroup: Boolean = false,
                                     val resortInGroup: Boolean = false,
                                     val resortAtAll: Boolean = false)