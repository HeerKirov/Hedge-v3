package com.heerkirov.hedge.server.components.database

import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.enums.MetaType
import com.heerkirov.hedge.server.utils.Json.parseJSONObject
import com.heerkirov.hedge.server.utils.Resources
import com.heerkirov.hedge.server.utils.StrTemplate
import com.heerkirov.hedge.server.utils.duplicateCount
import com.heerkirov.hedge.server.utils.ktorm.type.StringUnionListType
import com.heerkirov.hedge.server.utils.migrations.*
import org.ktorm.database.Database
import org.ktorm.database.Transaction
import org.ktorm.dsl.*
import org.slf4j.LoggerFactory
import java.time.Instant
import java.time.ZoneId

object DatabaseMigrationStrategy : SimpleStrategy<Database>() {
    private val log = LoggerFactory.getLogger(DatabaseMigrationStrategy::class.java)

    override fun migrations(register: MigrationRegister<Database>) {
        register.useSQL("0.1.0")
        register.useSQLTemplate("0.1.3", ::generateTimestampOffset)
        register.useSQL("0.1.4")
        register.useSQLTemplate("0.1.5", ::generateTimestampOffset)
        register.useSQL("0.3.0")
        register.useSQL("0.3.2", ::initializeIllustCacheBookAndFavorite)
        register.useSQL("0.4.0")
        register.useSQL("0.5.0")
        register.useSQL("0.7.0")
        register.useSQL("0.7.2")
        register.useSQL("0.8.0", ::processSourceIdModify)
        register.useSQL("0.9.0")
        register.useSQL("0.9.0.1")
        register.useSQL("0.10.0.1")
        register.useSQL("0.12.0", ::processAnnotationRemoving)
        register.useSQL("0.12.0.1")
        register.useSQL("0.12.4")
        register.useFunc("0.13.0", ::processCollectionTagme)
    }

    /**
     * 向database应用resources资源文件中的sql文件。
     */
    private fun Transaction.useSQLResource(version: Version, arguments: Map<String, String>? = null) {
        connection.createStatement().use { stat ->
            if(arguments != null) {
                Resources.getResourceAsText("migrations/v$version.tpl.sql").let { StrTemplate.render(it, arguments) }
            }else{
                Resources.getResourceAsText("migrations/v$version.sql")
            }.let { StrTemplate.splitSQL(it) }.forEach { stat.execute(it) }
        }
    }

    /**
     * 向database应用仅一个处理函数。
     */
    private fun MigrationRegister<Database>.useFunc(version: String, addonFunc: (Database, Transaction) -> Unit): MigrationRegister<Database> {
        return this.map(version) { db ->
            db.apply {
                transactionWithCtx {
                    addonFunc(this, it)
                }
            }
        }
    }

    /**
     * 直接向database应用一个以sql文件同步为全部内容的版本。
     */
    private fun MigrationRegister<Database>.useSQL(version: String, addonFunc: ((Database, Transaction) -> Unit)? = null, funcBefore: Boolean = false): MigrationRegister<Database> {
        return this.map(version) { db ->
            db.apply {
                transactionWithCtx {
                    if(funcBefore && addonFunc != null) addonFunc(this, it)
                    it.useSQLResource(versionOf(version))
                    if(!funcBefore && addonFunc != null) addonFunc(this, it)
                }
            }
        }
    }

    /**
     * 向database应用一个sql模板文件。
     */
    private fun MigrationRegister<Database>.useSQLTemplate(version: String, generator: () -> Map<String, String>): MigrationRegister<Database> {
        return this.map(version) { db ->
            db.apply { transactionWithCtx { it.useSQLResource(versionOf(version), generator()) } }
        }
    }

    /**
     * 生成OFFSET_EPOCHMILLS参数，其值为当前时区相对于UTC时区的偏移毫秒数。
     */
    private fun generateTimestampOffset(): Map<String, String> {
        //使用一个简单粗暴的算法获得时间差。这并不是严谨的时区处理方式，但要对db中的每一个时间做严谨转换有点太麻烦了且毫无必要。
        val now = Instant.now()
        val offsetMills = now.atZone(ZoneId.systemDefault()).withZoneSameLocal(ZoneId.of("UTC")).toInstant().toEpochMilli() - now.toEpochMilli()
        return mapOf(
            "OFFSET_EPOCHMILLS" to offsetMills.toString()
        )
    }

    /**
     * 由于新增了cached book ids，需要初始化这项参数；由于新增了收藏状态的联动，需要初始化集合的收藏状态。
     */
    private fun initializeIllustCacheBookAndFavorite(db: Database, t: Transaction) {
        val j = Illusts.aliased("joined_image")

        val parentToBooks = db.from(Illusts)
            .innerJoin(j, Illusts.id eq j.parentId)
            .innerJoin(BookImageRelations, BookImageRelations.imageId eq j.id)
            .select(Illusts.id, BookImageRelations.bookId)
            .where { (Illusts.type eq IllustModelType.COLLECTION) }
            .groupBy(Illusts.id, BookImageRelations.bookId)
            .map { Pair(it[Illusts.id]!!, it[BookImageRelations.bookId]!!) }
            .groupBy({ (i, _) -> i }) { (_, b) -> b }

        if(parentToBooks.isNotEmpty()) {
            db.batchUpdate(Illusts) {
                for ((id, books) in parentToBooks) {
                    item {
                        where { it.id eq id }
                        set(it.cachedBookIds, books.ifEmpty { null })
                        set(it.cachedBookCount, books.size)
                    }
                }
            }
        }

        val parentToFolders = db.from(Illusts)
            .innerJoin(j, Illusts.id eq j.parentId)
            .innerJoin(FolderImageRelations, FolderImageRelations.imageId eq j.id)
            .select(Illusts.id, FolderImageRelations.folderId)
            .where { (Illusts.type eq IllustModelType.COLLECTION) }
            .groupBy(Illusts.id, FolderImageRelations.folderId)
            .map { Pair(it[Illusts.id]!!, it[FolderImageRelations.folderId]!!) }
            .groupBy({ (i, _) -> i }) { (_, b) -> b }

        if(parentToFolders.isNotEmpty()) {
            db.batchUpdate(Illusts) {
                for ((id, folders) in parentToFolders) {
                    item {
                        where { it.id eq id }
                        set(it.cachedFolderIds, folders.ifEmpty { null })
                    }
                }
            }
        }

        val needToBeFavorite = db.from(Illusts)
            .innerJoin(j, Illusts.id eq j.parentId and j.favorite)
            .select(Illusts.id)
            .where { Illusts.type eq IllustModelType.COLLECTION and Illusts.favorite.not() }
            .groupBy(Illusts.id)
            .map { it[Illusts.id]!! }
        if(needToBeFavorite.isNotEmpty()) {
            db.update(Illusts) {
                where { it.id inList needToBeFavorite }
                set(it.favorite, true)
            }
        }
        val needToBeNotFavorite = db.from(Illusts)
            .innerJoin(j, Illusts.id eq j.parentId and j.favorite)
            .select(Illusts.id, count(j.id).aliased("cnt"))
            .where { Illusts.type eq IllustModelType.COLLECTION and Illusts.favorite }
            .groupBy(Illusts.id)
            .having { count(j.id).aliased("cnt") eq 0 }
            .map { it[Illusts.id]!! }
        if(needToBeNotFavorite.isNotEmpty()) {
            db.update(Illusts) {
                where { it.id inList needToBeNotFavorite }
                set(it.favorite, false)
            }
        }
    }

    /**
     * 由于sourceId的类型发生了变化，有一些数据需要额外的操作来变更。
     */
    private fun processSourceIdModify(db: Database, t: Transaction) {
        val sourceDataList = db.from(SourceDatas)
            .select(SourceDatas.id, SourceDatas.relations)
            .where { SourceDatas.relations.isNotNull() and (SourceDatas.relations notEq emptyList()) }
            .map { Pair(it[SourceDatas.id]!!, it[SourceDatas.relations]!!) }

        if(sourceDataList.isNotEmpty()) {
            db.batchUpdate(SourceDatas) {
                for ((id, relations) in sourceDataList) {
                    val translatedRelations = (relations as List<Any>).map { it.toString() }
                    item {
                        where { it.id eq id }
                        set(it.relations, translatedRelations)
                    }
                }
            }
        }
    }

    /**
     * 由于Annotation的移除，需要对现有数据进行合并。
     */
    private fun processAnnotationRemoving(db: Database, t: Transaction) {
        val topics = mutableListOf<Pair<Int, List<String>>>()
        val authors = mutableListOf<Pair<Int, List<String>>>()
        t.connection.createStatement().use { stat ->
            //读取topic、author当前关联的annotation，将其写入到keywords中
            stat.executeQuery("SELECT id, keywords, cached_annotations FROM meta_db.topic WHERE cached_annotations IS NOT NULL AND cached_annotations <> ''").use { rs ->
                while (rs.next()) {
                    val cachedAnnotations = rs.getString("cached_annotations").parseJSONObject<List<Map<String, Any>>>()
                    if(cachedAnnotations.isNotEmpty()) {
                        val keywords = StringUnionListType.getResult(rs, "keywords") ?: emptyList()
                        val annotations = cachedAnnotations.map { it["name"] as String }
                        val filtered = annotations - keywords.toSet()
                        if(filtered.isNotEmpty()) {
                            topics.add(Pair(rs.getInt("id"), filtered + keywords))
                        }
                    }
                }
            }
            stat.executeQuery("SELECT id, keywords, cached_annotations FROM meta_db.author WHERE cached_annotations IS NOT NULL AND cached_annotations <> ''").use { rs ->
                while (rs.next()) {
                    val cachedAnnotations = rs.getString("cached_annotations").parseJSONObject<List<Map<String, Any>>>()
                    if(cachedAnnotations.isNotEmpty()) {
                        val keywords = StringUnionListType.getResult(rs, "keywords") ?: emptyList()
                        val annotations = cachedAnnotations.map { it["name"] as String }
                        val filtered = annotations - keywords.toSet()
                        if(filtered.isNotEmpty()) {
                            authors.add(Pair(rs.getInt("id"), filtered + keywords))
                        }
                    }
                }
            }
        }
        if(topics.isNotEmpty()) {
            db.batchUpdate(Topics) {
                for ((id, k) in topics) {
                    item {
                        where { it.id eq id }
                        set(it.keywords, k)
                    }
                }
            }
        }
        if(authors.isNotEmpty()) {
            db.batchUpdate(Authors) {
                for ((id, k) in authors) {
                    item {
                        where { it.id eq id }
                        set(it.keywords, k)
                    }
                }
            }
        }
        //读取全部keywords并写入keyword表
        val topicKeywords = db.from(Topics).select(Topics.keywords).where { Topics.keywords.isNotNull() }.map { it[Topics.keywords]!!.distinct() }.flatten().duplicateCount()
        val authorKeywords = db.from(Authors).select(Authors.keywords).where { Authors.keywords.isNotNull() }.map { it[Authors.keywords]!!.distinct() }.flatten().duplicateCount()
        if(topicKeywords.isNotEmpty() || authorKeywords.isNotEmpty()) {
            val now = Instant.now()
            db.batchInsert(Keywords) {
                for ((k, cnt) in topicKeywords) {
                    item {
                        set(it.tagType, MetaType.TOPIC)
                        set(it.keyword, k)
                        set(it.tagCount, cnt)
                        set(it.lastUsedTime, now)
                    }
                }
                for ((k, cnt) in authorKeywords) {
                    item {
                        set(it.tagType, MetaType.AUTHOR)
                        set(it.keyword, k)
                        set(it.tagCount, cnt)
                        set(it.lastUsedTime, now)
                    }
                }
            }
        }
    }

    /**
     * 由于调整了Collection的Tagme含义，需要统一跑一遍数据处理，使所有的Collection具有根据其子项计算的正确Tagme。
     */
    private fun processCollectionTagme(db: Database, t: Transaction) {
        val limit = 1000
        var offset = 0
        while(true) {
            val ids = db.from(Illusts).select(Illusts.id)
                .where { Illusts.type eq IllustModelType.COLLECTION }
                .limit(limit).offset(offset)
                .map { it[Illusts.id]!! }
            if(ids.isEmpty()) break
            offset += ids.size
            val groups = db.from(Illusts).select(Illusts.parentId, Illusts.tagme)
                .where { Illusts.type eq IllustModelType.IMAGE_WITH_PARENT and (Illusts.parentId inList ids) }
                .map { Pair(it[Illusts.parentId]!!, it[Illusts.tagme]!!) }
                .groupBy({ it.first }) { it.second }
                .mapValues { it.value.reduce { acc, tagme -> acc + tagme } }
            db.batchUpdate(Illusts) {
                for ((id, tagme) in groups) {
                    item {
                        where { it.id eq id }
                        set(it.tagme, tagme)
                    }
                }
            }
            log.info("processCollectionTagme: $offset processed.")
        }
        log.info("processCollectionTagme: process completed.")
    }
}