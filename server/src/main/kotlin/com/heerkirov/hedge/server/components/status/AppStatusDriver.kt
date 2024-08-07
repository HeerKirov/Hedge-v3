package com.heerkirov.hedge.server.components.status

import com.heerkirov.hedge.server.application.ApplicationOptions
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.constants.Filename
import com.heerkirov.hedge.server.enums.AppLoadStatus
import com.heerkirov.hedge.server.events.AppStatusChanged
import com.heerkirov.hedge.server.library.framework.Component
import com.heerkirov.hedge.server.library.framework.FrameworkContext
import com.heerkirov.hedge.server.utils.Fs
import com.heerkirov.hedge.server.utils.migrations.VersionFileMigrator

/**
 * App状态驱动控制器：控制`version.lock`文件的版本号，并控制其他存储组件更新版本；同时，据此控制App的加载状态。
 */
interface AppStatusDriver : Component {
    /**
     * App加载状态。
     */
    val status: AppLoadStatus

    /**
     * 对App执行初始化。
     */
    fun initialize()
}

/**
 * 受控的存储组件。这些组件的初始化状态和版本同步状态会受到控制中心的驱动。
 */
interface ControlledAppStatusDevice {
    /**
     * 初始化此组件，并使用Migrator进行版本同步。
     */
    fun load(migrator: VersionFileMigrator)
}

class AppStatusDriverImpl(private val context: FrameworkContext, private val bus: EventBus, private val options: ApplicationOptions) : AppStatusDriver {
    private val versionLockPath = "${options.serverDir}/${Filename.VERSION_LOCK}"

    private var _status: AppLoadStatus = AppLoadStatus.NOT_INITIALIZED

    override val status: AppLoadStatus get() = _status

    override fun load() {
        if(!Fs.exists(versionLockPath)) {
            if(options.remoteMode) {
                initialize()
            }
        }else{
            _status = AppLoadStatus.LOADING
            bus.emit(AppStatusChanged(AppLoadStatus.LOADING))

            executeMigrate()

            _status = AppLoadStatus.READY
            bus.emit(AppStatusChanged(AppLoadStatus.READY))
        }
    }

    override fun initialize() {
        if(_status == AppLoadStatus.NOT_INITIALIZED) {
            _status = AppLoadStatus.INITIALIZING
            bus.emit(AppStatusChanged(AppLoadStatus.INITIALIZING))

            executeMigrate()

            _status = AppLoadStatus.READY
            bus.emit(AppStatusChanged(AppLoadStatus.READY))
        }
    }

    private fun executeMigrate() {
        val versionFileMigrator = VersionFileMigrator(versionLockPath)
        for (device in context.getComponents().filterIsInstance<ControlledAppStatusDevice>()) {
            device.load(versionFileMigrator)
        }
        versionFileMigrator.save()
    }
}