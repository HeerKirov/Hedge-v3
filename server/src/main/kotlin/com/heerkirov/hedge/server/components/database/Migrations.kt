package com.heerkirov.hedge.server.components.database

import com.fasterxml.jackson.databind.JsonNode
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.utils.Resources
import com.heerkirov.hedge.server.utils.SqlDelimiter
import com.heerkirov.hedge.server.utils.migrations.*
import org.ktorm.database.Database

object MetadataMigrationStrategy : JsonObjectStrategy<Setting>(Setting::class) {
    override fun defaultData(): Setting {
        return Setting(
            meta = MetaOption(
                scoreDescriptions = emptyList(),
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
                setPartitionTimeDelay = null,
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

object DatabaseMigrationStrategy : SimpleStrategy<Database>() {
    override fun migrations(register: MigrationRegister<Database>) {
        register.useSQL("0.1.0")
    }

    /**
     * 向database应用resources资源文件中的sql文件。
     */
    private fun Database.useSQLResource(version: Version): Database {
        useConnection { conn ->
            conn.createStatement().use { stat ->
                Resources.getResourceAsText("migrations/v$version.sql")
                    .let { SqlDelimiter.splitByDelimiter(it) }
                    .forEach { stat.execute(it) }
            }
        }

        return this
    }

    /**
     * 直接向database应用一个以sql文件同步为全部内容的版本。
     */
    private fun MigrationRegister<Database>.useSQL(version: String): MigrationRegister<Database> {
        return this.map(version) { it.useSQLResource(versionOf(version)) }
    }

}