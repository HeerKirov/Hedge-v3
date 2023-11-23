package com.heerkirov.hedge.server.dao

import com.heerkirov.hedge.server.model.FindSimilarIgnored
import com.heerkirov.hedge.server.model.FindSimilarResult
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.utils.ktorm.type.*
import org.ktorm.dsl.QueryRowSet
import org.ktorm.schema.*


object FindSimilarTasks : BaseTable<FindSimilarTask>("find_similar_task", schema = "system_db") {
    val id = int("id").primaryKey()
    val selector = json("selector", typeRef<FindSimilarTask.TaskSelector>())
    val config = json("config", typeRef<FindSimilarTask.TaskConfig>())
    val recordTime = timestamp("record_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = FindSimilarTask(
        id = row[id]!!,
        selector = row[selector]!!,
        config = row[config]!!,
        recordTime = row[recordTime]!!
    )
}

object FindSimilarIgnores : BaseTable<FindSimilarIgnored>("find_similar_ignored", schema = "system_db") {
    val id = int("id").primaryKey()
    val type = enum("type", typeRef<FindSimilarIgnored.IgnoredType>())
    val firstTarget = int("first_target")
    val secondTarget = int("second_target")
    val recordTime = timestamp("record_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = FindSimilarIgnored(
        id = row[id]!!,
        type = row[type]!!,
        firstTarget = row[firstTarget]!!,
        secondTarget = row[secondTarget],
        recordTime = row[recordTime]!!
    )
}

object FindSimilarResults : BaseTable<FindSimilarResult>("find_similar_result", schema = "system_db") {
    val id = int("id").primaryKey()
    val category = enum("category", typeRef<FindSimilarResult.SimilarityCategory>())
    val summaryType = composition<FindSimilarResult.SummaryTypes>("summary_type")
    val imageIds = intUnionList("image_ids")
    val edges = json("edges", typeRef<List<FindSimilarResult.RelationEdge>>())
    val coverages = json("coverages", typeRef<List<FindSimilarResult.RelationCoverage>>())
    val resolved = boolean("resolved")
    val recordTime = timestamp("record_time")

    override fun doCreateEntity(row: QueryRowSet, withReferences: Boolean) = FindSimilarResult(
        id = row[id]!!,
        category = row[category]!!,
        summaryType = row[summaryType]!!,
        imageIds = row[imageIds]!!,
        edges = row[edges]!!,
        coverages = row[coverages]!!,
        resolved = row[resolved]!!,
        recordTime = row[recordTime]!!
    )
}