package com.heerkirov.hedge.server.components.appdata

import com.heerkirov.hedge.server.components.status.ControlledAppStatusDevice
import com.heerkirov.hedge.server.constants.Filename
import com.heerkirov.hedge.server.library.framework.Component
import com.heerkirov.hedge.server.utils.Fs
import com.heerkirov.hedge.server.utils.Json.toJSONString
import com.heerkirov.hedge.server.utils.migrations.VersionFileMigrator

/**
 * 与appdata中的`server.dat`数据文件对接。
 */
interface AppDataManager : Component {
    /**
     * 获得数据。
     */
    val appdata: AppData
    /**
     * storagePath访问控制器。
     */
    val storagePathAccessor: StoragePathAccessor
    /**
     * 保存数据。
     * @param call 在保存之前对appdata做修改
     */
    fun save(call: (AppData.() -> Unit)? = null)
}

class AppDataManagerImpl(channelPath: String) : AppDataManager, ControlledAppStatusDevice {
    private val serverDirPath = "$channelPath/${Filename.SERVER_DIR}"
    private val appDataPath = "$serverDirPath/${Filename.APPDATA_STORAGE_DAT}"

    private var _appdata: AppData? = null
    private var _storagePathAccessor: StoragePathAccessor? = null

    override val appdata: AppData get() = _appdata ?: throw RuntimeException("Appdata is not loaded yet.")
    override val storagePathAccessor: StoragePathAccessor get() = _storagePathAccessor ?: throw RuntimeException("Appdata is not loaded yet.")

    override fun load(migrator: VersionFileMigrator) {
        val appdataFile = Fs.readText(appDataPath)
        try {
            migrator.migrate(appdataFile, AppDataMigrationStrategy).let { (d, changed) ->
                if(changed) { Fs.writeText(appDataPath, d.toJSONString()) }
                _appdata = d
            }

            Fs.writeFile(appDataPath, _appdata)

        }catch (e: Throwable) {
            if(appdataFile == null) Fs.rm(appDataPath)
            _appdata = null
            throw e
        }

        _storagePathAccessor = StoragePathAccessor(serverDirPath, _appdata!!.service.storagePath)
    }

    override fun save(call: (AppData.() -> Unit)?) {
        if(_appdata == null) { throw RuntimeException("Appdata is not initialized.") }
        if(call != null) {
            _appdata?.call()
        }
        Fs.writeFile(appDataPath, _appdata!!)

        _storagePathAccessor!!.storagePath = _appdata!!.service.storagePath
    }
}

/**
 * storage path访问控制器。
 * 1. 直接提供storage path访问路径。
 * 2. 提供实时的storage path可用性检测。
 */
class StoragePathAccessor(private val serverDirPath: String, private var _storagePath: String?) {
    /**
     * 获得storage dir的路径。已经进行了补全，要使用自行拼凑$STORAGE_DIR/...即可。
     */
    val storageDir: String get() = _storageDir

    /**
     * 该路径是否是可访问的。
     * 默认路径不会不可访问，但是自定义路径存在这个可能，因为它不会自行创建。
     * 每次访问此变量，都会重新检查可访问性。
     */
    val accessible: Boolean get() = if(_storagePath != null) { Fs.exists(_storageDir) }else{ true }

    private var _storageDir: String = ""

    init {
        if(_storagePath == null) {
            this._storageDir = Fs.toAbsolutePath("$serverDirPath/${Filename.DEFAULT_STORAGE_DIR}")
            Fs.mkdir(this._storageDir)
        }else{
            this._storageDir = _storagePath!!
        }
    }

    internal var storagePath: String?
        get() = _storagePath
        set(value) {
            if(this._storagePath != value) {
                if(value == null) {
                    this._storageDir = Fs.toAbsolutePath("$serverDirPath/${Filename.DEFAULT_STORAGE_DIR}")
                    Fs.mkdir(this._storageDir)
                }else{
                    this._storageDir = value
                }
                this._storagePath = value
            }
        }
}