package com.heerkirov.hedge.server.library.compiler.lexical

/** 总符号表：给出每一个键盘符号的用途。
 * ~    单字符符号
 * `    字符串起始符号
 * !    有限字符串的中间
 * @    单字符符号
 * #    单字符符号
 * $    单字符符号
 * %    禁用
 * ^    单字符符号
 * &    单字符符号
 * *    有限字符串的起始和中间
 * (    单字符符号
 * )    单字符符号
 * -    单字符符号 & 有限字符串的中间
 * =    双字符符号中的后缀
 * _    有限字符串的起始和中间
 * +    单字符符号 & 有限字符串的中间
 * [    单字符符号
 * ]    单字符符号
 * {    单字符符号
 * }    单字符符号
 * ;    禁用
 * :    单字符符号
 * '    字符串起始符号
 * "    字符串起始符号
 * ,    单字符符号
 * .    单字符符号
 * /    单字符符号
 * \    无限字符串转义符号
 * |    单字符符号
 * ?    有限字符串的起始和中间
 * <    单字符符号
 * >    单字符符号
 */
internal val allSymbols = arrayOf('~', '`', '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '=', '_', '+', '[', ']', '{', '}', ';', ':', '\'', '"', ',', '.', '/', '\\', '|', '?', '<', '>')

/**
 * 单字符符号表。
 */
internal val singleSymbols = arrayOf(
    ':', '>', '<', '~',
    '|', '/', '&', '-', '+',
    '@', '#', '$',
    '^', '.', ',',
    '[', ']', '(', ')', '{', '}',
)

/**
 * 双字符符号表。前缀必定是某种可用的单字符符号。
 */
internal val doubleSymbols = arrayOf(">=", "<=", "~-", "~+")

/**
 * 双字符符号：前缀符号对后一个符号的映射。
 */
internal val doubleSymbolsSuffix = doubleSymbols.asSequence().groupBy({ it[0] }) { it[1] }

/**
 * 构成空格的字符表。
 */
internal val spaceSymbols = arrayOf(' ', '\n', '\r', '\t')

/**
 * 识别为无限字符串的开始结束符的字符表，并指向类型枚举。
 */
internal val stringBoundSymbols = mapOf(
    '\'' to CharSequenceType.APOSTROPHE,
    '"' to CharSequenceType.DOUBLE_QUOTES,
    '`' to CharSequenceType.BACKTICKS
)

/**
 * 字符串符号反转：枚举指向字符。
 */
internal val stringBoundSymbolsReflect = stringBoundSymbols.asSequence().map { it.value to it.key }.toMap()

/**
 * 无限字符串中标准的转义符号表。
 */
internal val stringEscapeSymbols = mapOf(
    'n' to '\n',
    't' to '\t',
    'r' to '\r',
    '"' to '"',
    '`' to '`',
    '\'' to '\'',
    '\\' to '\\'
)

/**
 * 受限字符串的开头能接受的符号。
 */
internal val restrictedStartSymbols = arrayOf('_', '?', '*')

/**
 * 受限字符串的中间能接受的符号。
 */
internal val restrictedMiddleSymbols = arrayOf('_', '?', '*', '+', '-', '!')

/**
 * 受限字符串的开头不能接受的符号。由于受限字符串的判断位置在最后，相当于全部符号 - 字符串起始符 - 单字符表 - 受限字符串可接受的符号。
 */
internal val restrictedDisableStartSymbols = (allSymbols.toSet() - stringBoundSymbols.keys - singleSymbols.toSet() - restrictedStartSymbols.toSet()).toTypedArray()

/**
 * 受限字符串中不能接受的符号，遇到这些符号就退出受限字符串。
 */
internal val restrictedDisableSymbols = (allSymbols.toSet() - restrictedMiddleSymbols.toSet()).toTypedArray()
