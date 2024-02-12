package com.heerkirov.hedge.server.library.compiler.lexical

import com.heerkirov.hedge.server.library.compiler.utils.LexicalError
import com.heerkirov.hedge.server.library.compiler.utils.range

/**
 * 转义了一个普通字符，而非需要被转义的符号。
 */
class NormalCharacterEscaped(char: Char, pos: Int) : LexicalError<Char>(1001, "Escaped a normal character $char .", range(pos - 1, pos), info = char)

/**
 * 希望遇到字符串终结符，但是却遇到了字符串末尾。终结符丢失。
 */
class ExpectQuoteButEOF(quote: Char, pos: Int) : LexicalError<Char>(1002, "Expecting quote $quote but actually EOF.", range(pos), info = quote)

/**
 * 希望在转义字符后遇到一个符号用于转义，但是却遇到了字符串末尾。转义符号丢失。
 */
class ExpectEscapedCharacterButEOF(pos: Int) : LexicalError<Nothing>(1003, "Expecting an escaped character but actually EOF.", range(pos - 1, pos))

/**
 * 遇到了意料之外的符号，此符号在词法中没有任何作用，因此将被忽略掉。
 */
class UselessSymbol(symbol: Char, pos: Int): LexicalError<Char>(1004, "Useless symbol $symbol .", range(pos), info = symbol)