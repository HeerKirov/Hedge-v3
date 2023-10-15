package com.heerkirov.hedge.server.components.database

import com.heerkirov.hedge.server.utils.Resources
import com.heerkirov.hedge.server.utils.SqlDelimiter
import com.heerkirov.hedge.server.utils.migrations.*
import org.ktorm.database.Database
import org.ktorm.database.Transaction
import java.time.Instant
import java.time.ZoneId

object DatabaseMigrationStrategy : SimpleStrategy<Database>() {
    override fun migrations(register: MigrationRegister<Database>) {
        register.useSQL("0.1.0")
        register.useSQLTemplate("0.1.3", ::generateTimestampOffset)
        register.useSQL("0.1.4")
        register.useSQLTemplate("0.1.5", ::generateTimestampOffset)
        register.useSQL("0.3.0")
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
    private fun MigrationRegister<Database>.useSQL(version: String): MigrationRegister<Database> {
        return this.map(version) { db ->
            db.apply { transaction { it.useSQLResource(versionOf(version)) } }
        }
    }

    /**
     * 向database应用一个sql模板文件。
     */
    private fun MigrationRegister<Database>.useSQLTemplate(version: String, generator: () -> Map<String, String>): MigrationRegister<Database> {
        return this.map(version) { db ->
            db.apply { transaction { it.useSQLResource(versionOf(version), generator()) } }
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
}