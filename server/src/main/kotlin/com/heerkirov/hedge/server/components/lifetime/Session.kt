package com.heerkirov.hedge.server.components.lifetime

/**
 * 提供对连接维护管理的单独组件。
 */
class Session {
    private val _sessions = mutableSetOf<String>()

    val sessions: Set<String> get() = _sessions

    val anySession: Boolean get() = _sessions.isNotEmpty()

    operator fun get(sessionId: String): Boolean {
        return sessionId in _sessions
    }

    operator fun set(sessionId: String, stat: Boolean) {
        if(stat) {
            _sessions.add(sessionId)
        }else{
            _sessions.remove(sessionId)
        }
    }
}