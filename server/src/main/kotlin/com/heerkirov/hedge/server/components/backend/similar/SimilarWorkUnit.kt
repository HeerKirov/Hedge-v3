package com.heerkirov.hedge.server.components.backend.similar

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.model.FindSimilarTask

class SimilarWorkUnit(private val data: DataRepository, private val targetItems: List<TargetEntity>, private val config: FindSimilarTask.TaskConfig) {

}