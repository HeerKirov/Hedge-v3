package com.heerkirov.hedge.server.library.compiler

import com.heerkirov.hedge.server.library.compiler.lexical.*
import com.heerkirov.hedge.server.library.compiler.lexical.CharSequence
import com.heerkirov.hedge.server.library.compiler.utils.AnalysisResult
import com.heerkirov.hedge.server.library.compiler.utils.LexicalError
import kotlin.test.Test
import kotlin.test.assertEquals

class LexicalAnalyserTest {
    @Test
    fun testSpace() {
        //空串
        assertEquals(AnalysisResult(emptyList()), LexicalAnalyzer.parse(""))
        //测试各种空格
        assertEquals(AnalysisResult(listOf(spaceLexical(0, 1))), LexicalAnalyzer.parse(" "))
        assertEquals(AnalysisResult(listOf(spaceLexical(0, 1))), LexicalAnalyzer.parse("\n"))
        assertEquals(AnalysisResult(listOf(spaceLexical(0, 1))), LexicalAnalyzer.parse("\r"))
        assertEquals(AnalysisResult(listOf(spaceLexical(0, 1))), LexicalAnalyzer.parse("\t"))
        assertEquals(AnalysisResult(listOf(spaceLexical(0, 2))), LexicalAnalyzer.parse("\n\r"))
        assertEquals(AnalysisResult(listOf(spaceLexical(0, 3))), LexicalAnalyzer.parse("\n \r"))
        assertEquals(AnalysisResult(listOf(spaceLexical(0, 3))), LexicalAnalyzer.parse(" \n "))
        assertEquals(AnalysisResult(listOf(spaceLexical(0, 4))), LexicalAnalyzer.parse(" \n\r\t"))
    }

    @Test
    fun testAllSymbolTypes() {
        //对全符号表做一个单字符识别，保证每个单字符的识别类型是正确的
        assertEquals(AnalysisResult(listOf(symbolLexical("~", 0))), LexicalAnalyzer.parse("~"))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.BACKTICKS, "", 0, 1)), warnings = listOf<LexicalError<*>>(ExpectQuoteButEOF('`', 1))),
            LexicalAnalyzer.parse("`"))
        assertEquals(AnalysisResult(emptyList(), warnings = listOf<LexicalError<*>>(UselessSymbol('!', 0))),
            LexicalAnalyzer.parse("!"))
        assertEquals(AnalysisResult(listOf(symbolLexical("@", 0))), LexicalAnalyzer.parse("@"))
        assertEquals(AnalysisResult(listOf(symbolLexical("#", 0))), LexicalAnalyzer.parse("#"))
        assertEquals(AnalysisResult(listOf(symbolLexical("$", 0))), LexicalAnalyzer.parse("$"))
        assertEquals(AnalysisResult(emptyList(), warnings = listOf<LexicalError<*>>(UselessSymbol('%', 0))),
            LexicalAnalyzer.parse("%"))
        assertEquals(AnalysisResult(listOf(symbolLexical("^", 0))), LexicalAnalyzer.parse("^"))
        assertEquals(AnalysisResult(listOf(symbolLexical("&", 0))), LexicalAnalyzer.parse("&"))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "*", 0, 1))), LexicalAnalyzer.parse("*"))
        assertEquals(AnalysisResult(listOf(symbolLexical("(", 0))), LexicalAnalyzer.parse("("))
        assertEquals(AnalysisResult(listOf(symbolLexical(")", 0))), LexicalAnalyzer.parse(")"))
        assertEquals(AnalysisResult(listOf(symbolLexical("-", 0))), LexicalAnalyzer.parse("-"))
        assertEquals(AnalysisResult(emptyList(), warnings = listOf<LexicalError<*>>(UselessSymbol('=', 0))),
            LexicalAnalyzer.parse("="))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1))), LexicalAnalyzer.parse("_"))
        assertEquals(AnalysisResult(listOf(symbolLexical("+", 0))), LexicalAnalyzer.parse("+"))
        assertEquals(AnalysisResult(listOf(symbolLexical("[", 0))), LexicalAnalyzer.parse("["))
        assertEquals(AnalysisResult(listOf(symbolLexical("]", 0))), LexicalAnalyzer.parse("]"))
        assertEquals(AnalysisResult(listOf(symbolLexical("{", 0))), LexicalAnalyzer.parse("{"))
        assertEquals(AnalysisResult(listOf(symbolLexical("}", 0))), LexicalAnalyzer.parse("}"))
        assertEquals(AnalysisResult(emptyList(), warnings = listOf<LexicalError<*>>(UselessSymbol(';', 0))),
            LexicalAnalyzer.parse(";"))
        assertEquals(AnalysisResult(listOf(symbolLexical(":", 0))), LexicalAnalyzer.parse(":"))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.APOSTROPHE, "", 0, 1)), warnings = listOf<LexicalError<*>>(ExpectQuoteButEOF('\'', 1))),
            LexicalAnalyzer.parse("'"))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.DOUBLE_QUOTES, "", 0, 1)), warnings = listOf<LexicalError<*>>(ExpectQuoteButEOF('"', 1))),
            LexicalAnalyzer.parse("\""))
        assertEquals(AnalysisResult(listOf(symbolLexical(",", 0))), LexicalAnalyzer.parse(","))
        assertEquals(AnalysisResult(listOf(symbolLexical(".", 0))), LexicalAnalyzer.parse("."))
        assertEquals(AnalysisResult(listOf(symbolLexical("/", 0))), LexicalAnalyzer.parse("/"))
        assertEquals(AnalysisResult(emptyList(), warnings = listOf<LexicalError<*>>(UselessSymbol('\\', 0))),
            LexicalAnalyzer.parse("\\"))
        assertEquals(AnalysisResult(listOf(symbolLexical("|", 0))), LexicalAnalyzer.parse("|"))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "?", 0, 1))), LexicalAnalyzer.parse("?"))
        assertEquals(AnalysisResult(listOf(symbolLexical("<", 0))), LexicalAnalyzer.parse("<"))
        assertEquals(AnalysisResult(listOf(symbolLexical(">", 0))), LexicalAnalyzer.parse(">"))
    }

    @Test
    fun testSymbolTables() {
        //测试符号表中的所有1位符号及其连写
        assertEquals(AnalysisResult(listOf(
            symbolLexical(":", 0),
            symbolLexical(">", 1),
            symbolLexical("<", 2),
            symbolLexical("~", 3),
            symbolLexical("|", 4),
            symbolLexical("/", 5),
            symbolLexical("&", 6),
            symbolLexical("-", 7),
            symbolLexical("+", 8),
            symbolLexical("@", 9),
            symbolLexical("#", 10),
            symbolLexical("$", 11),
            symbolLexical("^", 12),
            symbolLexical(".", 13),
            symbolLexical(",", 14),
            symbolLexical("[", 15),
            symbolLexical("]", 16),
            symbolLexical("(", 17),
            symbolLexical(")", 18),
            symbolLexical("{", 19),
            symbolLexical("}", 20),
        )), LexicalAnalyzer.parse(":><~|/&-+@#$^.,[](){}"))
        //测试符号表中的所有2位符号及其连写
        assertEquals(AnalysisResult(listOf(
            symbolLexical(">=", 0),
            symbolLexical("<=", 2),
            symbolLexical("~+", 4),
            symbolLexical("~-", 6),
        )), LexicalAnalyzer.parse(">=<=~+~-"))
    }

    @Test
    fun testString() {
        //测试无限字符串
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.APOSTROPHE, "hello", 0, 7))), LexicalAnalyzer.parse("'hello'"))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.DOUBLE_QUOTES, "こんにちは", 0, 7))), LexicalAnalyzer.parse("\"こんにちは\""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.BACKTICKS, "你好", 0, 4))), LexicalAnalyzer.parse("`你好`"))
        //测试无限字符串中间插入其他类型的字符串符号
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.APOSTROPHE, "a\"b", 0, 5))), LexicalAnalyzer.parse("'a\"b'"))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.DOUBLE_QUOTES, "a`b", 0, 5))), LexicalAnalyzer.parse("\"a`b\""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.BACKTICKS, "a'b", 0, 5))), LexicalAnalyzer.parse("`a'b`"))
        //测试连续编写的无限字符串
        assertEquals(AnalysisResult(listOf(
            stringLexical(CharSequenceType.APOSTROPHE, "a", 0, 3),
            stringLexical(CharSequenceType.DOUBLE_QUOTES, "b", 3, 6),
            stringLexical(CharSequenceType.BACKTICKS, "c", 6, 9),
            spaceLexical(9, 10),
            stringLexical(CharSequenceType.APOSTROPHE, "d", 10, 13),
            spaceLexical(13, 14),
            stringLexical(CharSequenceType.DOUBLE_QUOTES, "e", 14, 17),
            spaceLexical(17, 18),
            stringLexical(CharSequenceType.BACKTICKS, "f", 18, 21),
        )), LexicalAnalyzer.parse("""'a'"b"`c` 'd' "e" `f`"""))
        //测试不写字符串结束符
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.APOSTROPHE, "hello", 0, 6)), warnings = listOf<LexicalError<*>>(ExpectQuoteButEOF('\'', 6))),
            LexicalAnalyzer.parse("'hello"))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.DOUBLE_QUOTES, "hello", 0, 6)), warnings = listOf<LexicalError<*>>(ExpectQuoteButEOF('"', 6))),
            LexicalAnalyzer.parse("\"hello"))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.BACKTICKS, "hello", 0, 6)), warnings = listOf<LexicalError<*>>(ExpectQuoteButEOF('`', 6))),
            LexicalAnalyzer.parse("`hello"))
        //测试只写字符串结束符。这实际上变成了一个有限字符串+一个无终结的无限字符串的形式
        assertEquals(AnalysisResult(listOf(
            stringLexical(CharSequenceType.RESTRICTED, "hello", 0, 5),
            stringLexical(CharSequenceType.APOSTROPHE, "", 5, 6),
        ), warnings = listOf<LexicalError<*>>(ExpectQuoteButEOF('\'', 6))),
            LexicalAnalyzer.parse("hello'"))
        assertEquals(AnalysisResult(listOf(
            stringLexical(CharSequenceType.RESTRICTED, "hello", 0, 5),
            stringLexical(CharSequenceType.DOUBLE_QUOTES, "", 5, 6),
        ), warnings = listOf<LexicalError<*>>(ExpectQuoteButEOF('"', 6))),
            LexicalAnalyzer.parse("hello\""))
        assertEquals(AnalysisResult(listOf(
            stringLexical(CharSequenceType.RESTRICTED, "hello", 0, 5),
            stringLexical(CharSequenceType.BACKTICKS, "", 5, 6),
        ), warnings = listOf<LexicalError<*>>(ExpectQuoteButEOF('`', 6))),
            LexicalAnalyzer.parse("hello`"))
    }

    @Test
    fun testStringEscape() {
        //测试无限字符串的转义
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.APOSTROPHE, "a'\"`\\\n\r\tb", 0, 18))), LexicalAnalyzer.parse("""'a\'\"\`\\\n\r\tb'"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.DOUBLE_QUOTES, "a'\"`\\\n\r\tb", 0, 18))), LexicalAnalyzer.parse(""""a\'\"\`\\\n\r\tb""""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.BACKTICKS, "a'\"`\\\n\r\tb", 0, 18))), LexicalAnalyzer.parse("""`a\'\"\`\\\n\r\tb`"""))
        //测试转义普通字符
        assertEquals(AnalysisResult(listOf(
            stringLexical(CharSequenceType.APOSTROPHE, "?1c", 0, 8)
        ), warnings = listOf<LexicalError<*>>(
            NormalCharacterEscaped('?', 2),
            NormalCharacterEscaped('1', 4),
            NormalCharacterEscaped('c', 6),
        )), LexicalAnalyzer.parse("""'\?\1\c'"""))
        //测试转义字符后接EOF
        assertEquals(AnalysisResult(listOf(
            LexicalItem(CharSequence(CharSequenceType.BACKTICKS, ""), 0, 2)
        ), warnings = listOf<LexicalError<*>>(
            ExpectEscapedCharacterButEOF(2)
        )), LexicalAnalyzer.parse("""`\"""))
    }

    @Test
    fun testRestrictedString() {
        //测试单个普通受限字符串
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "abc", 0, 3))), LexicalAnalyzer.parse("""abc"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "123", 0, 3))), LexicalAnalyzer.parse("""123"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "你好", 0, 2))), LexicalAnalyzer.parse("""你好"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "こんにちは", 0, 5))), LexicalAnalyzer.parse("""こんにちは"""))
        //测试空格分割的受限字符串
        assertEquals(AnalysisResult(listOf(
            stringLexical(CharSequenceType.RESTRICTED, "abc", 0, 3),
            spaceLexical(3, 4),
            stringLexical(CharSequenceType.RESTRICTED, "你好", 4, 6),
            spaceLexical(6, 7),
            stringLexical(CharSequenceType.RESTRICTED, "こんにちは", 7, 12),
        )), LexicalAnalyzer.parse("""abc 你好 こんにちは"""))
        //测试受限字符串中间可接受的符号
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_?*+-!", 0, 6))), LexicalAnalyzer.parse("""_?*+-!"""))
        //测试受限字符串中间不可接受的符号
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), symbolLexical("~", 1))),
            LexicalAnalyzer.parse("""_~"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), stringLexical(CharSequenceType.BACKTICKS, "", 1, 2)),
            warnings = listOf<LexicalError<*>>(ExpectQuoteButEOF('`', 2))),
            LexicalAnalyzer.parse("""_`"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), symbolLexical("@", 1))),
            LexicalAnalyzer.parse("""_@"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), symbolLexical("#", 1))),
            LexicalAnalyzer.parse("""_#"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), symbolLexical("$", 1))),
            LexicalAnalyzer.parse("""_$"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1)), warnings = listOf<LexicalError<*>>(UselessSymbol('%', 1))),
            LexicalAnalyzer.parse("""_%"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), symbolLexical("^", 1))),
            LexicalAnalyzer.parse("""_^"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), symbolLexical("&", 1))),
            LexicalAnalyzer.parse("""_&"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), symbolLexical("(", 1))),
            LexicalAnalyzer.parse("""_("""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), symbolLexical(")", 1))),
            LexicalAnalyzer.parse("""_)"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1)), warnings = listOf<LexicalError<*>>(UselessSymbol('=', 1))),
            LexicalAnalyzer.parse("""_="""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), symbolLexical("[", 1))),
            LexicalAnalyzer.parse("""_["""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), symbolLexical("]", 1))),
            LexicalAnalyzer.parse("""_]"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), symbolLexical("{", 1))),
            LexicalAnalyzer.parse("""_{"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), symbolLexical("}", 1))),
            LexicalAnalyzer.parse("""_}"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), symbolLexical("|", 1))),
            LexicalAnalyzer.parse("""_|"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1)), warnings = listOf<LexicalError<*>>(UselessSymbol('\\', 1))),
            LexicalAnalyzer.parse("""_\"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1)), warnings = listOf<LexicalError<*>>(UselessSymbol(';', 1))),
            LexicalAnalyzer.parse("""_;"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), symbolLexical(":", 1))),
            LexicalAnalyzer.parse("""_:"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), stringLexical(CharSequenceType.APOSTROPHE, "", 1, 2)),
            warnings = listOf<LexicalError<*>>(ExpectQuoteButEOF('\'', 2))),
            LexicalAnalyzer.parse("""_'"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), stringLexical(CharSequenceType.DOUBLE_QUOTES, "", 1, 2)),
            warnings = listOf<LexicalError<*>>(ExpectQuoteButEOF('"', 2))),
            LexicalAnalyzer.parse("""_""""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), symbolLexical(",", 1))),
            LexicalAnalyzer.parse("""_,"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), symbolLexical(".", 1))),
            LexicalAnalyzer.parse("""_."""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), symbolLexical("<", 1))),
            LexicalAnalyzer.parse("""_<"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), symbolLexical(">", 1))),
            LexicalAnalyzer.parse("""_>"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), symbolLexical("/", 1))),
            LexicalAnalyzer.parse("""_/"""))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), spaceLexical(1, 2))),
            LexicalAnalyzer.parse("""_ """))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "_", 0, 1), spaceLexical(1, 2))),
            LexicalAnalyzer.parse("_\n"))
    }

    @Test
    fun testTranslateUnderscoreToSpace() {
        val options = LexicalOptionsImpl(translateUnderscoreToSpace = true)
        //测试将有限字符串中的下划线转义为空格
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, " ", 0, 1))), LexicalAnalyzer.parse("_", options))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "a ", 0, 2))), LexicalAnalyzer.parse("a_", options))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, " b", 0, 2))), LexicalAnalyzer.parse("_b", options))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, " c ", 0, 3))), LexicalAnalyzer.parse("_c_", options))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "d e", 0, 3))), LexicalAnalyzer.parse("d_e", options))
    }

    @Test
    fun testChineseSymbols() {
        val options = LexicalOptionsImpl(chineseSymbolReflect = true)
        //测试处理中文符号
        assertEquals(AnalysisResult(listOf(
            symbolLexical(":", 0),
            symbolLexical(">", 1),
            symbolLexical("<", 2),
            symbolLexical("~", 3),
            symbolLexical("|", 4),
            symbolLexical(",", 5),
            symbolLexical(".", 6),
            symbolLexical("[", 7),
            symbolLexical("]", 8),
            symbolLexical("(", 9),
            symbolLexical(")", 10),
            symbolLexical("{", 11),
            symbolLexical("}", 12)
        )), LexicalAnalyzer.parse("：》《～｜，。【】（）「」", options))
        //测试2位中文符号
        assertEquals(AnalysisResult(listOf(
            symbolLexical(">=", 0),
            symbolLexical("<=", 2),
            symbolLexical("~+", 4),
            symbolLexical("~-", 6),
        )), LexicalAnalyzer.parse("》=《=～+～-", options))
        //测试中文符号是否会被处理成字符串
        assertEquals(AnalysisResult(listOf(
            stringLexical(CharSequenceType.RESTRICTED, "你好", 0, 2),
            symbolLexical(":", 2),
            stringLexical(CharSequenceType.RESTRICTED, "世界", 3, 5)
        )), LexicalAnalyzer.parse("你好：世界", options))
        //测试处理中文起始符的字符串
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.APOSTROPHE, "hello", 0, 7))), LexicalAnalyzer.parse("‘hello’", options))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.DOUBLE_QUOTES, "こんにちは", 0, 7))), LexicalAnalyzer.parse("“こんにちは”", options))
        assertEquals(AnalysisResult(listOf(stringLexical(CharSequenceType.RESTRICTED, "·你好·", 0, 4))), LexicalAnalyzer.parse("·你好·", options))
    }

    private fun spaceLexical(beginIndex: Int, endIndex: Int) = LexicalItem(Space, beginIndex, endIndex)

    private fun symbolLexical(symbol: String, beginIndex: Int) = LexicalItem(Symbol.of(symbol), beginIndex, beginIndex + symbol.length)

    private fun stringLexical(type: CharSequenceType, value: String, beginIndex: Int, endIndex: Int) = LexicalItem(CharSequence(type, value), beginIndex, endIndex)
}