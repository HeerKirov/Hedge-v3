package com.heerkirov.hedge.server.library.form

import com.heerkirov.hedge.server.exceptions.ParamRequired
import com.heerkirov.hedge.server.exceptions.ParamTypeError
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.utils.DateTime.parseDate
import com.heerkirov.hedge.server.utils.composition.Composition
import com.heerkirov.hedge.server.utils.composition.CompositionGenerator
import com.heerkirov.hedge.server.utils.types.OrderItem
import com.heerkirov.hedge.server.utils.runIf
import io.javalin.http.Context
import java.lang.Exception
import java.lang.IllegalArgumentException
import java.time.Instant
import java.time.LocalDate
import java.time.format.DateTimeParseException
import kotlin.reflect.KClass
import kotlin.reflect.KParameter
import kotlin.reflect.KType
import kotlin.reflect.full.isSubclassOf
import kotlin.reflect.full.primaryConstructor


inline fun <reified T : Any> Context.queryAsFilter(): T {
    return parseFilter(T::class, this.queryParamMap())
}

fun <T : Any> parseFilter(kClass: KClass<T>, parameterMap: Map<String, List<String>>): T {
    val constructor = kClass.primaryConstructor!!

    val args = constructor.parameters.mapNotNull { parameter ->
        val name = parameter.name!!

        val parameterValue = takeParameterValue(parameterMap, name)

        when(val special = parameter.annotations.firstOrNull { it is Limit || it is Offset || it is Search || it is Order }) {
            null -> parseGeneralParameter(parameter, parameterValue)
            is Limit -> parseLimitParameter(special, parameter, parameterValue)
            is Offset -> parseOffsetParameter(special, parameter, parameterValue)
            is Search -> parseSearchParameter(parameter, parameterValue)
            is Order -> parseOrderParameter(special, parameter, parameterValue)
            else -> throw UnsupportedOperationException()
        }
    }.toMap()

    return constructor.callBy(args)
}

private fun takeParameterValue(parameterMap: Map<String, List<String>>, key: String): String? {
    return parameterMap[key]?.firstOrNull()?.ifBlank { null }
}

private fun splitIntoList(parameterValue: String, delimiter: Char = ','): List<String> {
    return try {
        parameterValue.split(delimiter).asSequence().filter { it.isNotBlank() }.map { it.trim() }.toList()
    }catch (e: Exception) {
        throw ClassCastException("Cannot convert '$parameterValue' to arraylist like 'A, B, C'.")
    }
}

private fun parseLimitParameter(annotation: Limit, parameter: KParameter, parameterValue: String?): Pair<KParameter, Int> {
    return Pair(parameter, parameterValue?.toIntOrNull() ?: annotation.default)
}

private fun parseOffsetParameter(annotation: Offset, parameter: KParameter, parameterValue: String?): Pair<KParameter, Int> {
    return Pair(parameter, parameterValue?.toIntOrNull() ?: annotation.default)
}

private fun parseSearchParameter(parameter: KParameter, parameterValue: String?): Pair<KParameter, String?> {
    return Pair(parameter, parameterValue)
}

private fun parseOrderParameter(annotation: Order, parameter: KParameter, parameterValue: String?): Pair<KParameter, List<OrderItem>>? {
    return when {
        !parameterValue.isNullOrBlank() -> {
            val options = annotation.options.takeIf { it.isNotEmpty() }?.associate { Pair(it.lowercase(), it) }

            val arraylist = splitIntoList(parameterValue, annotation.delimiter).map(::OrderItem).runIf(options != null) {
                map {
                    val match = options!![it.name.lowercase()] ?: throw be(ParamTypeError(parameter.name!!, "must be one of [${options.values.joinToString(", ")}]."))
                    OrderItem(match, it.desc)
                }
            }

            Pair(parameter, arraylist)
        }
        parameter.isOptional -> null
        else -> throw be(ParamRequired(parameter.name!!))
    }
}

private fun parseGeneralParameter(parameter: KParameter, parameterValue: String?): Pair<KParameter, Any?>? {
    return when {
        parameterValue != null -> {
            val value = try {
                mapAnyFromString(parameterValue, parameter.type)
            }catch (e: ClassCastException) {
                throw be(ParamTypeError(parameter.name!!, e.message?.let { "type cast error: $it" } ?: "type cast failed."))
            }
            Pair(parameter, value)
        }
        parameter.isOptional -> null
        else -> throw be(ParamRequired(parameter.name!!))
    }
}

private fun mapAnyFromString(string: String, kType: KType): Any {
    @Suppress("UNCHECKED_CAST")
    val kClass = kType.classifier as KClass<*>
    @Suppress("UNCHECKED_CAST")
    return when {
        kClass == String::class -> string
        kClass == Int::class -> string.toIntOrNull() ?: throw ClassCastException("Expected number type of Int.")
        kClass == Long::class -> string.toLongOrNull() ?: throw ClassCastException("Expected number type of Long.")
        kClass == Float::class -> string.toFloatOrNull() ?: throw ClassCastException("Expected number type of Float.")
        kClass == Double::class -> string.toDoubleOrNull() ?: throw ClassCastException("Expected number type of Double.")
        kClass == Boolean::class -> string.toBoolean()
        kClass == Instant::class -> try { Instant.parse(string) }catch (e: DateTimeParseException) {
            throw ClassCastException(e.message)
        }
        kClass == LocalDate::class -> try { string.parseDate() }catch (e: DateTimeParseException) {
            throw ClassCastException(e.message)
        }
        kClass == List::class || kClass == Set::class -> {
            val arraylist = splitIntoList(string)
            val subType = kType.arguments.first().type!!
            try { arraylist.map { mapAnyFromString(it, subType) } }catch (e: NullPointerException) {
                throw ClassCastException("Element of array cannot be null.")
            }
        }
        kClass.isSubclassOf(Enum::class) -> {
            val valueOf = kClass.java.getDeclaredMethod("valueOf", String::class.java)
            try {
                valueOf(null, string.uppercase())
            }catch (e: Exception) {
                throw ClassCastException("Cannot convert '$string' to enum type ${kClass.simpleName}.")
            }
        }
        kClass.isSubclassOf(Composition::class) -> {
            val arraylist = splitIntoList(string)
            val generator = CompositionGenerator.getGenericGenerator(kClass as KClass<out Composition<*>>)
            val elements = arraylist.map {
                generator.parse(it) ?: throw ClassCastException("Cannot convert '$it' to composition type ${kClass.simpleName}.")
            }
            //使用union函数会产生协变类型的问题，因此copy一份实现
            var base = 0
            for (element in elements) {
                base = base or element.value
            }
            generator.newInstance(base)
        }
        else -> throw IllegalArgumentException("Cannot analyse argument of type '$kClass'.")
    }
}