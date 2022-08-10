package com.heerkirov.hedge.server.library.compiler.semantic.framework

import com.heerkirov.hedge.server.library.compiler.grammar.semantic.Str
import com.heerkirov.hedge.server.library.compiler.semantic.TypeCastError
import com.heerkirov.hedge.server.library.compiler.semantic.plan.*
import com.heerkirov.hedge.server.library.compiler.semantic.utils.semanticError
import java.time.LocalDate
import java.util.regex.Pattern

/**
 * str类型的复杂解析器。它提供值、区间等不同的输出结果。
 */
interface StrComplexParser<R> {
    fun parse(str: Str): StrComplexResult<R>
}

/**
 * 复杂解析器的返回结果，通过结果类型判断来确定实际结果类型。
 */
sealed class StrComplexResult<R>

/**
 * 单值类型。
 */
class StrComplexValue<R>(val value: R) : StrComplexResult<R>()

/**
 * 区间类型。区间总是[begin, end)的。
 */
class StrComplexRange<R>(val begin: R, val end: R) : StrComplexResult<R>()

/**
 * 日期转换器。
 * 它识别以下日期格式：yyyy-MM-dd yyyy-MM yyyy MM-dd MM。分隔符可用(- / .)。
 * 如果不满3部分，在开头的数字是4位及以上数字时，认为是year，否则认为是month。
 * 如果忽略了year，则默认是系统时间的当前年份。
 */
object DateParser : StrComplexParser<FilterDateValue> {
    override fun parse(str: Str): StrComplexResult<FilterDateValue> {
        val splits = str.value.split('-', '/', '.', limit = 3).map { it.toIntOrNull() ?: castError(str) }
        return when (splits.size) {
            3 -> StrComplexValue(FilterDateValueImpl(try { LocalDate.of(splits[0], splits[1], splits[2]) } catch (e: Exception) {
                castError(str)
            }))
            2 -> if(splits[0] >= 1000) {
                val begin = try { LocalDate.of(splits[0], splits[1], 1) } catch (e: Exception) {
                    castError(str)
                }
                val end = begin.plusMonths(1)
                StrComplexRange(FilterDateValueImpl(begin), FilterDateValueImpl(end))
            }else{
                StrComplexValue(FilterDateValueImpl(try { LocalDate.of(LocalDate.now().year, splits[0], splits[1]) } catch (e: Exception) {
                    castError(str)
                }))
            }
            1 -> if(splits[0] >= 1000) {
                val begin = try { LocalDate.of(splits[0], 1, 1) } catch (e: Exception) {
                    castError(str)
                }
                val end = begin.plusYears(1)
                StrComplexRange(FilterDateValueImpl(begin), FilterDateValueImpl(end))
            }else{
                val begin = try { LocalDate.of(LocalDate.now().year, splits[0], 1) } catch (e: Exception) {
                    castError(str)
                }
                val end = begin.plusMonths(1)
                StrComplexRange(FilterDateValueImpl(begin), FilterDateValueImpl(end))
            }
            else -> castError(str)
        }
    }

    private fun castError(str: Str): Nothing = semanticError(TypeCastError(str.value, TypeCastError.Type.DATE, str.beginIndex, str.endIndex))
}

/**
 * 可匹配数值转换器。
 * 大多数情况下，它的转换和数值类型一致。
 * 当出现匹配符号(* ?)时，拥有更多转换情况。(*)代表匹配任意字符，(?)代表匹配一个字符。
 * 当字符串有且仅有末尾出现任意数量的(?)时，数值会被分析为范围比较。
 * 其他出现匹配符号时，将其翻译为匹配字符串(直接输出)。
 */
object PatternNumberParser : StrComplexParser<FilterPatternNumberValue> {
    private val pattern = Pattern.compile("""^[\d?*]+$""")
    private val rangePattern = Pattern.compile("""^(\d+)(\?+)$""")

    override fun parse(str: Str): StrComplexResult<FilterPatternNumberValue> {
        return if(pattern.matcher(str.value).find() && str.value.indexOfAny(charArrayOf('*', '?')) >= 0) {
            val matcher = rangePattern.matcher(str.value)
            if(matcher.find()) {
                val prefixValue = matcher.group(1).toLongOrNull() ?: semanticError(TypeCastError(str.value, TypeCastError.Type.NUMBER, str.beginIndex, str.endIndex))
                val suffixLen = matcher.group(2).length

                StrComplexRange(
                    FilterPatternNumberValueImpl(multi(prefixValue, suffixLen)),
                    FilterPatternNumberValueImpl(multi(prefixValue + 1, suffixLen)))
            }else{
                StrComplexValue(FilterPatternNumberValueImpl(str.value))
            }
        }else{
            val value = str.value.toLongOrNull() ?: semanticError(TypeCastError(str.value, TypeCastError.Type.NUMBER, str.beginIndex, str.endIndex))
            StrComplexValue(FilterPatternNumberValueImpl(value))
        }
    }

    private tailrec fun multi(value: Long, len: Int): Long {
        return if(len == 0) value else multi(value * 10, len - 1)
    }
}