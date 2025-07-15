package com.heerkirov.hedge.server.utils

import net.sourceforge.pinyin4j.PinyinHelper
import net.sourceforge.pinyin4j.format.HanyuPinyinCaseType
import net.sourceforge.pinyin4j.format.HanyuPinyinOutputFormat
import net.sourceforge.pinyin4j.format.HanyuPinyinToneType
import net.sourceforge.pinyin4j.format.HanyuPinyinVCharType


object Texture {
    /**
     * 将文本中的中文转换为拼音
     */
    fun toPinyin(text: String): String {
        val sb = StringBuilder()
        for (c in text) {
            // 判断是否为汉字字符
            if (c.toString().matches(chineseRegex)) {
                val s = PinyinHelper.toHanyuPinyinStringArray(c, format)
                if (s != null && s.isNotEmpty()) {
                    sb.append(s[0])
                    continue
                }
            }
            sb.append(c)
        }
        return sb.toString()
    }

    /**
     * 将文本中的中文转换为拼音首字母
     */
    fun toPinyinInitials(text: String): String {
        val sb = StringBuilder()
        for (c in text) {
            // 判断是否为汉字字符
            if (c.toString().matches(chineseRegex)) {
                val s = PinyinHelper.toHanyuPinyinStringArray(c, format)
                if (s != null && s.isNotEmpty()) {
                    sb.append(s[0][0])
                    continue
                }
            }
            sb.append(c)
        }
        return sb.toString()
    }

    /**
     * 检查文本是否包含中文字符。
     */
    fun containChinese(text: String): Boolean {
        return chineseRegex.containsMatchIn(text)
    }

    private val format = HanyuPinyinOutputFormat().apply {
        // 设置大小写
        caseType = HanyuPinyinCaseType.LOWERCASE
        // 设置声调表示方法
        toneType = HanyuPinyinToneType.WITHOUT_TONE
        // 设置字母u表示方法
        vCharType = HanyuPinyinVCharType.WITH_V
    }

    private val chineseRegex = "[\\u4E00-\\u9FA5]+".toRegex()
}