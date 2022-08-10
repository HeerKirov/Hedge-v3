package com.heerkirov.hedge.server.components.lifetime

/**
 * 提供对永久维持机制维护管理的单独组件。
 */
class Permanent {
    private val _stats = mutableSetOf<String>()

    val stats: Set<String> get() = _stats

    val anyPermanent: Boolean get() = _stats.isNotEmpty()

    operator fun get(type: String): Boolean {
        return type in _stats
    }

    operator fun set(type: String, stat: Boolean) {
        if(stat) {
            _stats.add(type)
        }else{
            _stats.remove(type)
        }
    }
}