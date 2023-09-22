package com.heerkirov.hedge.server.components.database

import com.heerkirov.hedge.server.utils.Resources
import com.heerkirov.hedge.server.utils.SqlDelimiter
import com.heerkirov.hedge.server.utils.migrations.*
import org.ktorm.database.Database
import java.time.Instant
import java.time.ZoneId

object DatabaseMigrationStrategy : SimpleStrategy<Database>() {
    override fun migrations(register: MigrationRegister<Database>) {
        register.useSQL("0.1.0")
        register.map("0.1.3", ::migrateTimestampTranslate)
        register.useSQL("0.1.4")
    }

    /**
     * 向database应用resources资源文件中的sql文件。
     */
    private fun Database.useSQLResource(version: Version): Database {
        transaction { t ->
            t.connection.createStatement().use { stat ->
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

    /**
     * 在0.1.3版本，调整了dao层所有timestamp的实现，修正了问题，因此现有数据库的所有时间都需要手动调整。
     * 具体调整为追加用户当前时区的ZoneOffset。因为之前的用法错误，导致数据库中记录的时间比UTC时间多了一倍的ZoneOffset。
     */
    private fun migrateTimestampTranslate(db: Database): Database {
        //使用一个简单粗暴的算法获得时间差。这并不是严谨的时区处理方式，但要对db中的每一个时间做严谨转换有点太麻烦了且毫无必要。
        val now = Instant.now()
        val offsetMills = now.atZone(ZoneId.systemDefault()).withZoneSameLocal(ZoneId.of("UTC")).toInstant().toEpochMilli() - now.toEpochMilli()
        if(offsetMills != 0L) {
            val offset = "($offsetMills)"
            db.transaction { t ->
                t.connection.createStatement().use { stat ->
                    stat.execute("update illust set create_time = create_time + $offset, update_time = update_time + $offset")
                    stat.execute("update book set create_time = create_time + $offset, update_time = update_time + $offset")
                    stat.execute("update folder set create_time = create_time + $offset, update_time = update_time + $offset")
                    stat.execute("update trashed_image set create_time = create_time + $offset, update_time = update_time + $offset, trashed_time = trashed_time + $offset")
                    stat.execute("update meta_db.tag set create_time = create_time + $offset, update_time = update_time + $offset")
                    stat.execute("update meta_db.author set create_time = create_time + $offset, update_time = update_time + $offset")
                    stat.execute("update meta_db.topic set create_time = create_time + $offset, update_time = update_time + $offset")
                    stat.execute("update meta_db.annotation set create_time = create_time + $offset")
                    stat.execute("update import_image set create_time = create_time + $offset, file_create_time = file_create_time + $offset, file_update_time = file_update_time + $offset, file_import_time = file_import_time + $offset")
                    stat.execute("update source_db.source_data set create_time = create_time + $offset, update_time = update_time + $offset")
                    stat.execute("update source_db.source_mark set record_time = record_time + $offset")
                    stat.execute("update file_db.file set create_time = create_time + $offset, update_time = update_time + $offset")
                    stat.execute("update file_db.file_fingerprint set create_time = create_time + $offset")
                    stat.execute("update file_db.file_cache_record set last_access_time = last_access_time + $offset")
                    stat.execute("update system_db.exporter_record set create_time = create_time + $offset")
                    stat.execute("update system_db.find_similar_task set record_time = record_time + $offset")
                    stat.execute("update system_db.find_similar_result set record_time = record_time + $offset")
                    stat.execute("update system_db.find_similar_ignored set record_time = record_time + $offset")
                }
            }
        }
        return db
    }
}