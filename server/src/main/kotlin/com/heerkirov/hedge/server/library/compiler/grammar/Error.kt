package com.heerkirov.hedge.server.library.compiler.grammar

import com.heerkirov.hedge.server.library.compiler.utils.GrammarError
import com.heerkirov.hedge.server.library.compiler.utils.range

/**
 * 遇到了预料之外的token。
 */
class UnexpectedToken(token: String, expected: List<String>, pos: Int) : GrammarError<ExpectedAndActual>(2001, "Unexpected token '$token'.", range(pos), info = ExpectedAndActual(token, expected))

/**
 * 遇到了预料之外的结束EOF。
 */
class UnexpectedEOF(expected: List<String>, pos: Int) : GrammarError<ExpectedAndActual>(2002, "Unexpected EOF.", range(pos), info = ExpectedAndActual("∑", expected))

/**
 * 在注解中存在重复出现的前缀符号。
 */
class DuplicatedAnnotationPrefix(symbol: String, pos: Int) : GrammarError<String>(2003, "Duplicated annotation prefix '$symbol'", range(pos), info = symbol)

data class ExpectedAndActual(
    /**
     * 实际遇到的词素。
     */
    val actual: String,
    /**
     * 期望遇到的词素，也就是当前状态能接受的词素种类。
     */
    val expected: List<String>)