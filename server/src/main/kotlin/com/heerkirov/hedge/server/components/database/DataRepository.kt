package com.heerkirov.hedge.server.components.database

import com.heerkirov.hedge.server.components.status.ControlledAppStatusDevice
import com.heerkirov.hedge.server.constants.Filename
import com.heerkirov.hedge.server.library.framework.Component
import com.heerkirov.hedge.server.utils.Fs
import com.heerkirov.hedge.server.utils.Json.toJSONString
import com.heerkirov.hedge.server.utils.ktorm.HedgeDialect
import com.heerkirov.hedge.server.utils.migrations.VersionFileMigrator
import org.ktorm.database.Database
import org.ktorm.database.Transaction
import org.ktorm.database.TransactionIsolation
import java.lang.RuntimeException
import java.sql.Connection
import java.sql.DriverManager

/**
 * 对接数据库的实现。包括sqlite DB和setting部分。
 */
interface DataRepository : Component {
    /**
     * 取得db连接。使用此连接完成read操作。
     */
    val db: Database
    /**
     * 获得设置选项。也就是那些没有存在数据库里的数据。
     */
    val setting: Setting
    /**
     * 保存设置选项。
     */
    fun saveSetting()
}

class DataRepositoryImpl(channelPath: String) : DataRepository, ControlledAppStatusDevice {
    private val serverDirPath = "$channelPath/${Filename.SERVER_DIR}"
    private val settingFilePath = "$serverDirPath/${Filename.SETTING_STORAGE_DAT}"

    private var _conn: Connection? = null
    private var _db: Database? = null
    private var _setting: Setting? = null

    override val db: Database get() = _db ?: throw RuntimeException("DB is not loaded yet.")
    override val setting: Setting get() = _setting ?: throw RuntimeException("DB is not loaded yet.")

    override fun load(migrator: VersionFileMigrator) {
        val connection = DriverManager.getConnection("jdbc:sqlite:$serverDirPath/${Filename.DATA_SQLITE}")
        connection.attach("$serverDirPath/${Filename.META_SQLITE}", "meta_db")
        connection.attach("$serverDirPath/${Filename.FILE_SQLITE}", "file_db")
        connection.attach("$serverDirPath/${Filename.SOURCE_SQLITE}", "source_db")
        connection.attach("$serverDirPath/${Filename.SYSTEM_SQLITE}", "system_db")

        _conn = connection
        _db = Database.connect(dialect = HedgeDialect()) {
            object : Connection by connection {
                override fun close() { /* do nothing */ }
            }
        }

        migrator.migrate(_db!!, DatabaseMigrationStrategy)
        migrator.migrate(Fs.readText(settingFilePath), MetadataMigrationStrategy).let { (d, changed) ->
            if(changed) { Fs.writeText(settingFilePath, d.toJSONString()) }
            _setting = d
        }
    }

    override fun close() {
        _conn?.close()
    }

    override fun saveSetting() {
        if(_setting != null) {
            Fs.writeFile(settingFilePath, _setting)
        }else{
            throw RuntimeException("DB is not loaded yet.")
        }
    }
}

/**
 * 向connection附加一个数据库。
 */
private fun Connection.attach(path: String, name: String) {
    prepareStatement("attach database ? as ?").use { stat ->
        stat.setString(1, path)
        stat.setString(2, name)
        stat.execute()
    }
}

/**
 * 开始一个事务会话。在业务中，任何write操作，都应使用此包装的会话。不要直接使用Database::useTransaction会话。
 * - 此函数默认使用了level 8的事务级别，以适配SQLite引擎。
 * - 此函数使用了synchronized同步锁，确保全局总是只有单一write调用。为了防止过多的阻塞，纯read的业务不要使用事务。
 */
inline fun <T> Database.transaction(func: (Transaction) -> T): T {
    synchronized(this) {
        return useTransaction(TransactionIsolation.SERIALIZABLE, func)
    }
}

/**
 * 开始一个对metadata的同步锁，确保全局总是只有单一write调用。
 */
inline fun <T> DataRepository.syncSetting(func: DataRepository.() -> T): T {
    synchronized(this.setting) {
        return this.func()
    }
}

/**
 * 保存数据，并在之前执行一段处理代码。
 */
inline fun DataRepository.saveSetting(call: Setting.() -> Unit) {
    this.setting.call()
    saveSetting()
}
