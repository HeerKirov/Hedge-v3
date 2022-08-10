package com.heerkirov.hedge.server.library.compiler.lexical

import com.heerkirov.hedge.server.library.compiler.utils.AnalysisResult
import com.heerkirov.hedge.server.library.compiler.utils.ErrorCollector
import com.heerkirov.hedge.server.library.compiler.utils.LexicalError
import com.heerkirov.hedge.server.utils.runIf
import java.util.*

/**
 * 词法分析器。执行Query语句 -> 词素列表的步骤。
 */
object LexicalAnalyzer {
    /**
     * 执行词法分析。
     * 返回的列表除词素外，还包括每个词素的出身位置，以及生成该词素的原始字符串，便于进行错误回溯。
     */
    fun parse(queryLanguage: String, options: LexicalOptions? = null): AnalysisResult<List<LexicalItem>, LexicalError<*>> {
        val parser = Parser(queryLanguage, options ?: emptyOptions)
        val result = LinkedList<LexicalItem>()
        var index = 0
        while (index < queryLanguage.length) {
            val morpheme = parser.analyseSpace(index) ?: parser.analyseSymbol(index) ?: parser.analyseString(index) ?: parser.analyseRestrictedString(index) ?: parser.analyseElse(index)
            if(morpheme != null) result.add(LexicalItem(morpheme, index, parser.endIndex))
            index = parser.endIndex
        }
        return AnalysisResult(result, parser.collector.warnings, parser.collector.errors)
    }

    private class Parser(private val text: String, private val options: LexicalOptions) {
        val collector = ErrorCollector<LexicalError<*>>()
        var endIndex: Int = 0

        fun analyseSpace(beginIndex: Int): Morpheme? {
            if(text[beginIndex] in spaceSymbols) {
                for(i in (beginIndex + 1) until text.length) {
                    if(text[i] !in spaceSymbols) {
                        return Space withEndIndex { i }
                    }
                }
                return Space withEndIndex { text.length }
            }
            return null
        }

        fun analyseSymbol(beginIndex: Int): Morpheme? {
            //符号的判断较为简单，因为符号只有1、2两种长度，且2长度的符号开头一定是1长度的符号
            //当取得的符号位于doubleSymbol映射表时，验证下一位符号是否存在，以及是否属于映射表
            val char = text[beginIndex]
            if (char in singleSymbols) {
                if(beginIndex + 1 < text.length) {
                    val d = doubleSymbolsSuffix[char]
                    if(d != null && text[beginIndex + 1] in d) {
                        return Symbol.of(text.substring(beginIndex, beginIndex + 2)) withEndIndex { beginIndex + 2 }
                    }
                }
                return Symbol.of(char.toString()) withEndIndex { beginIndex + 1 }
            }else if(options.chineseSymbolReflect && char in chineseSingleSymbols) {
                //在开启中文字符转换后，验证char是否是规定中的全角字符
                if(beginIndex + 1 < text.length) {
                    val reflectChar = chineseSingleSymbols[char]!!
                    //全角字符的2长度符号的开头可能是中文字符，但第二个字符并不是，因此仍然沿用原先的2字符映射表
                    val d = doubleSymbolsSuffix[reflectChar]
                    if(d != null && text[beginIndex + 1] in d) {
                        return Symbol.of("$reflectChar${text[beginIndex + 1]}") withEndIndex { beginIndex + 2 }
                    }
                }
                return Symbol.of(chineseSingleSymbols[char]!!.toString()) withEndIndex { beginIndex + 1 }
            }
            return null
        }

        fun analyseString(beginIndex: Int): Morpheme? {
            val quote = text[beginIndex]
            //遇到一个字符串开始符号时，视作一个无限字符串的开始。
            val type: CharSequenceType
            val quoteEnd: Char
            if(quote in stringBoundSymbols) {
                type = stringBoundSymbols[quote]!!
                quoteEnd = quote
            }else if(options.chineseSymbolReflect && quote in chineseStringBoundSymbols) {
                type = chineseStringBoundSymbols[quote]!!
                quoteEnd = chineseStringEndSymbols[quote]!!
            }else return null

            val builder = StringBuilder()

            var index = beginIndex + 1
            while(index < text.length) {
                when (val char = text[index]) {
                    quoteEnd -> {
                        //遇到匹配的字符串结束符号，结束这段字符串
                        return CharSequence(type, builder.toString()) withEndIndex { index + 1 }
                    }
                    '\\' -> {
                        //遇到转义符号
                        if(++index >= text.length) {
                            //WARNING: 转义符号后接EOF，错误的符号预期
                            collector.warning(ExpectEscapedCharacterButEOF(index))
                            return CharSequence(type, builder.toString()) withEndIndex { index }
                        }
                        val originChar = text[index]
                        val escapeChar = stringEscapeSymbols[originChar]
                        if(escapeChar == null) {
                            //WARNING: 转义了一个普通字符
                            collector.warning(NormalCharacterEscaped(originChar, index))
                            builder.append(originChar)
                        }else{
                            builder.append(escapeChar)
                        }
                    }
                    else -> builder.append(char)
                }
                index += 1
            }
            //WARNING: 遇到了EOF，而没有遇到字符串终结符，错误的符号预期
            collector.warning(ExpectQuoteButEOF(quote, text.length))
            return CharSequence(type, builder.toString()) withEndIndex { text.length }
        }

        fun analyseRestrictedString(beginIndex: Int): Morpheme? {
            if(text[beginIndex] !in restrictedDisableStartSymbols) {
                //受限字符串的进入判定是数字字母、unicode、可用开始符号。由于unicode字符不好判断，就反过来判断只要不在禁用符号表即可
                for(index in beginIndex until text.length) {
                    val char = text[index]
                    if(char in spaceSymbols || char in restrictedDisableSymbols || (options.chineseSymbolReflect && chineseSingleSymbols[char]?.let { it in restrictedDisableSymbols } == true)) {
                        //遇到空格或禁止在受限字符串使用的符号时，有限字符串结束
                        return CharSequence(CharSequenceType.RESTRICTED, text.substring(beginIndex, index).runIf(options.translateUnderscoreToSpace) { replace('_', ' ') }) withEndIndex { index }
                    }
                    //除此之外的其他符号包括数字字母和受限字符串可用的符号
                }
                //遇到EOF，有限字符串结束
                return CharSequence(CharSequenceType.RESTRICTED, text.substring(beginIndex).runIf(options.translateUnderscoreToSpace) { replace('_', ' ') }) withEndIndex { text.length }
            }
            return null
        }

        fun analyseElse(beginIndex: Int): Nothing? {
            //其他情况则是遇到了一个节外生枝的字符，这个字符不属于符号表，也不能用在有限字符串，因此提出一个警告
            collector.warning(UselessSymbol(text[beginIndex], beginIndex))
            endIndex = beginIndex + 1
            return null
        }

        private inline infix fun Morpheme.withEndIndex(call: () -> Int): Morpheme {
            this@Parser.endIndex = call()
            return this
        }
    }

    private val emptyOptions = LexicalOptionsImpl()
}