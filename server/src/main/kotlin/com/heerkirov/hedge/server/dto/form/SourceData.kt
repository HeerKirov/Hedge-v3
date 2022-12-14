package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.enums.SourceEditStatus
import com.heerkirov.hedge.server.utils.types.Opt

data class SourceDataBulkForm(val items: List<SourceDataCreateForm>)

data class SourceDataCreateForm(val sourceSite: String, val sourceId: Long, val status: Opt<SourceEditStatus>,
                                val title: Opt<String?>, val description: Opt<String?>,
                                val tags: Opt<List<SourceTagForm>>, val books: Opt<List<SourceBookForm>>, val relations: Opt<List<Int>>
)

data class SourceDataUpdateForm(val title: Opt<String?>, val description: Opt<String?>, val status: Opt<SourceEditStatus>,
                                val tags: Opt<List<SourceTagForm>>, val books: Opt<List<SourceBookForm>>, val relations: Opt<List<Int>>)

data class SourceTagForm(val code: String, val name: Opt<String>, val otherName: Opt<String?>, val type: Opt<String?>)

data class SourceBookForm(val code: String, val title: Opt<String>)