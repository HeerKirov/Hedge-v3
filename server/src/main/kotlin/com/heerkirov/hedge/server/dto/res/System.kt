package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.model.FindSimilarResult
import com.heerkirov.hedge.server.model.FindSimilarTask
import java.time.Instant

data class FindSimilarTaskRes(val id: Int, val selector: FindSimilarTask.TaskSelector, val config: FindSimilarTask.TaskConfig?, val recordTime: Instant)

data class FindSimilarResultRes(val id: Int,
                                val category: FindSimilarResult.SimilarityCategory,
                                val summaryType: FindSimilarResult.SummaryTypes,
                                val images: List<FindSimilarResultImage>,
                                val resolved: Boolean,
                                val recordTime: Instant)

data class FindSimilarResultDetailRes(val id: Int,
                                      val category: FindSimilarResult.SimilarityCategory,
                                      val summaryType: FindSimilarResult.SummaryTypes,
                                      val images: List<FindSimilarResultImage>,
                                      val edges: List<FindSimilarResult.RelationEdge>,
                                      val coverages: List<FindSimilarResult.RelationCoverage>,
                                      val resolved: Boolean,
                                      val recordTime: Instant)

data class FindSimilarResultImage(val id: Int, val filePath: NullableFilePath?)

fun newFindSimilarTaskRes(task: FindSimilarTask) = FindSimilarTaskRes(task.id, task.selector, task.config, task.recordTime)
