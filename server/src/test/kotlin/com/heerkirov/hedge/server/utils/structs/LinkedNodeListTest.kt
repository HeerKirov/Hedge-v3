package com.heerkirov.hedge.server.utils.structs

import com.heerkirov.hedge.server.utils.map
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class LinkedNodeListTest {
    @Test
    fun testLinkedNodeList() {
        val list = LinkedNodeList<String>()

        assertNull(list.head)
        assertNull(list.tail)
        assertEquals(0, list.size)

        list.addLast("A")

        assertEquals("A", list.head?.value)
        assertEquals("A", list.tail?.value)
        assertEquals(1, list.size)

        list.addLast("B")

        assertEquals("A", list.head?.value)
        assertEquals("B", list.tail?.value)
        assertEquals(2, list.size)

        list.addFirst("C")

        assertEquals("C", list.head?.value)
        assertEquals("B", list.tail?.value)
        assertEquals(3, list.size)

        var n = list.head
        assertEquals("C", n?.value)
        n = n?.next
        assertEquals("A", n?.value)
        n = n?.next
        assertEquals("B", n?.value)
        n = n?.next
        assertNull(n?.value)

        n = list.tail
        assertEquals("B", n?.value)
        n = n?.prev
        assertEquals("A", n?.value)
        n = n?.prev
        assertEquals("C", n?.value)
        list.addFirst("D")
        n = n?.prev
        assertEquals("D", n?.value)
        assertEquals(4, list.size)

        assertEquals(listOf("D", "C", "A", "B"), (list.head!! iterTo list.tail!!).map { it })
        assertEquals(3, list.head!! distance list.tail!!)
    }
}