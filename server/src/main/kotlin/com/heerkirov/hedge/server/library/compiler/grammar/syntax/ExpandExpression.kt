package com.heerkirov.hedge.server.library.compiler.grammar.syntax

import com.heerkirov.hedge.server.library.compiler.grammar.definintion.KeyNotation
import com.heerkirov.hedge.server.library.compiler.grammar.definintion.Notation
import com.heerkirov.hedge.server.library.compiler.grammar.definintion.TerminalNotation

/**
 * 增广的文法产生式。
 */
class ExpandExpression(val index: Int, private val _key: KeyNotation?, val sequence: List<Notation>) {
    val key: KeyNotation get() = _key ?: throw TypeCastException("This is a root expression.")

    fun isRoot(): Boolean = _key == null

    fun isNotRoot(): Boolean = _key != null

    override fun equals(other: Any?): Boolean = this === other || (other is ExpandExpression && other.index == this.index)

    override fun hashCode(): Int = index
}

/**
 * EOF输入终结符号。
 */
object EOFNotation : TerminalNotation {
    override fun toString() = "∑"
}