package com.heerkirov.hedge.server.dao

import com.heerkirov.hedge.server.model.FindSimilarIgnored
import com.heerkirov.hedge.server.model.FindSimilarResult
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.utils.ktorm.type.composition
import com.heerkirov.hedge.server.utils.ktorm.type.json
import org.ktorm.dsl.QueryRowSet
import org.ktorm.schema.*


object FindSimilarTasks : BaseTable<FindSimilarTask>("find_similar_task", schema = "system_db") {
    val id = int("id").primaryKey()
    val selector = json("selector", typeRef<FindSimilarTask.TaskSelector>())
    val config = json("config", typeRef<FindSimilarTask.TaskConfig>())
    val recordTime = datetime("record_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = FindSimilarTask(
        id = row[id]!!,
        selector = row[selector]!!,
        config = row[config],
        recordTime = row[recordTime]!!
    )
}

object FindSimilarIgnores : BaseTable<FindSimilarIgnored>("find_similar_ignored", schema = "system_db") {
    val id = int("id").primaryKey()
    val firstTarget = text("first_target")
    val secondTarget = text("second_target")
    val recordTime = datetime("record_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = FindSimilarIgnored(
        id = row[id]!!,
        firstTarget = row[firstTarget]!!,
        secondTarget = row[secondTarget]!!,
        recordTime = row[recordTime]!!
    )
}

object FindSimilarResults : BaseTable<FindSimilarResult>("find_similar_result", schema = "system_db") {
    val id = int("id").primaryKey()
    val summaryTypes = composition<FindSimilarResult.SummaryTypes>("summary_types")
    val images = json("images", typeRef<List<FindSimilarResult.ImageUnit>>())
    val relations = json("images", typeRef<List<FindSimilarResult.RelationUnit>>())
    val sortPriority = int("sort_priority")
    val recordTime = datetime("record_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = FindSimilarResult(
        id = row[id]!!,
        summaryTypes = row[summaryTypes]!!,
        images = row[images]!!,
        relations = row[relations]!!,
        sortPriority = row[sortPriority]!!,
        recordTime = row[recordTime]!!
    )
}