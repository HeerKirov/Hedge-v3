package com.heerkirov.hedge.server.utils.tools

import java.io.Closeable
import kotlin.concurrent.thread

/**
 * 产生一个自动控制关闭的对象代理。
 * - 获取此对象时，根据委托创建新对象。
 * - 经过一段时间没有调用后，自动关闭并销毁此对象。
 * - 调用对象回重置销毁计时器。
 */
class AutoCloseableComponent<T : Closeable>(private val timeout: Long, private val newObject: () -> T) : Closeable {
    private var obj: T? = null
    private var timeoutAt: Long? = null
    private var open: Boolean = true

    val value: T get() {
        synchronized(this) {
            if(obj == null) {
                obj = newObject()
                thread(isDaemon = true, block = ::daemonTimer)
            }
            timeoutAt = System.currentTimeMillis() + timeout

            return obj!!
        }
    }

    fun forceReCreate(): T {
        synchronized(this) {
            if(obj == null) {
                obj = newObject()
                timeoutAt = System.currentTimeMillis() + timeout
                thread(isDaemon = true, block = ::daemonTimer)
            }else{
                obj!!.close()
                obj = newObject()
                timeoutAt = System.currentTimeMillis() + timeout
            }
            return obj!!
        }
    }

    private fun daemonTimer() {
        var sleep = timeout
        while (true) {
            Thread.sleep(sleep)
            val current = System.currentTimeMillis()
            val timeoutAt = this.timeoutAt
            if(open && timeoutAt != null && timeoutAt > current) {
                sleep = timeoutAt - current + 100 //多给了100ms
                continue
            }else{
                synchronized(this) {
                    if(obj != null) {
                        obj!!.close()
                        obj = null
                    }
                    this.timeoutAt = null
                }
                break
            }
        }
    }

    override fun close() {
        open = false
        synchronized(this) {
            if(obj != null) {
                obj!!.close()
                obj = null
            }
        }
    }
}