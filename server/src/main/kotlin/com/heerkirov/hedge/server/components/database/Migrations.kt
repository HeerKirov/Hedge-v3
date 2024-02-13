package com.heerkirov.hedge.server.components.database

import com.heerkirov.hedge.server.dao.BookImageRelations
import com.heerkirov.hedge.server.dao.FolderImageRelations
import com.heerkirov.hedge.server.dao.Illusts
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.utils.Resources
import com.heerkirov.hedge.server.utils.SqlDelimiter
import com.heerkirov.hedge.server.utils.migrations.*
import org.ktorm.database.Database
import org.ktorm.database.Transaction
import org.ktorm.dsl.*
import java.time.Instant
import java.time.ZoneId

object DatabaseMigrationStrategy : SimpleStrategy<Database>() {
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
    }

    /**
     * 向database应用resources资源文件中的sql文件。
     */
    private fun Transaction.useSQLResource(version: Version, arguments: Map<String, String>? = null) {
        connection.createStatement().use { stat ->
            if(arguments != null) {
                Resources.getResourceAsText("migrations/v$version.tpl.sql").let { SqlDelimiter.render(it, arguments) }
            }else{
                Resources.getResourceAsText("migrations/v$version.sql")
            }.let { SqlDelimiter.splitByDelimiter(it) }.forEach { stat.execute(it) }
        }
    }

    /**
     * 直接向database应用一个以sql文件同步为全部内容的版本。
     */
    private fun MigrationRegister<Database>.useSQL(version: String, addonFunc: ((Database) -> Unit)? = null): MigrationRegister<Database> {
        return this.map(version) { db ->
            db.apply {
                transactionWithCtx {
                    it.useSQLResource(versionOf(version))
                    addonFunc?.invoke(this)
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
    private fun initializeIllustCacheBookAndFavorite(db: Database) {
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
}