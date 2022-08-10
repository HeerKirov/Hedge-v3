package com.heerkirov.hedge.server.utils.structs

import java.lang.ref.SoftReference
import java.util.*

/**
 * 拥有最大缓存限定数量的map存储结构。它是一个不稳定存储，仅用于缓存。在缓存内容超出上限，或者内存空间不足时，将清理持有的内容。
 */
class CacheMap<K, V>(private val limit: Int) {
    private val map = LinkedHashMap<K, SoftReference<V>>()

    val size: Int get() = map.size

    fun computeIfAbsent(key: K, mappingFunction: (K) -> V): V {
        synchronized(map) {
            val ref = map[key]
            if(ref == null) {
                val nv = mappingFunction(key)
                map[key] = SoftReference(nv)
                clearCache()
                return nv
            }
            val value = ref.get()
            if(value == null) {
                map.remove(key)
                val nv = mappingFunction(key)
                map[key] = SoftReference(nv)
                clearCache()
                return nv
            }
            return value
        }
    }

    operator fun get(key: K): V? {
        synchronized(map) {
            val ref = map[key] ?: return null
            val value = ref.get()
            if(value == null) {
                map.remove(key)
                return null
            }
            return value
        }
    }

    operator fun set(key: K, value: V) {
        synchronized(map) {
            map.remove(key)
            map[key] = SoftReference(value)
            clearCache()
        }
    }

    fun clear() {
        synchronized(map) {
            map.clear()
        }
    }

    fun putAll(from: List<Pair<K, V>>) {
        synchronized(map) {
            map.putAll(from.associate { it.first to SoftReference(it.second) })
            clearCache()
        }
    }

    private fun clearCache() {
        if(map.size > limit) {
            clearSortReference()
            clearOutLimited()
        }
    }

    private fun clearSortReference() {
        val iterator = map.iterator()
        while (iterator.hasNext()) {
            val (_, reference) = iterator.next()
            if(reference.get() == null) iterator.remove()
        }
    }

    private fun clearOutLimited() {
        if(map.size > limit) {
            var remain = map.size - limit
            val iterator = map.iterator()
            while (remain > 0 && iterator.hasNext()) {
                iterator.next()
                iterator.remove()
                remain -= 1
            }
        }
    }
}