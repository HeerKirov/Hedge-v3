package com.heerkirov.hedge.server.components.lifetime

import com.heerkirov.hedge.server.application.ApplicationOptions
import com.heerkirov.hedge.server.library.framework.Component
import com.heerkirov.hedge.server.library.framework.MainThreadComponent
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import kotlin.system.exitProcess

/**
 * 负责生命周期维持的组件。在local模式下，server不允许无限制地在后台运行，需要各种机制来配合web、client、cli，确保它们在使用时server不会退出。
 * 1. 提供会话注册机制，提供给client使用。在建立ws连接时，同步注册会话ID。
 * 2. 提供单次信号机制，提供给cli使用。可以提交单次信号，在信号时间到达之前不会退出。
 * 3. 提供永久持续标记。在标记存在时不会退出。
 * 在remote模式下，生命周期组件将失去作用，仅保留session管理机制。
 */
interface Lifetime : Component {
    /**
     * 永久存续标记管理。当存在永久存续标记时，server不会退出。
     */
    val permanent: Permanent

    /**
     * 心跳状态管理。仍存在可用的心跳信号时，server不会退出。
     */
    val heartSignal: HeartSignal

    /**
     * 连接会话管理。仍存在已建立的维持连接时，server不会退出。
     */
    val session: Session

    /**
     * 提供对连接维护管理的单独组件。
     */
    interface Session {
        val sessions: Set<String>

        val anySession: Boolean

        operator fun get(sessionId: String): Boolean

        operator fun set(sessionId: String, stat: Boolean)
    }

    /**
     * 提供对永久维持机制维护管理的单独组件。
     */
    interface Permanent {
        val stats: Set<String>

        val anyPermanent: Boolean

        operator fun get(type: String): Boolean

        operator fun set(type: String, stat: Boolean)
    }

    /**
     * 提供对生命周期心跳信号机制维护的单独组件。
     */
    interface HeartSignal {
        val anySignal: Boolean

        val signal: Long?

        /**
         * 接收一个瞬时的心跳信号。
         * @param interval 此心跳信号的有效时长。
         */
        fun signal(interval: Long? = null)
    }
}

const val DEFAULT_SIGNAL_INTERVAL: Long = 1000L * 60

const val THREAD_INTERVAL: Long = 1000L * 60

/**
 * 本地部署模式的生命周期组件。它具有完整的生命周期控制功能。
 */
class LifetimeImpl(private val options: ApplicationOptions) : Lifetime, MainThreadComponent {
    private val log: Logger = LoggerFactory.getLogger(LifetimeImpl::class.java)

    override val heartSignal: HeartSignalImpl = HeartSignalImpl()
    override val permanent: PermanentImpl = PermanentImpl()
    override val session: SessionImpl = SessionImpl()

    override fun thread() {
        if(!options.remoteMode && !options.devMode) {
            //用作保底的例行检查线程。它以较低的频率循环检测所有生命体征是否存在，以避免出现任意失误导致进程不退出，或者没有初始连接导致无法退出
            while (true) {
                Thread.sleep(THREAD_INTERVAL)
                //进行信号清理
                heartSignal.update()
                //进行信号例行检查
                checkAlive()
            }
        }
    }

    private fun checkAlive() {
        if(!anySignal()) {
            //如果发现没有任何生命体征，则直接退出进程。推出进程会触发框架的关闭程序
            log.info("Nobody lives in lifetime.")
            exitProcess(0)
        }
    }

    private fun anySignal(): Boolean {
        if(permanent.anyPermanent) {
            //在开启永久模式时，不会执行其他判断，总是继续循环
            return true
        }else if(session.anySession) {
            //还存在未关闭的连接会话，意味着继续执行
            return true
        }else if(heartSignal.anySignal) {
            //还存在未过期的信号，意味着继续执行
            return true
        }
        return false
    }

    /**
     * 提供对连接维护管理的单独组件。
     */
    inner class SessionImpl : Lifetime.Session {
        private val _sessions = mutableSetOf<String>()

        override val sessions: Set<String> get() = _sessions

        override val anySession: Boolean get() = _sessions.isNotEmpty()

        override operator fun get(sessionId: String): Boolean {
            return sessionId in _sessions
        }

        override operator fun set(sessionId: String, stat: Boolean) {
            if(stat) {
                _sessions.add(sessionId)
            }else{
                _sessions.remove(sessionId)
                if(!options.remoteMode && !options.devMode) {
                    checkAlive()
                }
            }
        }
    }

    /**
     * 提供对永久维持机制维护管理的单独组件。
     */
    inner class PermanentImpl : Lifetime.Permanent {
        private val _stats = mutableSetOf<String>()

        override val stats: Set<String> get() = _stats

        override val anyPermanent: Boolean get() = _stats.isNotEmpty()

        override operator fun get(type: String): Boolean {
            return type in _stats
        }

        override operator fun set(type: String, stat: Boolean) {
            if(stat) {
                _stats.add(type)
            }else{
                _stats.remove(type)
                checkAlive()
            }
        }
    }

    /**
     * 提供对生命周期心跳信号机制维护的单独组件。
     */
    inner class HeartSignalImpl : Lifetime.HeartSignal {
        @Volatile private var _signal: Long? = null

        override val anySignal: Boolean get() = _signal != null

        override val signal: Long? get() = _signal

        /**
         * 接收一个瞬时的心跳信号。
         * @param interval 此心跳信号的有效时长。
         */
        override fun signal(interval: Long?) {
            synchronized(this) {
                val newSignal = System.currentTimeMillis() + (interval ?: DEFAULT_SIGNAL_INTERVAL)
                if(_signal == null || _signal!! < newSignal) {
                    _signal = newSignal
                }
            }
        }

        /**
         * 进行信号清理。
         */
        fun update() {
            val now = System.currentTimeMillis()
            if(_signal != null) {
                synchronized(this) {
                    if(_signal != null && _signal!! <= now) {
                        _signal = null
                    }
                }
            }
        }
    }
}

