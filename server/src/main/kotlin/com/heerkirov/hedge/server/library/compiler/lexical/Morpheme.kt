package com.heerkirov.hedge.server.library.compiler.lexical

/**
 * 词素。
 */
abstract class Morpheme

/**
 * 空格。
 */
object Space : Morpheme() {
    override fun toString(): String {
        return "(space)"
    }
}

/**
 * 符号。
 */
class Symbol private constructor(val symbol: String) : Morpheme() {
    companion object {
        private val map: HashMap<String, Symbol> = HashMap()

        fun of(symbol: String): Symbol {
            return map.computeIfAbsent(symbol) { Symbol(it) }
        }
    }

    override fun equals(other: Any?): Boolean {
        return this === other || (other is Symbol && other.symbol == this.symbol)
    }

    override fun hashCode(): Int {
        return symbol.hashCode()
    }

    override fun toString(): String {
        return symbol
    }
}

/**
 * 字符串。
 */
class CharSequence(val type: CharSequenceType, val value: String) : Morpheme() {
    override fun equals(other: Any?): Boolean {
        return this === other || (other is CharSequence && this.type == other.type && this.value == other.value)
    }

    override fun hashCode(): Int {
        var result = type.hashCode()
        result = 31 * result + value.hashCode()
        return result
    }

    override fun toString(): String {
        val char = stringBoundSymbolsReflect[type] ?: ""
        return "str[$char]$value"
    }
}

enum class CharSequenceType {
    /**
     * 单引号字符串。
     */
    APOSTROPHE,
    /**
     * 双引号字符串。
     */
    DOUBLE_QUOTES,
    /**
     * 反引号字符串。
     */
    BACKTICKS,
    /**
     * 无引号的有限字符串。
     */
    RESTRICTED
}