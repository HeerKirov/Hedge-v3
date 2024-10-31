package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.components.appdata.ImportOption
import com.heerkirov.hedge.server.enums.MetaType
import com.heerkirov.hedge.server.enums.TagAuthorType
import com.heerkirov.hedge.server.enums.TagTopicType
import com.heerkirov.hedge.server.library.form.Min
import com.heerkirov.hedge.server.library.form.Range
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.utils.types.Opt

data class ImportOptionUpdateForm(val autoAnalyseSourceData: Opt<Boolean>,
                                  val preventNoneSourceData: Opt<Boolean>,
                                  val autoReflectMetaTag: Opt<Boolean>,

                                  val reflectMetaTagType: Opt<List<MetaType>>,
                                  val autoConvertFormat: Opt<Boolean>,
                                  val autoConvertPNGThresholdSizeMB: Opt<Long>,
                                  val setTagmeOfTag: Opt<Boolean>,
                                  val setTagmeOfSource: Opt<Boolean>,
                                  val setOrderTimeBy: Opt<ImportOption.TimeType>,
                                  @Range(min = 0 - 24, max = 24) val setPartitionTimeDelayHour: Opt<Long?>,
                                  val sourceAnalyseRules: Opt<List<ImportOption.SourceAnalyseRule>>)

data class MetaOptionUpdateForm(val autoCleanTagme: Opt<Boolean>,
                                val onlyCharacterTopic: Opt<Boolean>,
                                val resolveTagConflictByParent: Opt<Boolean>,
                                val bindingPartitionWithOrderTime: Opt<Boolean>,
                                val tuningOrderTime: Opt<Boolean>,
                                val centralizeCollection: Opt<Boolean>,
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

data class StorageOptionUpdateForm(val storagePath: Opt<String?>,
                                   val autoCleanTrashes: Opt<Boolean>,
                                   @Range(1, 90) val autoCleanTrashesIntervalDay: Opt<Int>,
                                   @Range(10, 10000) val blockMaxSizeMB: Opt<Long>,
                                   @Range(5, 5000) val blockMaxCount: Opt<Int>)

data class ServerOptionUpdateForm(val port: Opt<String?>, val token: Opt<String?>, @Range(min = 0 - 24, max = 24) val timeOffsetHour: Opt<Int?>)
