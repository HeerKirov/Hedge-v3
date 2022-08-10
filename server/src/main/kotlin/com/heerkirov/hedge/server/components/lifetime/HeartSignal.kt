package com.heerkirov.hedge.server.components.lifetime

import com.heerkirov.hedge.server.utils.Token
import java.util.concurrent.ConcurrentHashMap

/**
 * 提供对生命周期心跳信号机制维护的单独组件。
 */
class HeartSignal(private val options: LifetimeOptions) {
    private val _clients: MutableMap<String, LifetimeRow> = ConcurrentHashMap()
    @Volatile private var _signal: Long? = null

    val anySignal: Boolean get() = _clients.isNotEmpty() || _signal != null

    val clients: Map<String, Long> get() = _clients.mapValues { (_, r) -> r.timestamp }

    val signal: Long? get() = _signal

    /**
     * 接收一个瞬时的心跳信号。
     * @param interval 此心跳信号的有效时长。
     */
    fun signal(interval: Long? = null) {
        synchronized(this) {
            val newSignal = System.currentTimeMillis() + (interval ?: options.defaultSignalInterval)
            if(_signal == null || _signal!! < newSignal) {
                _signal = newSignal
            }
        }
    }

    /**
     * 注册一个新的客户端心跳信号。
     * @param interval 此客户端的心跳信号时长。未指定时使用默认值。
     * @return 新客户端的响应id。
     */
    fun register(interval: Long? = null): String {
        val id = Token.uuid()
        val now = System.currentTimeMillis()
        val realInterval = interval ?: options.defaultSignalInterval
        _clients[id] = LifetimeRow(now + realInterval, realInterval)
        return id
    }

    /**
     * 接收一个客户端的心跳信号。
     * 如果此客户端id不存在，会直接创建此客户端。如果此时没有指定interval会使用默认值。
     * @param lifetimeId 客户端id
     * @param interval 更新心跳时间为一个新数字
     */
    fun heart(lifetimeId: String, interval: Long? = null) {
        val now = System.currentTimeMillis()

        val lifetimeRow = _clients[lifetimeId]
        if(lifetimeRow != null) {
            if(interval != null) { lifetimeRow.interval = interval }
            lifetimeRow.timestamp = now + lifetimeRow.interval
        }else{
            val realInterval = interval ?: options.defaultSignalInterval
            _clients[lifetimeId] = LifetimeRow(now + realInterval, realInterval)
        }
    }

    /**
     * 移除一个客户端。
     * @param lifetimeId 客户端id
     */
    fun unregister(lifetimeId: String) {
        _clients.remove(lifetimeId)
    }

    /**
     * 进行信号清理。
     */
    fun update() {
        val now = System.currentTimeMillis()
        if(_clients.isNotEmpty()) {
            for ((id, row) in _clients.entries) {
                val (timestamp, _) = row
                if(timestamp <= now) {
                    _clients.remove(id)
                }
            }
        }
        if(_signal != null) {
            synchronized(this) {
                if(_signal != null && _signal!! <= now) {
                    _signal = null
                }
            }
        }
    }

    private data class LifetimeRow(var timestamp: Long, var interval: Long)
}