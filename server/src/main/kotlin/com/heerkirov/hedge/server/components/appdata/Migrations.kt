package com.heerkirov.hedge.server.components.appdata

import com.fasterxml.jackson.databind.JsonNode
import com.heerkirov.hedge.server.enums.MetaType
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
                onlyCleanTagmeByCharacter = true,
                centralizeCollection = true,
                bindingPartitionWithOrderTime = true,
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
                sites = mutableListOf(),
                sourceTypeReflect = mutableListOf()
            ),
            import = ImportOption(
                autoAnalyseSourceData = false,
                preventNoneSourceData = false,
                autoReflectMetaTag = false,
                resolveConflictByParent = false,
                reflectMetaTagType = listOf(MetaType.TAG, MetaType.TOPIC, MetaType.AUTHOR),
                notReflectForMixedSet = false,
                autoConvertFormat = false,
                autoConvertPNGThresholdSizeMB = 10,
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
                    findBySourcePart = false,
                    findBySourceRelation = true,
                    findBySourceBook = false,
                    findBySimilarity = true,
                    filterInCurrentScope = true,
                    filterByPartition = true,
                    filterByAuthor = true,
                    filterByTopic = true,
                    filterBySourceBook = true,
                    filterBySourcePart = true,
                    filterBySourceRelation = false,
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
        register.map("0.4.0", ::modifyImportAndFindSimilarArguments)
        register.map("0.5.0", ::modifyMetaAndImportArguments)
        register.map("0.6.0", ::addImportConvertArguments)
        register.map("0.8.0.1", ::addManyArguments)
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
     * 在0.4.0版本，在import新增了preventNoneSourceData参数，且setPartitionTimeDelayHour参数移动到了server。最后还调整了findSimilar的一些参数。
     */
    private fun modifyImportAndFindSimilarArguments(json: JsonNode): JsonNode {
        return mapOf(
            "server" to json["server"].upsertField("timeOffsetHour") { value -> if(value != null && value.isNumber) value else json["import"]["setPartitionTimeDelayHour"] },
            "storage" to json["storage"],
            "meta" to json["meta"],
            "query" to json["query"],
            "source" to json["source"],
            "import" to json["import"].upsertField("preventNoneSourceData") { value -> if(value != null && value.isBoolean) value else false.toJsonNode() },
            "findSimilar" to json["findSimilar"].updateField("autoTaskConf") { conf ->
                if(conf.isNull) conf else
                    conf.upsertField("findBySourcePart") { value -> if(value != null && value.isBoolean) value else conf["findBySourceIdentity"] }
                        .upsertField("findBySourceBook") { value -> if(value != null && value.isBoolean) value else conf["findBySourceRelation"] }
                        .upsertField("filterInCurrentScope") { value -> if(value != null && value.isBoolean) value else true.toJsonNode() }
                        .upsertField("filterBySourcePart") { value -> if(value != null && value.isBoolean) value else false.toJsonNode() }
                        .upsertField("filterBySourceBook") { value -> if(value != null && value.isBoolean) value else false.toJsonNode() }
                        .upsertField("filterBySourceRelation") { value -> if(value != null && value.isBoolean) value else false.toJsonNode() }
            }.updateField("defaultTaskConf") { conf ->
                if(conf.isNull) conf else
                    conf.upsertField("findBySourcePart") { value -> if(value != null && value.isBoolean) value else conf["findBySourceIdentity"] }
                        .upsertField("findBySourceBook") { value -> if(value != null && value.isBoolean) value else conf["findBySourceRelation"] }
                        .upsertField("filterInCurrentScope") { value -> if(value != null && value.isBoolean) value else true.toJsonNode() }
                        .upsertField("filterBySourcePart") { value -> if(value != null && value.isBoolean) value else false.toJsonNode() }
                        .upsertField("filterBySourceBook") { value -> if(value != null && value.isBoolean) value else false.toJsonNode() }
                        .upsertField("filterBySourceRelation") { value -> if(value != null && value.isBoolean) value else false.toJsonNode() }
            }
        ).toJsonNode()
    }

    /**
     * 在0.5.0版本，在meta新增了centralizeCollection和bindingPartitionWithOrderTime参数。
     */
    private fun modifyMetaAndImportArguments(json: JsonNode): JsonNode {
        return mapOf(
            "server" to json["server"],
            "storage" to json["storage"],
            "meta" to json["meta"].upsertField("centralizeCollection") { value -> if(value != null && value.isBoolean) value else true.toJsonNode() }
                    .upsertField("bindingPartitionWithOrderTime") { value -> if(value != null && value.isBoolean) value else true.toJsonNode() },
            "query" to json["query"],
            "source" to json["source"],
            "import" to json["import"].upsertField("autoReflectMetaTag") { value -> if(value != null && value.isBoolean) value else true.toJsonNode() }
                .upsertField("notReflectForMixedSet") { value -> if(value != null && value.isBoolean) value else true.toJsonNode() }
                .upsertField("reflectMetaTagType") { value -> if(value != null && value.isArray) value else listOf(MetaType.TAG, MetaType.TOPIC, MetaType.AUTHOR).toJsonNode() },
            "findSimilar" to json["findSimilar"]
        ).toJsonNode()
    }

    /**
     * 在0.6.0版本，在import新增了用于自动convert的参数。
     */
    private fun addImportConvertArguments(json: JsonNode): JsonNode {
        return mapOf(
            "server" to json["server"],
            "storage" to json["storage"],
            "meta" to json["meta"],
            "query" to json["query"],
            "source" to json["source"],
            "import" to json["import"]
                .upsertField("autoConvertFormat") { value -> if(value != null && value.isBoolean) value else false.toJsonNode() }
                .upsertField("autoConvertPNGThresholdSizeMB") { value -> if(value != null && value.isNumber) value else 10.toJsonNode() },
            "findSimilar" to json["findSimilar"]
        ).toJsonNode()
    }

    /**
     * 在0.8.0版本，添加了多种新参数。
     */
    private fun addManyArguments(json: JsonNode): JsonNode {
        return mapOf(
            "server" to json["server"],
            "storage" to json["storage"],
            "meta" to json["meta"].upsertField("onlyCleanTagmeByCharacter") { value -> if(value != null && value.isBoolean) value else false.toJsonNode() },
            "query" to json["query"],
            "source" to json["source"].upsertField("sourceTypeReflect") { value -> if(value != null && value.isArray) value else emptyList<SourceOption.SourceTypeReflect>().toJsonNode() },
            "import" to json["import"].upsertField("resolveConflictByParent") { value -> if(value != null && value.isBoolean) value else false.toJsonNode() },
            "findSimilar" to json["findSimilar"]
        ).toJsonNode()
    }
}