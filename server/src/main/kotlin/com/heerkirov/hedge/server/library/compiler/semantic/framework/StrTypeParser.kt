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
 * 文件大小类型转换器。
 * 它识别"{数值}{单位}"这个格式的文件大小表示。
 * 数值只能是自然数。单位可选有：B KB MB GB TB KiB MiB GiB TiB。无视大小写。*B使用1000进制，*iB使用1024进制。*B系列单位可省略B。
 */
object SizeParser : StrTypeParser<FilterSizeValue> {
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
