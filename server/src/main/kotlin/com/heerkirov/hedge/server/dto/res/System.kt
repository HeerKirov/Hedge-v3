package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.enums.SimilarityType
import com.heerkirov.hedge.server.model.FindSimilarResult
import com.heerkirov.hedge.server.model.FindSimilarTask
import java.time.Instant

data class FindSimilarTaskRes(val id: Int, val selector: FindSimilarTask.TaskSelector, val config: FindSimilarTask.TaskConfig?, val recordTime: Instant)

data class FindSimilarResultRes(val id: Int, val type: FindSimilarResult.SummaryTypes, val images: List<FindSimilarResultImage>, val recordTime: Instant)

data class FindSimilarResultDetailRes(val id: Int, val type: FindSimilarResult.SummaryTypes, val images: List<FindSimilarResultImage>, val relations: List<FindSimilarResultRelation>, val recordTime: Instant)

data class FindSimilarResultImage(val id: Int, val filePath: NullableFilePath?)

data class FindSimilarResultRelation(val a: Int, val b: Int, val type: SimilarityType, val info: FindSimilarResult.RelationInfo)

fun newFindSimilarTaskRes(task: FindSimilarTask) = FindSimilarTaskRes(task.id, task.selector, task.config, task.recordTime)
