package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.components.database.ImportOption
import com.heerkirov.hedge.server.components.database.MetaOption
import com.heerkirov.hedge.server.enums.TagAuthorType
import com.heerkirov.hedge.server.enums.TagTopicType
import com.heerkirov.hedge.server.library.form.Length
import com.heerkirov.hedge.server.library.form.Min
import com.heerkirov.hedge.server.library.form.NotBlank
import com.heerkirov.hedge.server.library.form.Range
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.utils.types.Opt

data class SiteCreateForm(@NotBlank @Length(16) val name: String,
                          @NotBlank val title: String,
                          val hasSecondaryId: Boolean = false,
                          val ordinal: Int? = null)

data class SiteUpdateForm(@NotBlank val title: Opt<String>, val ordinal: Opt<Int>)

data class ImportOptionUpdateForm(val autoAnalyseSourceData: Opt<Boolean>,
                                  val setTagmeOfTag: Opt<Boolean>,
                                  val setTagmeOfSource: Opt<Boolean>,
                                  val setOrderTimeBy: Opt<ImportOption.TimeType>,
                                  @Range(min = 0 - 86400000, max = 86400000) val setPartitionTimeDelay: Opt<Long?>,
                                  val sourceAnalyseRules: Opt<List<ImportOption.SourceAnalyseRule>>)

data class MetaOptionUpdateForm(val scoreDescriptions: Opt<List<MetaOption.ScoreDescription>>,
                                val autoCleanTagme: Opt<Boolean>,
                                val topicColors: Opt<Map<TagTopicType, String>>,
                                val authorColors: Opt<Map<TagAuthorType, String>>)

data class QueryOptionUpdateForm(val chineseSymbolReflect: Opt<Boolean>,
                                 val translateUnderscoreToSpace: Opt<Boolean>,
                                 @Min(1) val queryLimitOfQueryItems: Opt<Int>,
                                 @Min(2) val warningLimitOfUnionItems: Opt<Int>,
                                 @Min(2) val warningLimitOfIntersectItems: Opt<Int>)

data class FindSimilarOptionUpdateForm(val autoFindSimilar: Opt<Boolean>,
                                       val autoTaskConf: Opt<FindSimilarTask.TaskConfig?>,
                                       val defaultTaskConf: Opt<FindSimilarTask.TaskConfig>)

data class ServiceOptionUpdateForm(val port: Opt<String?>, val storagePath: Opt<String?>)
