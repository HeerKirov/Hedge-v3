package com.heerkirov.hedge.server.utils.structs

import kotlin.test.Test
import kotlin.test.assertEquals

class CountSetTest {
    @Test
    fun testCountSet() {
        val set = CountSet<Int>()

        assertEquals(0, set.size)

        set.add(1)
        assertEquals(1, set.size)
        assertEquals(1, set[1])
        assertEquals(listOf(1 to 1), set.toList())

        set.add(2)
        assertEquals(2, set.size)
        assertEquals(1, set[2])
        assertEquals(listOf(1 to 1, 2 to 1), set.toList())

        set.add(1)
        assertEquals(2, set.size)
        assertEquals(2, set[1])
        assertEquals(listOf(2 to 1, 1 to 2), set.toList())

        set.add(1, 2)
        assertEquals(2, set.size)
        assertEquals(4, set[1])
        assertEquals(listOf(2 to 1, 1 to 4), set.toList())

        set.add(2, 3)
        assertEquals(2, set.size)
        assertEquals(4, set[2])
        assertEquals(listOf(1 to 4, 2 to 4), set.toList())

        set.add(3, 2)
        assertEquals(3, set.size)
        assertEquals(2, set[3])
        assertEquals(listOf(3 to 2, 1 to 4, 2 to 4), set.toList())

        set.add(3)
        assertEquals(3, set.size)
        assertEquals(3, set[3])
        assertEquals(listOf(3 to 3, 1 to 4, 2 to 4), set.toList())

        set.add(3, 2)
        assertEquals(3, set.size)
        assertEquals(5, set[3])
        assertEquals(listOf(1 to 4, 2 to 4, 3 to 5), set.toList())

        set.add(4, 4)
        assertEquals(4, set.size)
        assertEquals(4, set[4])
        assertEquals(listOf(1 to 4, 2 to 4, 4 to 4, 3 to 5), set.toList())

        set.add(3)
        assertEquals(4, set.size)
        assertEquals(6, set[3])
        assertEquals(listOf(1 to 4, 2 to 4, 4 to 4, 3 to 6), set.toList())

        set.remove(2)
        assertEquals(4, set.size)
        assertEquals(3, set[2])
        assertEquals(listOf(2 to 3, 1 to 4, 4 to 4, 3 to 6), set.toList())

        set.remove(1, 3)
        assertEquals(4, set.size)
        assertEquals(1, set[1])
        assertEquals(listOf(1 to 1, 2 to 3, 4 to 4, 3 to 6), set.toList())

        set.remove(2)
        assertEquals(4, set.size)
        assertEquals(2, set[2])
        assertEquals(listOf(1 to 1, 2 to 2, 4 to 4, 3 to 6), set.toList())

        set.remove(2)
        assertEquals(4, set.size)
        assertEquals(1, set[2])
        assertEquals(listOf(2 to 1, 1 to 1, 4 to 4, 3 to 6), set.toList())

        set.remove(1)
        assertEquals(3, set.size)
        assertEquals(0, set[1])
        assertEquals(listOf(2 to 1, 4 to 4, 3 to 6), set.toList())

        set.remove(2)
        assertEquals(2, set.size)
        assertEquals(0, set[2])
        assertEquals(listOf(4 to 4, 3 to 6), set.toList())
    }
}