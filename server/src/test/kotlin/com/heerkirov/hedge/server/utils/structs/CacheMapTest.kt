package com.heerkirov.hedge.server.utils.structs

import kotlin.test.Test
import kotlin.test.assertEquals

class CacheMapTest {
    @Test
    fun testCacheMap() {
        val map = CacheMap<String, Int>(4)

        assertEquals(1, map.computeIfAbsent("a") { 1 })
        assertEquals(1, map.size)

        assertEquals(2, map.computeIfAbsent("b") { 2 })
        assertEquals(2, map.size)

        assertEquals(3, map.computeIfAbsent("c") { 3 })
        assertEquals(3, map.size)

        assertEquals(3, map.computeIfAbsent("c") { 4 })
        assertEquals(3, map.size)

        assertEquals(1, map.computeIfAbsent("a") { 5 })
        assertEquals(3, map.size)

        assertEquals(6, map.computeIfAbsent("d") { 6 })
        assertEquals(1, map["a"])
        assertEquals(2, map["b"])
        assertEquals(3, map["c"])
        assertEquals(6, map["d"])
        assertEquals(4, map.size)

        assertEquals(6, map.computeIfAbsent("d") { 7 })
        assertEquals(1, map["a"])
        assertEquals(2, map["b"])
        assertEquals(3, map["c"])
        assertEquals(6, map["d"])
        assertEquals(4, map.size)

        assertEquals(8, map.computeIfAbsent("e") { 8 })
        assertEquals(null, map["a"])
        assertEquals(2, map["b"])
        assertEquals(3, map["c"])
        assertEquals(6, map["d"])
        assertEquals(8, map["e"])
        assertEquals(4, map.size)

        assertEquals(3, map.computeIfAbsent("c") { 9 })
        assertEquals(null, map["a"])
        assertEquals(2, map["b"])
        assertEquals(3, map["c"])
        assertEquals(6, map["d"])
        assertEquals(8, map["e"])
        assertEquals(4, map.size)

        assertEquals(10, map.computeIfAbsent("f") { 10 })
        assertEquals(null, map["a"])
        assertEquals(null, map["b"])
        assertEquals(3, map["c"])
        assertEquals(6, map["d"])
        assertEquals(8, map["e"])
        assertEquals(10, map["f"])
        assertEquals(4, map.size)

        assertEquals(11, map.computeIfAbsent("b") { 11 })
        assertEquals(null, map["a"])
        assertEquals(null, map["c"])
        assertEquals(6, map["d"])
        assertEquals(8, map["e"])
        assertEquals(10, map["f"])
        assertEquals(11, map["b"])
        assertEquals(4, map.size)

        assertEquals(12, map.computeIfAbsent("c") { 12 })
        assertEquals(null, map["a"])
        assertEquals(null, map["d"])
        assertEquals(8, map["e"])
        assertEquals(10, map["f"])
        assertEquals(11, map["b"])
        assertEquals(12, map["c"])
        assertEquals(4, map.size)

        assertEquals(13, map.computeIfAbsent("a") { 13 })
        assertEquals(null, map["d"])
        assertEquals(null, map["e"])
        assertEquals(10, map["f"])
        assertEquals(11, map["b"])
        assertEquals(12, map["c"])
        assertEquals(13, map["a"])
        assertEquals(4, map.size)
    }
}