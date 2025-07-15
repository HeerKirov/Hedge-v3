package com.heerkirov.hedge.server.utils

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class TextureTest {
    @Test
    fun testToPinyin() {
        assertEquals("nihao", Texture.toPinyin("你好"))
        assertEquals("shuli", Texture.toPinyin("树篱"))
        assertEquals("dongfangProject", Texture.toPinyin("东方Project"))
        assertEquals("tiantongailisi", Texture.toPinyin("天童爱丽丝"))
        assertEquals("yingbanna", Texture.toPinyin("樱坂雫"))
    }

    @Test
    fun testToPinyinInitials() {
        assertEquals("nh", Texture.toPinyinInitials("你好"))
        assertEquals("sl", Texture.toPinyinInitials("树篱"))
        assertEquals("dfProject", Texture.toPinyinInitials("东方Project"))
        assertEquals("ttals", Texture.toPinyinInitials("天童爱丽丝"))
        assertEquals("ybn", Texture.toPinyinInitials("樱坂雫"))
    }

    @Test
    fun testContainChinese() {
        assertFalse(Texture.containChinese("Hello, World!"))
        assertTrue(Texture.containChinese("你好"))
        assertTrue(Texture.containChinese("Hello, 你好"))
        assertTrue(Texture.containChinese("东方Project"))
        assertTrue(Texture.containChinese("A二B"))
    }
}