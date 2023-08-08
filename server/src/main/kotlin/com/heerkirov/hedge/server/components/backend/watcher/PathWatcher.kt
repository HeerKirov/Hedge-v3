package com.heerkirov.hedge.server.components.backend.watcher

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.status.AppStatusDriver
import com.heerkirov.hedge.server.enums.AppLoadStatus
import com.heerkirov.hedge.server.events.PathWatcherStatusChanged
import com.heerkirov.hedge.server.exceptions.BusinessException
import com.heerkirov.hedge.server.exceptions.FileNotFoundError
import com.heerkirov.hedge.server.exceptions.IllegalFileExtensionError
import com.heerkirov.hedge.server.exceptions.StorageNotAccessibleError
import com.heerkirov.hedge.server.functions.manager.ImportManager
import com.heerkirov.hedge.server.library.framework.Component
import com.heerkirov.hedge.server.utils.tools.loopThread
import org.slf4j.LoggerFactory
import java.io.File
import java.nio.file.FileSystems
import java.nio.file.Path
import java.nio.file.StandardWatchEventKinds
import java.nio.file.WatchKey
import java.nio.file.WatchService
import java.util.concurrent.ConcurrentHashMap
import kotlin.concurrent.thread
import kotlin.io.path.*

interface PathWatcher : Component {
    var isOpen: Boolean
    val statisticCount: Int
    val errors: List<PathWatcherError>
}

class PathWatcherImpl(private val appStatus: AppStatusDriver,
                      private val appdata: AppDataManager,
                      private val bus: EventBus,
                      private val importManager: ImportManager) : PathWatcher {
    private val log = LoggerFactory.getLogger(PathWatcherImpl::class.java)

    private var _watcher: WatchService? = null
    private var _moveFile: Boolean = false
    private var _isOpen: Boolean = false
    private var _statisticCount: Int = 0
    private val _errors: MutableList<PathWatcherError> = mutableListOf()

    private val controller = loopThread(false, ::pollThread)

    private val keyToPaths: MutableMap<WatchKey, Path> = ConcurrentHashMap<WatchKey, Path>()

    override var isOpen: Boolean
        get() = _isOpen
        set(value) {
            _isOpen = value
            if(value) startWatcher() else stopWatcher()
            bus.emit(PathWatcherStatusChanged(isOpen, statisticCount, errors))
        }

    override val statisticCount: Int get() = _statisticCount

    override val errors: List<PathWatcherError> get() = _errors

    override fun load() {
        if(appStatus.status == AppLoadStatus.READY && appdata.setting.import.autoWatchPath) {
            isOpen = true
        }
    }

    override fun close() {
        stopWatcher()
    }

    private fun startWatcher() {
        _errors.clear()
        _statisticCount = 0
        _moveFile = appdata.setting.import.watchPathMoveFile
        if(_watcher == null) {
            _watcher = FileSystems.getDefault().newWatchService()
        }
        if(appdata.setting.import.watchPaths.isEmpty()) {
            _errors.add(PathWatcherError("", PathWatcherErrorReason.NO_USEFUL_PATH))
            return
        }
        for (watchPath in appdata.setting.import.watchPaths) {
            val path = Path(watchPath)
            if(!path.exists()) {
                _errors.add(PathWatcherError(watchPath, PathWatcherErrorReason.PATH_NOT_EXIST))
                continue
            }
            if(!path.isDirectory()) {
                _errors.add(PathWatcherError(watchPath, PathWatcherErrorReason.PATH_IS_NOT_DIRECTORY))
                continue
            }
            val key = try {
                path.register(_watcher!!, StandardWatchEventKinds.ENTRY_CREATE)
            }catch (e: Exception) {
                _errors.add(PathWatcherError(watchPath, PathWatcherErrorReason.PATH_WATCH_FAILED))
                continue
            }
            keyToPaths[key] = path
        }

        if(keyToPaths.isNotEmpty()) {
            controller.start()
        }

        if(appdata.setting.import.watchPathInitialize) {
            thread {
                keyToPaths.values.forEach(::scanAllFiles)
            }
        }
    }

    private fun stopWatcher() {
        keyToPaths.clear()
        if(controller.isAlive) {
            controller.stop(force = true)
        }
        if(_watcher != null) {
            _watcher!!.close()
            _watcher = null
        }
    }

    private fun pollThread() {
        val key = try {
            _watcher!!.take()
        }catch (e: InterruptedException) {
            return
        }
        val basePath = keyToPaths[key]
        if(basePath == null) {
            key.cancel()
            return
        }

        var changed = false

        val files = key.pollEvents()
            .asSequence()
            .filter { it.kind() != StandardWatchEventKinds.OVERFLOW }
            .map { (it.context() as Path).pathString }
            .map { Path(basePath.pathString, it) }
            .map { it.absolutePathString() }
            .toList()

        try {
            //奇特特性：如果不加延迟地立刻读取文件，那么会读不出来正确的modifiedTime/createTime。可能是因为刚建立的文件还没来得及写入…
            Thread.sleep(500)
        }catch (e: InterruptedException) {
            return
        }

        val success = processFiles(files)

        if(success > 0) {
            _statisticCount += success
            changed = true
        }

        if(!key.reset()) {
            keyToPaths.remove(key)
            _errors.add(PathWatcherError(basePath.pathString, PathWatcherErrorReason.PATH_NO_LONGER_AVAILABLE))
            if(keyToPaths.isEmpty()) {
                controller.stop()
            }
            changed = true
        }

        if(changed) bus.emit(PathWatcherStatusChanged(isOpen, statisticCount, errors))
    }

    private fun scanAllFiles(dirPath: Path) {
        val file = File(dirPath.absolutePathString())
        val listFiles = file.listFiles()!!.filter { it.isFile }.map { it.absolutePath }
        val success = processFiles(listFiles)
        if(success > 0) {
            _statisticCount += success
            bus.emit(PathWatcherStatusChanged(isOpen, statisticCount, errors))
        }
    }

    private fun processFiles(files: List<String>): Int {
        var cnt = 0
        for (file in files) {
            try {
                importManager.import(file, mobileImport = _moveFile)
                cnt += 1
            }catch (e: BusinessException) {
                if(e.exception is IllegalFileExtensionError || e.exception is FileNotFoundError || e.exception is StorageNotAccessibleError) {
                    //ignore this file
                }else{
                    log.warn("Import file['$file'] failed: ${e.exception.message}")
                }
            }catch (e: Exception) {
                log.warn("Import file['$file'] failed. ", e)
            }
        }
        return cnt
    }
}

data class PathWatcherError(val path: String, val reason: PathWatcherErrorReason)

enum class PathWatcherErrorReason {
    NO_USEFUL_PATH,
    PATH_NOT_EXIST,
    PATH_IS_NOT_DIRECTORY,
    PATH_WATCH_FAILED,
    PATH_NO_LONGER_AVAILABLE
}