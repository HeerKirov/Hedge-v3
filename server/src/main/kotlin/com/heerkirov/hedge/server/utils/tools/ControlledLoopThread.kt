package com.heerkirov.hedge.server.utils.tools

import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.Future
import kotlin.concurrent.thread

interface ControlledThread {
    val isAlive: Boolean
    fun start()
    fun stop(force: Boolean = false)
}

abstract class ControlledLoopThread(start: Boolean = false) : ControlledThread {
    private var thread: Thread? = null

    init {
        if(start) {
            this.start()
        }
    }

    /**
     * 查看任务的活跃状态。
     */
    final override var isAlive: Boolean = false
        private set

    /**
     * 启动任务。
     */
    override fun start() {
        synchronized(this) {
            if(!isAlive) {
                this.thread = thread(isDaemon = true, block = ::loop)
                isAlive = true
            }
        }
    }

    /**
     * 停止任务。
     * @param force 强制关闭任务，这将使用interrupt打断线程。
     */
    override fun stop(force: Boolean) {
        synchronized(this) {
            if(isAlive) {
                isAlive = false

                val thread = this.thread
                if(force && thread != null && thread.isAlive) {
                    thread.interrupt()
                }
                this.thread = null
            }
        }
    }

    private fun loop() {
        while(isAlive) {
            try {
                run()
            }catch (e: InterruptedException) {
                continue
            }catch(e: Exception) {
                isAlive = false
                throw e
            }
        }
    }

    abstract fun run()
}

abstract class ControlledLoopPoolThread(start: Boolean = false, private val pool: ExecutorService = Executors.newSingleThreadExecutor()) : ControlledThread {
    private var future: Future<*>? = null

    init {
        if(start) {
            this.start()
        }
    }

    /**
     * 查看任务的活跃状态。
     */
    final override var isAlive: Boolean = false
        private set

    /**
     * 启动任务。
     */
    override fun start() {
        synchronized(this) {
            if(!isAlive) {
                this.future = pool.submit(::loop)
                isAlive = true
            }
        }
    }

    /**
     * 停止任务。
     * @param force 强制关闭任务，这将使用interrupt打断线程。
     */
    override fun stop(force: Boolean) {
        synchronized(this) {
            if(isAlive) {
                isAlive = false

                val future = this.future
                if(force && future != null && !(future.isDone || future.isCancelled)) {
                    future.cancel(true)
                }
                this.future = null
            }
        }
    }

    private fun loop() {
        while(isAlive) {
            try {
                run()
            }catch (e: InterruptedException) {
                continue
            }catch(e: Exception) {
                isAlive = false
                throw e
            }
        }
    }

    abstract fun run()
}

/**
 * 产生一个受控线程。这是一个长期任务类的持久化线程，被控制器控制启动或停止。
 * @param thread 任务启动后，call函数将作为daemon thread无限运行。
 */
inline fun loopThread(start: Boolean = false, crossinline thread: () -> Unit): ControlledThread {
    return object : ControlledLoopThread(start) {
        override fun run() {
            thread()
        }
    }
}

/**
 * 产生一个受控线程。这是一个长期任务类的持久化线程，被控制器控制启动或停止。
 * @param thread 任务启动后，call函数将作为daemon thread无限运行。
 */
inline fun loopPoolThread(start: Boolean = false, crossinline thread: () -> Unit): ControlledThread {
    return object : ControlledLoopPoolThread(start) {
        override fun run() {
            thread()
        }
    }
}