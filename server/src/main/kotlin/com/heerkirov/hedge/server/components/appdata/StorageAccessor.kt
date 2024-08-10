package com.heerkirov.hedge.server.components.appdata

import com.heerkirov.hedge.server.application.ApplicationOptions
import com.heerkirov.hedge.server.constants.Filename
import com.heerkirov.hedge.server.utils.Fs
import java.io.File
import java.util.LinkedList

/**
 * storage path访问控制器。
 * 1. 直接提供storage path访问路径。
 * 2. 提供实时的storage path可用性检测。
 */
class StorageAccessor(private val options: ApplicationOptions, private var _storagePath: String?) {
    /**
     * 获得storage dir的路径。已经进行了补全，要使用自行拼凑$STORAGE_DIR/...即可。
     */
    val storageDir: String get() = _storageDir

    /**
     * storage dir路径是否是可访问的。
     * 默认路径一定是可访问的，但是自定义路径存在不可达的可能，因为它不会自行创建。
     */
    val accessible: Boolean get() = if(_storagePath != null) { Fs.exists(_storageDir) }else{ true }

    /**
     * 获得storage dir的总大小。每次都会重算，所以当心开销。
     */
    val storageSize: Long get() {
        var sum = 0L
        val queue = LinkedList<File>()
        queue.add(File(storageDir))

        while(queue.isNotEmpty()) {
            val dir = queue.pop()
            for(f in dir.listFiles()!!) {
                if(f.isDirectory) {
                    queue.add(f)
                }else if(f.isFile) {
                    sum += f.length()
                }
            }
        }

        return sum
    }

    private var _storageDir: String = ""

    init {
        if(options.remoteMode) {
            this._storageDir = options.storageDir ?: Fs.toAbsolutePath("${options.serverDir}/${Filename.DEFAULT_STORAGE_DIR}")
            Fs.mkdir(this._storageDir)
        }else if(_storagePath == null) {
            this._storageDir = Fs.toAbsolutePath("${options.serverDir}/${Filename.DEFAULT_STORAGE_DIR}")
            Fs.mkdir(this._storageDir)
        }else{
            this._storageDir = _storagePath!!
        }
    }

    internal fun setStoragePath(value: String?) {
        if(options.remoteMode) throw RuntimeException("Cannot set storage path in remote mode.")
        if(this._storagePath != value) {
            this._storagePath = value
            if(value == null) {
                this._storageDir = Fs.toAbsolutePath("${options.serverDir}/${Filename.DEFAULT_STORAGE_DIR}")
                Fs.mkdir(this._storageDir)
            }else{
                this._storageDir = value
            }
        }
    }
}