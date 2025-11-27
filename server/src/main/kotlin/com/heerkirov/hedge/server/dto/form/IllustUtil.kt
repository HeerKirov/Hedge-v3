package com.heerkirov.hedge.server.dto.form

import java.time.Instant

data class IllustIdForm(val illustIds: List<Int>)

data class BookSituationForm(val illustIds: List<Int>, val bookId: Int, val onlyExists: Boolean = false)

data class FolderSituationForm(val illustIds: List<Int>, val folderId: Int, val onlyExists: Boolean = false)

data class OrganizationSituationForm(val illustIds: List<Int>, val organizeMode: OrganizationMode) {
    enum class OrganizationMode {
        /**
         * 完全排序整理：进行全局排序后，将邻近相似项合并
         */
        FULL_SORT_ORGANIZE,
        /**
         * 局部排序整理：仅将相同来源的项聚拢并排序，随后将邻近相似项合并
         */
        PARTIAL_SORT_ORGANIZE,
        /**
         * 全局合并：不排序，随后将相似项合并，并将合并项聚拢
         */
        FULL_ORGANIZE,
        /**
         * 局部合并：不排序，随后将邻近相似项合并
         */
        PARTIAL_ORGANIZE,
        /**
         * 相同来源整理：仅将相同来源的项聚拢排序，随后按相同来源来合并
         */
        SAME_SOURCE_ORGANIZE,
    }
}

data class OrganizationSituationApplyForm(val groups: List<List<Item>>) {
    data class Item(val id: Int, val newOrderTime: Instant?)
}