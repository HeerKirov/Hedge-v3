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

        when(val special = parameter.annotations.firstOrNull { it is Limit || it is Offset || it is Search || it is Order }) {
            null -> {
                val multi = parameter.type.classifier == List::class || parameter.type.classifier == Set::class
                val parameterValue = takeParameterValue(parameterMap, name, multi)
                parseGeneralParameter(parameter, parameterValue)
            }
            is Limit -> {
                val parameterValue = takeParameterValue(parameterMap, name, false)
                parseLimitParameter(special, parameter, parameterValue?.firstOrNull())
            }
            is Offset -> {
                val parameterValue = takeParameterValue(parameterMap, name, false)
                parseOffsetParameter(special, parameter, parameterValue?.firstOrNull())
            }
            is Search -> {
                val parameterValue = takeParameterValue(parameterMap, name, false)
                parseSearchParameter(parameter, parameterValue?.firstOrNull())
            }
            is Order -> {
                val parameterValue = takeParameterValue(parameterMap, name, true)
                parseOrderParameter(special, parameter, parameterValue)
            }
            else -> throw UnsupportedOperationException()
        }
    }.toMap()

    return constructor.callBy(args)
}

private fun takeParameterValue(parameterMap: Map<String, List<String>>, key: String, multi: Boolean, delimiter: Char = ','): List<String>? {
    return if(multi) {
        val p = parameterMap[key]?.flatMap { p -> p.split(delimiter) } ?: emptyList()
        val pList = parameterMap["$key[]"] ?: emptyList()
        (p + pList).filter { it.isNotBlank() }.map { it.trim() }.takeIf { it.isNotEmpty() }
    }else{
        parameterMap[key]
    }
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

private fun parseOrderParameter(annotation: Order, parameter: KParameter, parameterValue: List<String>?): Pair<KParameter, List<OrderItem>>? {
    return when {
        !parameterValue.isNullOrEmpty() -> {
            val options = annotation.options.takeIf { it.isNotEmpty() }?.associate { Pair(it.lowercase(), it) }

            val arraylist = parameterValue.map(::OrderItem).runIf(options != null) {
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

private fun parseGeneralParameter(parameter: KParameter, parameterValue: List<String>?): Pair<KParameter, Any?>? {
    return when {
        !parameterValue.isNullOrEmpty() -> {
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

private fun mapAnyFromString(string: List<String>, kType: KType): Any {
    @Suppress("UNCHECKED_CAST")
    val kClass = kType.classifier as KClass<*>
    @Suppress("UNCHECKED_CAST")
    return when {
        kClass == String::class -> string
        kClass == Int::class -> string.first().toIntOrNull() ?: throw ClassCastException("Expected number type of Int.")
        kClass == Long::class -> string.first().toLongOrNull() ?: throw ClassCastException("Expected number type of Long.")
        kClass == Float::class -> string.first().toFloatOrNull() ?: throw ClassCastException("Expected number type of Float.")
        kClass == Double::class -> string.first().toDoubleOrNull() ?: throw ClassCastException("Expected number type of Double.")
        kClass == Boolean::class -> string.first().toBoolean()
        kClass == Instant::class -> try { Instant.parse(string.first()) }catch (e: DateTimeParseException) {
            throw ClassCastException(e.message)
        }
        kClass == LocalDate::class -> try { string.first().parseDate() }catch (e: DateTimeParseException) {
            throw ClassCastException(e.message)
        }
        kClass == List::class || kClass == Set::class -> {
            val subType = kType.arguments.first().type!!
            try {
                string.map {
                    val sub = splitIntoList(it)
                    mapAnyFromString(sub, subType)
                }
            }catch (e: NullPointerException) {
                throw ClassCastException("Element of array cannot be null.")
            }
        }
        kClass.isSubclassOf(Enum::class) -> {
            val valueOf = kClass.java.getDeclaredMethod("valueOf", String::class.java)
            try {
                valueOf(null, string.first().uppercase())
            }catch (e: Exception) {
                throw ClassCastException("Cannot convert '$string' to enum type ${kClass.simpleName}.")
            }
        }
        kClass.isSubclassOf(Composition::class) -> {
            val generator = CompositionGenerator.getGenericGenerator(kClass as KClass<out Composition<*>>)
            val elements = string.map {
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