package com.heerkirov.hedge.server.components.appdata

import com.fasterxml.jackson.databind.JsonNode
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.utils.Json.updateField
import com.heerkirov.hedge.server.utils.Json.parseJSONObject
import com.heerkirov.hedge.server.utils.Json.toJsonNode
import com.heerkirov.hedge.server.utils.Json.upsertField
import com.heerkirov.hedge.server.utils.migrations.JsonObjectStrategy
import com.heerkirov.hedge.server.utils.migrations.MigrationRegister

object AppDataMigrationStrategy : JsonObjectStrategy<AppData>(AppData::class) {
    override fun defaultData(): AppData {
        return AppData(
            server = ServerOption(
                port = null,
                token = null,
                timeOffsetHour = null
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
                preventNoneSourceData = false,
                setTagmeOfTag = true,
                setOrderTimeBy = ImportOption.TimeType.UPDATE_TIME,
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
        register.map("0.2.0", ::modifyAuthorTypes)
        register.map("0.3.0", ::addSourceAnalyseRuleExtraArguments)
        register.map("0.4.0", ::addImportArguments)
    }

    /**
     * 在0.1.4版本，新增了site.availableTypes非空字段。
     */
    private fun addSiteTypes(json: JsonNode): JsonNode {
        return mapOf(
            "server" to json["server"],
            "storage" to json["storage"],
            "meta" to json["meta"],
            "query" to json["query"],
            "source" to mapOf(
                "sites" to json["source"]["sites"].map { site ->
                    mapOf(
                        "name" to site["name"],
                        "title" to site["title"],
                        "partMode" to site["partMode"],
                        "availableAdditionalInfo" to site["availableAdditionalInfo"],
                        "sourceLinkGenerateRules" to site["sourceLinkGenerateRules"],
                        "availableTypes" to emptyList<String>()
                    )
                }
            ),
            "import" to json["import"],
            "findSimilar" to json["findSimilar"],
        ).toJsonNode()
    }

    /**
     * 在0.2.0版本，修改了meta.authorColors中的author枚举名称。
     */
    private fun modifyAuthorTypes(json: JsonNode): JsonNode {
        return mapOf(
            "server" to json["server"],
            "storage" to json["storage"],
            "meta" to mapOf(
                "autoCleanTagme" to json["meta"]["autoCleanTagme"],
                "topicColors" to json["meta"]["topicColors"],
                "authorColors" to json["meta"]["authorColors"].parseJSONObject<Map<String, String>>()
                    .mapKeys { (k, _) ->
                        when(k) {
                            "ARTIST" -> "ARTIST"
                            "STUDIO" -> "GROUP"
                            "PUBLISH" -> "SERIES"
                            else -> throw RuntimeException("Author type '$k' is illegal.")
                        }
                    }
            ),
            "query" to json["query"],
            "source" to json["source"],
            "import" to json["import"],
            "findSimilar" to json["findSimilar"],
        ).toJsonNode()
    }

    /**
     * 在0.3.0版本，在import.sourceAnalyseRules[].extras[]新增了translateUnderscoreToSpace参数。
     */
    private fun addSourceAnalyseRuleExtraArguments(json: JsonNode): JsonNode {
        return mapOf(
            "server" to json["server"],
            "storage" to json["storage"],
            "meta" to json["meta"],
            "query" to json["query"],
            "source" to json["source"],
            "import" to json["import"].updateField("sourceAnalyseRules") { rules -> rules.map { rule ->
                rule.updateField("extras") { extras -> extras.map { extra ->
                    extra.upsertField("translateUnderscoreToSpace") { value -> if(value != null && value.isBoolean) value else false.toJsonNode() }
                }.toJsonNode() }
            }.toJsonNode() },
            "findSimilar" to json["findSimilar"],
        ).toJsonNode()
    }

    /**
     * 在0.4.0版本，在import新增了preventNoneSourceData参数，且setPartitionTimeDelayHour参数移动到了
     */
    private fun addImportArguments(json: JsonNode): JsonNode {
        return mapOf(
            "server" to json["server"].upsertField("timeOffsetHour") { value -> if(value != null && value.isNumber) value else json["import"]["setPartitionTimeDelayHour"] },
            "storage" to json["storage"],
            "meta" to json["meta"],
            "query" to json["query"],
            "source" to json["source"],
            "import" to json["import"].upsertField("preventNoneSourceData") { value -> if(value != null && value.isBoolean) value else false.toJsonNode() },
            "findSimilar" to json["findSimilar"],
        ).toJsonNode()
    }
}