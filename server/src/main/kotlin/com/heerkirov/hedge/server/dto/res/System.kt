package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.model.FindSimilarResult
import com.heerkirov.hedge.server.model.FindSimilarTask
import java.time.LocalDateTime

data class FindSimilarTaskRes(val id: Int, val selector: FindSimilarTask.TaskSelector, val config: FindSimilarTask.TaskConfig?, val recordTime: LocalDateTime)

data class FindSimilarResultRes(val id: Int, val type: FindSimilarResult.Type, val images: List<IllustSimpleRes>, val recordTime: LocalDateTime)

fun newFindSimilarTaskRes(task: FindSimilarTask) = FindSimilarTaskRes(task.id, task.selector, task.config, task.recordTime)

fun newFindSimilarResultRes(result: FindSimilarResult, images: List<IllustSimpleRes>) = FindSimilarResultRes(result.id, result.type, images, result.recordTime)