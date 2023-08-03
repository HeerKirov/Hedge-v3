package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.enums.FindSimilarEntityType
import com.heerkirov.hedge.server.enums.SimilarityType
import com.heerkirov.hedge.server.model.FindSimilarResult
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.utils.types.FindSimilarEntityKey
import java.time.LocalDateTime

data class FindSimilarTaskRes(val id: Int, val selector: FindSimilarTask.TaskSelector, val config: FindSimilarTask.TaskConfig?, val recordTime: LocalDateTime)

data class FindSimilarResultRes(val id: Int, val type: FindSimilarResult.SummaryTypes, val images: List<FindSimilarResultImage>, val recordTime: LocalDateTime)

data class FindSimilarResultDetailRes(val id: Int, val type: FindSimilarResult.SummaryTypes, val images: List<FindSimilarResultImage>, val relations: List<FindSimilarResultRelation>, val recordTime: LocalDateTime)

data class FindSimilarResultImage(val type: FindSimilarEntityType, val id: Int, val filePath: NullableFilePath?)

data class FindSimilarResultRelation(val a: FindSimilarEntityKey, val b: FindSimilarEntityKey, val type: SimilarityType, val info: FindSimilarResult.RelationInfo)

fun newFindSimilarTaskRes(task: FindSimilarTask) = FindSimilarTaskRes(task.id, task.selector, task.config, task.recordTime)
