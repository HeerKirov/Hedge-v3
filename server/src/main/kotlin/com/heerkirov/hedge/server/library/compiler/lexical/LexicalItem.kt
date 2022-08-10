package com.heerkirov.hedge.server.library.compiler.lexical

/**
 * 词法结果项。
 */
data class LexicalItem(val morpheme: Morpheme, val beginIndex: Int, val endIndex: Int) {
    override fun toString(): String {
        return "<$morpheme $beginIndex~$endIndex>"
    }
}