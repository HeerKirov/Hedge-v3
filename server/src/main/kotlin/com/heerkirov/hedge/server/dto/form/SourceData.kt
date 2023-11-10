package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.enums.SourceEditStatus
import com.heerkirov.hedge.server.library.form.NotBlank
import com.heerkirov.hedge.server.utils.types.Opt

data class SourceDataCreateForm(val sourceSite: String, val sourceId: Long, val status: Opt<SourceEditStatus>,
                                val title: Opt<String?>, val description: Opt<String?>,
                                val tags: Opt<List<SourceTagForm>>, val books: Opt<List<SourceBookForm>>,
                                val relations: Opt<List<Long>>, val links: Opt<List<String>>, val additionalInfo: Opt<List<SourceDataAdditionalInfoForm>>)

data class SourceDataUpdateForm(val title: Opt<String?>, val description: Opt<String?>, val status: Opt<SourceEditStatus>,
                                val tags: Opt<List<SourceTagForm>>, val books: Opt<List<SourceBookForm>>,
                                val relations: Opt<List<Long>>, val links: Opt<List<String>>, val additionalInfo: Opt<List<SourceDataAdditionalInfoForm>>)

data class SourceDataAdditionalInfoForm(val field: String, val value: String)

data class SourceTagForm(@NotBlank val code: String, @NotBlank val type: String, @NotBlank val name: Opt<String>, val otherName: Opt<String?>)

data class SourceBookForm(@NotBlank val code: String, @NotBlank val title: Opt<String>, val otherTitle: Opt<String?>)
