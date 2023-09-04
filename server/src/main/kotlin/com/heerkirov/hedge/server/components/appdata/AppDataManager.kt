package com.heerkirov.hedge.server.components.appdata

import com.heerkirov.hedge.server.components.status.ControlledAppStatusDevice
import com.heerkirov.hedge.server.constants.Filename
import com.heerkirov.hedge.server.library.framework.Component
import com.heerkirov.hedge.server.utils.Fs
import com.heerkirov.hedge.server.utils.migrations.VersionFileMigrator

/**
 * 与appdata中的`server.dat`数据文件对接。
 */
interface AppDataManager : Component {
    /**
     * 获得数据。
     */
    val setting: AppData
    /**
     * 保存数据。
     */
    fun saveSetting()
    /**
     * storage访问控制器。
     */
    val storage: StorageAccessor
}

class AppDataManagerImpl(channelPath: String) : AppDataManager, ControlledAppStatusDevice {
    private val serverDirPath = "$channelPath/${Filename.SERVER_DIR}"
    private val appDataPath = "$serverDirPath/${Filename.APPDATA_STORAGE_DAT}"

    private var _appdata: AppData? = null
    private var _storage: StorageAccessor? = null

    override val setting: AppData get() = _appdata ?: throw RuntimeException("Appdata is not loaded yet.")
    override val storage: StorageAccessor get() = _storage ?: throw RuntimeException("Appdata is not loaded yet.")

    override fun load(migrator: VersionFileMigrator) {
        val appdataFile = Fs.readText(appDataPath)
        try {
            val (d, changed) = migrator.migrate("[AppData]", appdataFile, AppDataMigrationStrategy)
            if(changed) { Fs.writeFile(appDataPath, d) }
            _appdata = d
        }catch (e: Throwable) {
            if(appdataFile == null) Fs.rm(appDataPath)
            _appdata = null
            throw e
        }

        _storage = StorageAccessor(serverDirPath, _appdata!!.storage.storagePath)
    }

    override fun saveSetting() {
        if(_appdata == null) { throw RuntimeException("Appdata is not initialized.") }
        Fs.writeFile(appDataPath, _appdata!!)

        _storage!!.setStoragePath(_appdata!!.storage.storagePath)
    }
}


/**
 * 开启一个对appdata的同步锁，然后保存数据。确保全局总是只有单一write调用，不会并发写。
 */
inline fun AppDataManager.saveSetting(call: AppData.() -> Unit) {
    synchronized(this.setting) {
        this.setting.call()
        saveSetting()
    }
}
