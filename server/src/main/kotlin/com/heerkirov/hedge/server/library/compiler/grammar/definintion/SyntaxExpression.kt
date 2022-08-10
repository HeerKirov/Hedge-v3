package com.heerkirov.hedge.server.library.compiler.grammar.definintion

//文法产生式的定义，作用是和syntax.txt中的定义对应。

/**
 * 被定义的文法产生式。
 */
data class SyntaxExpression(val index: Int, val key: KeyNotation, val sequence: List<Notation>)

/**
 * 文法产生式中的文法符号。
 */
interface Notation

/**
 * 终结符。
 */
interface TerminalNotation : Notation

/**
 * 用户定义的非终结符。
 */
class KeyNotation private constructor(val key: String) : Notation {
    companion object {
        private val cache = HashMap<String, KeyNotation>()

        fun of(key: String): KeyNotation {
            return cache.computeIfAbsent(key) { KeyNotation(it) }
        }
    }

    override fun equals(other: Any?) = other === this || (other is KeyNotation && other.key == key)

    override fun hashCode() = key.hashCode()

    override fun toString() = key
}

/**
 * 用户定义的终结符。
 */
class SyntaxNotation private constructor(val symbol: String) : TerminalNotation {
    companion object {
        private val cache = HashMap<String, SyntaxNotation>()

        fun of(symbol: String): SyntaxNotation {
            return cache.computeIfAbsent(symbol) { SyntaxNotation(it) }
        }
    }

    override fun equals(other: Any?) = other === this || (other is SyntaxNotation && other.symbol == symbol)

    override fun hashCode() = symbol.hashCode()

    override fun toString() = symbol
}

/**
 * 读取并生成原始的文法产生式定义。
 * 原始文法定义没有序号，自动添加序号，从1开始。
 */
fun readSyntaxExpression(text: String): List<SyntaxExpression> {
    val lines = text.split("\n")
        .asSequence().filter { it.isNotBlank() }.map { it.split(Regex("\\s+")) }
        .map {
            if(it.size < 2 || it[1] != "->") throw RuntimeException("Expression [${it.joinToString(" ")}] is incorrect.")
            it[0] to it.subList(2, it.size)
        }.toList()

    val nonTerminals = lines.asSequence().map { (left, _) -> left }.toSet()

    return lines.mapIndexed { i, (left, right) ->
        SyntaxExpression(i + 1, KeyNotation.of(left), right.map { if(it in nonTerminals) KeyNotation.of(it) else SyntaxNotation.of(it) })
    }
}
