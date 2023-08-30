package com.heerkirov.hedge.server.components.appdata

import com.fasterxml.jackson.databind.JsonNode
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.utils.migrations.JsonObjectStrategy
import com.heerkirov.hedge.server.utils.migrations.MigrationRegister

object AppDataMigrationStrategy : JsonObjectStrategy<AppData>(AppData::class) {
    override fun defaultData(): AppData {
        return AppData(
            server = ServerOption(
                port = null,
                token = null
            ),
            storage = StorageOption(
                storagePath = null,
                autoCleanTrashes = true,
                autoCleanTrashesIntervalDay = 30,
                autoCleanCaches = true,
                autoCleanCachesIntervalDay = 30,
                blockMaxSizeMB = 1024 * 4,
                blockMaxCount = 1500
            ),
            meta = MetaOption(
                autoCleanTagme = true,
                topicColors = emptyMap(),
                authorColors = emptyMap()
            ),
            query = QueryOption(
                chineseSymbolReflect = false,
                translateUnderscoreToSpace = false,
                queryLimitOfQueryItems = 20,
                warningLimitOfUnionItems = 20,
                warningLimitOfIntersectItems = 8
            ),
            source = SourceOption(
                sites = mutableListOf()
            ),
            import = ImportOption(
                autoAnalyseSourceData = false,
                setTagmeOfTag = true,
                setTagmeOfSource = true,
                setOrderTimeBy = ImportOption.TimeType.UPDATE_TIME,
                setPartitionTimeDelayHour = null,
                sourceAnalyseRules = emptyList(),
                watchPaths = emptyList(),
                autoWatchPath = false,
                watchPathMoveFile = true,
                watchPathInitialize = true
            ),
            findSimilar = FindSimilarOption(
                autoFindSimilar = false,
                autoTaskConf = null,
                defaultTaskConf = DEFAULT_FIND_SIMILAR_TASK_CONF
            )
        )
    }

    override fun migrations(register: MigrationRegister<JsonNode>) {
        register.empty("0.1.0")
    }

    private val DEFAULT_FIND_SIMILAR_TASK_CONF = FindSimilarTask.TaskConfig(
        findBySourceIdentity = true,
        findBySimilarity = true,
        findBySourceRelation = true,
        findBySourceMark = true,
        filterByOtherImport = false,
        filterByPartition = true,
        filterByAuthor = true,
        filterByTopic = true,
        filterBySourceTagType = emptyList()
    )
}