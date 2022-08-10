package com.heerkirov.hedge.server.library.compiler.lexical

/**
 * 词法分析器的配置项。
 */
interface LexicalOptions {
    /**
     * 将有限字符串中的下划线转义为空格。
     */
    val translateUnderscoreToSpace: Boolean

    /**
     * 识别并转换中文全角字符。
     */
    val chineseSymbolReflect: Boolean
}

data class LexicalOptionsImpl(
    override val translateUnderscoreToSpace: Boolean = false,
    override val chineseSymbolReflect: Boolean = false
) : LexicalOptions