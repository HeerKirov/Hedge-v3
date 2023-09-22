package com.heerkirov.hedge.server.components.appdata

import com.fasterxml.jackson.databind.JsonNode
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.utils.Json.parseJSONObject
import com.heerkirov.hedge.server.utils.Json.toJsonNode
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
                defaultTaskConf = FindSimilarTask.TaskConfig(
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
            )
        )
    }

    override fun migrations(register: MigrationRegister<JsonNode>) {
        register.empty("0.1.0")
        register.map("0.1.4", ::addSiteTypes)
    }

    /**
     * 在0.1.4版本，新增了site.availableTypes非空字段。
     */
    private fun addSiteTypes(json: JsonNode): JsonNode {
        data class OldSite(val name: String, var title: String, val partMode: SourceOption.SitePartMode, var availableAdditionalInfo: List<SourceOption.AvailableAdditionalInfo>, var sourceLinkGenerateRules: List<String>)

        val sites = json["source"]["sites"].map { it.parseJSONObject<OldSite>() }.map { SourceOption.Site(it.name, it.title, it.partMode, it.availableAdditionalInfo, it.sourceLinkGenerateRules, mutableListOf()) }.toMutableList()

        return AppData(
            server = json["server"].parseJSONObject(),
            storage = json["storage"].parseJSONObject(),
            meta = json["meta"].parseJSONObject(),
            query = json["query"].parseJSONObject(),
            source = SourceOption(sites),
            import = json["import"].parseJSONObject(),
            findSimilar = json["findSimilar"].parseJSONObject(),
        ).toJsonNode()
    }
}