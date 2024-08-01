package com.heerkirov.hedge.server.components.health

import com.heerkirov.hedge.server.library.framework.Component
import com.heerkirov.hedge.server.constants.Filename
import com.heerkirov.hedge.server.utils.Fs
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import kotlin.system.exitProcess

/**
 * 负责健康状况检查和监视的组件。
 * 1. 封装对PID文件的读写。
 * 2. 应用程序启动时检测重复的进程。
 * 3. 可查询应用程序的初始化和创建状态。
 */
interface Health : Component {
    fun save(port: Int? = null, token: String? = null): Health
}

class HealthImpl(private val serverPath: String) : Health {
    private val log: Logger = LoggerFactory.getLogger(HealthImpl::class.java)

    private val pidPath: String = "${serverPath}/${Filename.SERVER_PID}"

    private val pid: Long = ProcessHandle.current().pid()
    private val model: PIDModel

    private var initialized: Boolean = false

    init {
        checkCurrentProcess()
        model = PIDModel(pid, null, null, System.currentTimeMillis())
        save()
        initialized = true
    }

    private fun checkCurrentProcess() {
        Fs.mkdir(serverPath)
        val f = Fs.readFile<PIDModel>(pidPath)
        if(f != null && f.pid != pid && ProcessHandle.of(f.pid).isPresent) {
            log.info("Hedge server has been running with PID ${f.pid}. Exit current progress.")
            exitProcess(0)
        }
    }

    override fun save(port: Int?, token: String?): HealthImpl {
        if(port != null) { model.port = port }
        if(token != null) { model.token = token }
        Fs.writeFile(pidPath, model)
        return this
    }

    override fun close() {
        //initialized值用于防止意外的对server.pid的更改。此值为true时表明当前进程确实是有效进程，因此在close时拥有对server.pid的删除权。
        if(initialized) {
            Fs.rm(pidPath)
        }
    }
}