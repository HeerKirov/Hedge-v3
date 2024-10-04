package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.components.appdata.SourceOption
import com.heerkirov.hedge.server.enums.SourceEditStatus
import com.heerkirov.hedge.server.library.form.Length
import com.heerkirov.hedge.server.library.form.NotBlank
import com.heerkirov.hedge.server.utils.types.Opt
import java.time.Instant

data class SiteCreateForm(@NotBlank @Length(16) val name: String,
                          val title: String? = null,
                          val idMode: SourceOption.SiteIdMode = SourceOption.SiteIdMode.NUMBER,
                          val partMode: SourceOption.SitePartMode = SourceOption.SitePartMode.NO,
                          val ordinal: Int? = null,
                          val additionalInfo: List<SourceOption.AvailableAdditionalInfo> = emptyList(),
                          val sourceLinkRules: List<String> = emptyList(),
                          val tagTypes: List<String> = emptyList(),
                          val tagTypeMappings: Map<String, String> = emptyMap())

data class SiteUpdateForm(val title: Opt<String?>,
                          val ordinal: Opt<Int>,
                          val additionalInfo: Opt<List<SourceOption.AvailableAdditionalInfo>>,
                          val sourceLinkRules: Opt<List<String>>,
                          val tagTypes: Opt<List<String>>,
                          val tagTypeMappings: Opt<Map<String, String>>)

data class SiteBulkForm(@NotBlank @Length(16) val name: String,
                        val title: Opt<String?>,
                        val idMode: Opt<SourceOption.SiteIdMode>,
                        val partMode: Opt<SourceOption.SitePartMode>,
                        val additionalInfo: Opt<List<SourceOption.AvailableAdditionalInfo>>,
                        val sourceLinkRules: Opt<List<String>>,
                        val tagTypes: Opt<List<String>>,
                        val tagTypeMappings: Opt<Map<String, String>>)

data class SourceDataCreateForm(val sourceSite: String, val sourceId: String, val status: Opt<SourceEditStatus>,
                                val title: Opt<String?>, val description: Opt<String?>,
                                val tags: Opt<List<SourceTagForm>>, val books: Opt<List<SourceBookForm>>,
                                val relations: Opt<List<String>>, val links: Opt<List<String>>, val additionalInfo: Opt<List<SourceDataAdditionalInfoForm>>,
                                val publishTime: Opt<Instant?>)

data class SourceDataUpdateForm(val title: Opt<String?>, val description: Opt<String?>, val status: Opt<SourceEditStatus>,
                                val tags: Opt<List<SourceTagForm>>, val books: Opt<List<SourceBookForm>>,
                                val relations: Opt<List<String>>, val links: Opt<List<String>>, val additionalInfo: Opt<List<SourceDataAdditionalInfoForm>>,
                                val publishTime: Opt<Instant?>)

data class SourceDataAdditionalInfoForm(val field: String, val value: String)

data class SourceTagForm(@NotBlank val code: String, @NotBlank val type: String, @NotBlank val name: Opt<String>, val otherName: Opt<String?>)

data class SourceBookForm(@NotBlank val code: String, @NotBlank val title: Opt<String>, val otherTitle: Opt<String?>)

data class MappingSourceTagForm(@NotBlank val site: String, @NotBlank val type: String, @NotBlank val code: String, val name: Opt<String>, val otherName: Opt<String?>)