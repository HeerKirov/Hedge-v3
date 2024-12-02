package com.heerkirov.hedge.server.library.compiler.semantic.framework

import com.heerkirov.hedge.server.library.compiler.grammar.semantic.Str
import com.heerkirov.hedge.server.library.compiler.semantic.EnumTypeCastError
import com.heerkirov.hedge.server.library.compiler.semantic.TypeCastError
import com.heerkirov.hedge.server.library.compiler.semantic.plan.*
import com.heerkirov.hedge.server.library.compiler.semantic.utils.AliasDefinition
import com.heerkirov.hedge.server.library.compiler.semantic.utils.semanticError
import java.util.regex.Pattern
import kotlin.reflect.KClass

/**
 * str类型到filterValue的转换器。
 */
interface StrTypeParser<R> {
    fun parse(str: Str): R
}

/**
 * enum类型到filterValue的转换器。添加了一个函数用于列出枚举值。
 */
interface EnumTypeParser<R> : StrTypeParser<R> {
    fun enums(): Collection<List<String>>
}

/**
 * 字符串转换器。
 * 实际上没有转换。
 */
object StringParser : StrTypeParser<FilterStringValue> {
    override fun parse(str: Str) = FilterStringValueImpl(str.value)
}

/**
 * 字符串类型的枚举转换器。其枚举值使用字符串列出。
 * 无视大小写对枚举值做配对。配对使用枚举值的alias属性。
 */
class StringEnumParser(private val typeName: String, enumAlias: List<AliasDefinition<String, String>>) : EnumTypeParser<FilterStringValue> {
    private val enums = enumAlias.map { it.alias.map(String::lowercase) }
    private val expected = enums.flatten()
    private val valueMap = enumAlias.asSequence().flatMap { (k, v) -> v.asSequence().map { it.lowercase() to k } }.toMap()

    override fun parse(str: Str): FilterStringValue {
        val value = valueMap[str.value] ?: semanticError(EnumTypeCastError(str.value, typeName, expected, str.beginIndex, str.endIndex))
        return FilterStringValueImpl(value)
    }

    override fun enums(): Collection<List<String>> {
        return enums
    }
}

/**
 * 枚举转换器。
 * 无视大小写对枚举值做配对。配对使用枚举值的alias属性。
 */
class EnumParser<E : Enum<E>>(clazz: KClass<E>, enumAlias: List<AliasDefinition<E, String>>) : EnumTypeParser<FilterEnumValue<E>> {
    private val enums = enumAlias.map { it.alias.map(String::lowercase) }
    private val expected = enums.flatten()
    private val valueMap = enumAlias.asSequence().flatMap { (k, v) -> v.asSequence().map { it.lowercase() to k } }.toMap()
    private val typeName = clazz.simpleName!!

    override fun parse(str: Str): FilterEnumValue<E> {
        val value = valueMap[str.value] ?: semanticError(EnumTypeCastError(str.value, typeName, expected, str.beginIndex, str.endIndex))
        return FilterEnumValueImpl(value)
    }

    override fun enums(): Collection<List<String>> {
        return enums
    }
}

/**
 * 数值转换器。
 * 将值直接转换为Int，未能成功转换时视为非法值。
 */
object NumberParser : StrTypeParser<FilterNumberValue> {
    override fun parse(str: Str): FilterNumberValue {
        val i = str.value.toLongOrNull() ?: semanticError(TypeCastError(str.value, TypeCastError.Type.NUMBER, str.beginIndex, str.endIndex))
        return FilterNumberValueImpl(i)
    }
}

/**
 * 乘值转换器。
 * 将值理解为两个数的乘值，并转换为Int，未能成功转换时视为非法值。可以使用叉(x)或星号(*)
 */
object TimesNumberParser : StrTypeParser<FilterNumberValue> {
    override fun parse(str: Str): FilterNumberValue {
        val timesIdx = str.value.indexOfFirst { it == 'x' || it == 'X' || it == '*' }
        if(timesIdx >= 0) {
            val first = str.value.substring(0, timesIdx).trimEnd().toLongOrNull() ?: semanticError(TypeCastError(str.value, TypeCastError.Type.NUMBER, str.beginIndex, str.endIndex))
            val last = str.value.substring(timesIdx + 1).trimStart().toLongOrNull() ?: semanticError(TypeCastError(str.value, TypeCastError.Type.NUMBER, str.beginIndex, str.endIndex))
            return FilterNumberValueImpl(first * last)
        }
        val i = str.value.toLongOrNull() ?: semanticError(TypeCastError(str.value, TypeCastError.Type.NUMBER, str.beginIndex, str.endIndex))
        return FilterNumberValueImpl(i)
    }
}

/**
 * 比值转换器。
 * 将值理解为两个数的比值，并转换为Number，未能成功转换时视为非法值。可以使用小数点(.)或除号(/)或比值号(:)
 */
object RatioParser : StrTypeParser<FilterFloatNumberValue> {
    override fun parse(str: Str): FilterFloatNumberValue {
        val divideIdx = str.value.indexOfFirst { it == ':' || it == '/' }
        if(divideIdx >= 0) {
            val first = str.value.substring(0, divideIdx).trimEnd().toDoubleOrNull() ?: semanticError(TypeCastError(str.value, TypeCastError.Type.NUMBER, str.beginIndex, str.endIndex))
            val last = str.value.substring(divideIdx + 1).trimStart().toDoubleOrNull() ?: semanticError(TypeCastError(str.value, TypeCastError.Type.NUMBER, str.beginIndex, str.endIndex))
            if(last == 0.0) semanticError(TypeCastError(str.value, TypeCastError.Type.NUMBER, str.beginIndex, str.endIndex))
            return FilterFloatNumberValueImpl(first / last)
        }
        val i = str.value.toDoubleOrNull() ?: semanticError(TypeCastError(str.value, TypeCastError.Type.NUMBER, str.beginIndex, str.endIndex))
        return FilterFloatNumberValueImpl(i)
    }
}

/**
 * 文件大小类型转换器。
 * 它识别"{数值}{单位}"这个格式的文件大小表示。
 * 数值只能是自然数。单位可选有：B KB MB GB TB KiB MiB GiB TiB。无视大小写。*B使用1000进制，*iB使用1024进制。*B系列单位可省略B。
 */
object ByteSizeParser : StrTypeParser<FilterSizeValue> {
    private val pattern = Pattern.compile("""^(\d+)([a-zA-Z]+)$""")
    private val units = mapOf(
        "b" to 1L,
        "kb" to 1000L,
        "k" to 1000L,
        "mb" to 1000L * 1000,
        "m" to 1000L * 1000,
        "gb" to 1000L * 1000 * 1000,
        "g" to 1000L * 1000 * 1000,
        "tb" to 1000L * 1000 * 1000 * 1000,
        "t" to 1000L * 1000 * 1000 * 1000,
        "kib" to 1024L,
        "mib" to 1024L * 1024,
        "gib" to 1024L * 1024 * 1024,
        "tib" to 1024L * 1024 * 1024 * 1024
    )

    override fun parse(str: Str): FilterSizeValue {
        val match = pattern.matcher(str.value)
        if(match.find()) {
            val size = match.group(1).toLongOrNull() ?: semanticError(TypeCastError(str.value, TypeCastError.Type.SIZE, str.beginIndex, str.endIndex))
            val unit = units[match.group(2).lowercase()] ?: semanticError(TypeCastError(str.value, TypeCastError.Type.SIZE, str.beginIndex, str.endIndex))
            return FilterSizeValueImpl(size * unit)
        }else semanticError(TypeCastError(str.value, TypeCastError.Type.SIZE, str.beginIndex, str.endIndex))
    }
}

/**
 * 时长类型转换器。
 * 它识别"{数值}{单位}"这个格式的文件大小表示。
 * 数值只能是自然数。单位可选有：S/SEC/SECOND/SECONDS M/MIN/MINUTE/MINUTES H/HOUR/HOURS。无视大小写。全部使用60进制。
 */
object DurationSizeParser : StrTypeParser<FilterSizeValue> {
    private val pattern = Pattern.compile("""^(\d+)([a-zA-Z]+)$""")
    private val units = mapOf(
        "s" to 1000L,
        "sec" to 1000L,
        "second" to 1000L,
        "seconds" to 1000L,
        "m" to 1000L * 60,
        "min" to 1000L * 60,
        "minute" to 1000L * 60,
        "minutes" to 1000L * 60,
        "h" to 1000L * 60 * 60,
        "hour" to 1000L * 60 * 60,
        "hours" to 1000L * 60 * 60
    )

    override fun parse(str: Str): FilterSizeValue {
        val match = pattern.matcher(str.value)
        if(match.find()) {
            val size = match.group(1).toLongOrNull() ?: semanticError(TypeCastError(str.value, TypeCastError.Type.SIZE, str.beginIndex, str.endIndex))
            val unit = units[match.group(2).lowercase()] ?: semanticError(TypeCastError(str.value, TypeCastError.Type.SIZE, str.beginIndex, str.endIndex))
            return FilterSizeValueImpl(size * unit)
        }else semanticError(TypeCastError(str.value, TypeCastError.Type.SIZE, str.beginIndex, str.endIndex))
    }
}
