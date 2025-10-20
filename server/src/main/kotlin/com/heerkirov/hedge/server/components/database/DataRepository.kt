package com.heerkirov.hedge.server.components.database

import com.heerkirov.hedge.server.components.status.ControlledAppStatusDevice
import com.heerkirov.hedge.server.constants.Filename
import com.heerkirov.hedge.server.library.framework.Component
import com.heerkirov.hedge.server.utils.ktorm.HedgeDialect
import com.heerkirov.hedge.server.utils.migrations.VersionFileMigrator
import org.apache.commons.dbcp2.BasicDataSource
import org.ktorm.database.Database
import org.ktorm.database.Transaction
import org.ktorm.database.TransactionIsolation
import java.lang.RuntimeException
import kotlin.math.max


/**
 * 对接数据库的实现。包括sqlite DB和setting部分。
 */
interface DataRepository : Component {
    /**
     * 取得db连接。使用此连接完成read操作。
     */
    val db: Database
}

class DataRepositoryImpl(private val serverPath: String) : DataRepository, ControlledAppStatusDevice {
    private var _pool: BasicDataSource? = null
    private var _db: Database? = null

    override val db: Database get() = _db ?: throw RuntimeException("DB is not loaded yet.")

    override fun load(migrator: VersionFileMigrator) {
        val core = Runtime.getRuntime().availableProcessors()
        _pool = BasicDataSource().apply {
            driverClassName = "org.sqlite.JDBC"
            url = "jdbc:sqlite:$serverPath/${Filename.DATA_SQLITE}?journal_mode=WAL"
            initialSize = 1
            maxTotal = core
            maxIdle = max((core + 1) / 2, 2)
            minIdle = 2
            connectionInitSqls = listOf(
                attachSql("$serverPath/${Filename.META_SQLITE}", "meta_db"),
                attachSql("$serverPath/${Filename.FILE_SQLITE}", "file_db"),
                attachSql("$serverPath/${Filename.SOURCE_SQLITE}", "source_db"),
                attachSql("$serverPath/${Filename.SYSTEM_SQLITE}", "system_db")
            )
        }

        _db = Database.connect(_pool!!, dialect = HedgeDialect())

        migrator.migrate("[Database]", _db!!, DatabaseMigrationStrategy)
    }

    override fun close() {
        _pool?.close()
    }
}

private fun attachSql(path: String, name: String): String {
    return "attach database '$path' as '$name'"
}

/**
 * 开始一个事务会话。在业务中，任何write操作，都应使用此包装的会话。不要直接使用Database::useTransaction会话。
 * - 此函数默认使用了level 8的事务级别，以适配SQLite引擎。
 * - 此函数使用了synchronized同步锁，确保全局总是只有单一write调用。为了防止过多的阻塞，纯read的业务不要使用事务。
 */
inline fun <T> Database.transaction(func: () -> T): T {
    synchronized(this) {
        return useTransaction(TransactionIsolation.SERIALIZABLE) { func() }
    }
}

/**
 * 开始一个事务会话。在业务中，任何write操作，都应使用此包装的会话。不要直接使用Database::useTransaction会话。
 * - 此函数默认使用了level 8的事务级别，以适配SQLite引擎。
 * - 此函数使用了synchronized同步锁，确保全局总是只有单一write调用。为了防止过多的阻塞，纯read的业务不要使用事务。
 */
inline fun <T> Database.transactionWithCtx(func: (Transaction) -> T): T {
    synchronized(this) {
        return useTransaction(TransactionIsolation.SERIALIZABLE, func)
    }
}
