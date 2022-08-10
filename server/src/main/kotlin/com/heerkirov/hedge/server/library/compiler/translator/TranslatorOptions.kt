package com.heerkirov.hedge.server.library.compiler.translator

/**
 * 翻译器的配置项。
 */
interface TranslatorOptions {
    /**
     * 合取项中的结果数量的警告阈值。
     */
    val warningLimitOfUnionItems: Int

    /**
     * 合取项的数量的警告阈值。
     */
    val warningLimitOfIntersectItems: Int
}

data class TranslatorOptionsImpl(
    override val warningLimitOfUnionItems: Int,
    override val warningLimitOfIntersectItems: Int
) : TranslatorOptions