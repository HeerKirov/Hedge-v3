package com.heerkirov.hedge.server.library.form

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.JsonNodeType
import com.heerkirov.hedge.server.exceptions.ParamRequired
import com.heerkirov.hedge.server.exceptions.ParamTypeError
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.utils.*
import com.heerkirov.hedge.server.utils.composition.Composition
import com.heerkirov.hedge.server.utils.composition.CompositionGenerator
import com.heerkirov.hedge.server.utils.DateTime.parseDate
import com.heerkirov.hedge.server.utils.Json.parseJSONObject
import com.heerkirov.hedge.server.utils.Json.parseJsonNode
import com.heerkirov.hedge.server.utils.types.Opt
import com.heerkirov.hedge.server.utils.types.undefined
import io.javalin.http.Context
import java.lang.Exception
import java.lang.IllegalArgumentException
import java.time.Instant
import java.time.LocalDate
import java.time.format.DateTimeParseException
import kotlin.reflect.KClass
import kotlin.reflect.KType
import kotlin.reflect.KTypeParameter
import kotlin.reflect.full.isSubclassOf
import kotlin.reflect.full.primaryConstructor

/**
 * 使用自定义的表单解析器来解析表单。
 * 相比于直接使用jackson解析：
 * - 提供了更完备、更符合业务的错误信息反馈。
 * - 提供了更符合需要的注解校验器。
 * - 提供了供给partial update所需的opt选项的解析。
 */
inline fun <reified T : Any> Context.bodyAsForm(): T {
    return mapForm(this.body().parseJsonNode(), T::class)
}

inline fun <reified T : Any> Context.bodyAsListForm(): List<T> {
    val jsonNode = this.body().parseJsonNode()
    if(jsonNode.isArray) {
        return jsonNode.map { mapForm(it, T::class) }
    }else{
        throw be(ParamTypeError("body", "Request body must be List."))
    }
}

//FIX Optimize: 将类型解析的过程提到执行之前，并缓存类型解析信息，供下次复用。

/**
 * 执行将jsonNode转换为任意Object定义的过程。
 * @throws
 * @throws NullPointerException 类型指定为非空，然而获得了空类型
 * @throws ClassCastException 类型转换上遇到了错误
 */
private fun <T : Any> mapAny(jsonNode: JsonNode, kType: KType): Any? {
    val kClass: KClass<*> = when (kType.classifier) {
        is KClass<*> -> kType.classifier as KClass<*>
        is KTypeParameter -> (kType.classifier as KTypeParameter).variance.declaringJavaClass.kotlin
        else -> throw ClassCastException("kType is ${kType.classifier}.")
    }

    @Suppress("UNCHECKED_CAST")
    return when {
        kClass == Opt::class -> Opt(mapAny<T>(jsonNode, kType.arguments.first().type!!))
        jsonNode.isNull -> {
            if(!kType.isMarkedNullable) throw NullPointerException()
            null
        }
        kClass == List::class || kClass == Set::class -> {
            if(jsonNode.nodeType != JsonNodeType.ARRAY) throw ClassCastException("Excepted type is ${JsonNodeType.ARRAY} but actual type is ${jsonNode.nodeType}.")
            val subType = kType.arguments.first().type!!

            try { jsonNode.map { mapAny<Any>(it, subType) } }catch (e: NullPointerException) {
                throw ClassCastException("Element of array cannot be null.")
            }
        }
        kClass == Map::class -> {
            if(jsonNode.nodeType != JsonNodeType.OBJECT) throw ClassCastException("Excepted type is ${JsonNodeType.OBJECT} but actual type is ${jsonNode.nodeType}.")
            val keyType = kType.arguments[0].type!!
            val valueType = kType.arguments[1].type!!

            try { jsonNode.fields().map { entry -> Pair(mapStringKey(entry.key, keyType), mapAny<Any>(entry.value, valueType)) }.toMap() }catch (e: NullPointerException) {
                throw ClassCastException("Value of object cannot be null.")
            }
        }
        kClass == String::class -> {
            if(jsonNode.nodeType != JsonNodeType.STRING) throw ClassCastException("Excepted type is ${JsonNodeType.STRING} but actual type is ${jsonNode.nodeType}.")
            jsonNode.asText() as T
        }
        kClass == Boolean::class -> {
            if(jsonNode.nodeType != JsonNodeType.BOOLEAN) throw ClassCastException("Excepted type is ${JsonNodeType.BOOLEAN} but actual type is ${jsonNode.nodeType}.")
            jsonNode.asBoolean() as T
        }
        kClass == Int::class -> {
            if(jsonNode.nodeType != JsonNodeType.NUMBER) throw ClassCastException("Excepted type is ${JsonNodeType.NUMBER} but actual type is ${jsonNode.nodeType}.")
            if(!jsonNode.isInt && !jsonNode.isLong) throw ClassCastException("Excepted number type of Int.")
            jsonNode.asInt() as T
        }
        kClass == Long::class -> {
            if(jsonNode.nodeType != JsonNodeType.NUMBER) throw ClassCastException("Excepted type is ${JsonNodeType.NUMBER} but actual type is ${jsonNode.nodeType}.")
            if(!jsonNode.isInt && !jsonNode.isLong) throw ClassCastException("Excepted number type of Long.")
            jsonNode.asLong() as T
        }
        kClass == Double::class -> {
            if(jsonNode.nodeType != JsonNodeType.NUMBER) throw ClassCastException("Excepted type is ${JsonNodeType.NUMBER} but actual type is ${jsonNode.nodeType}.")
            jsonNode.asDouble() as T
        }
        kClass == Float::class -> {
            if(jsonNode.nodeType != JsonNodeType.NUMBER) throw ClassCastException("Excepted type is ${JsonNodeType.NUMBER} but actual type is ${jsonNode.nodeType}.")
            jsonNode.asDouble().toFloat() as T
        }
        kClass == Instant::class -> {
            if(jsonNode.nodeType != JsonNodeType.STRING) throw ClassCastException("Excepted type is ${JsonNodeType.STRING} but actual type is ${jsonNode.nodeType}.")
            try {
                Instant.parse(jsonNode.asText()) as T
            }catch (e: DateTimeParseException) {
                throw ClassCastException(e.message)
            }
        }
        kClass == LocalDate::class -> {
            if(jsonNode.nodeType != JsonNodeType.STRING) throw ClassCastException("Excepted type is ${JsonNodeType.STRING} but actual type is ${jsonNode.nodeType}.")
            try {
                jsonNode.asText().parseDate() as T
            }catch (e: DateTimeParseException) {
                throw ClassCastException(e.message)
            }
        }
        kClass == Any::class -> mapAnyWithoutType(jsonNode)
        kClass.isData -> {
            //提取非空参数，进行递归解析
            if(jsonNode.nodeType != JsonNodeType.OBJECT) throw ClassCastException("Excepted type is ${JsonNodeType.OBJECT} but actual type is ${jsonNode.nodeType}.")
            mapForm(jsonNode, kClass)
        }
        kClass.isSubclassOf(Enum::class) -> {
            if(jsonNode.nodeType != JsonNodeType.STRING) throw ClassCastException("Excepted type is ${JsonNodeType.STRING} but actual type is ${jsonNode.nodeType}.")
            val value = jsonNode.asText()
            val valueOf = kClass.java.getDeclaredMethod("valueOf", String::class.java)
            try {
                valueOf(null, value.uppercase())
            }catch (e: Exception) {
                throw ClassCastException("Cannot convert '$value' to enum type ${kClass.simpleName}.")
            }
        }
        kClass.isSubclassOf(Composition::class) -> {
            if(jsonNode.nodeType != JsonNodeType.ARRAY) throw ClassCastException("Excepted type is ${JsonNodeType.ARRAY} but actual type is ${jsonNode.nodeType}.")
            val generator = CompositionGenerator.getGenericGenerator(kClass as KClass<out Composition<*>>)
            val elements = jsonNode.parseJSONObject<List<String>>().map {
                generator.parse(it) ?: throw ClassCastException("Cannot convert '$it' to composition type ${kClass.simpleName}.")
            }
            //使用union函数会产生协变类型的问题，因此copy一份实现
            var base = 0
            for (element in elements) {
                base = base or element.value
            }
            generator.newInstance(base)
        }
        else -> try {
            jsonNode.parseJSONObject(kClass.java)
        }catch (e: Exception) {
            throw ClassCastException("Cannot convert object to ${kClass.simpleName}: ${e.message}")
        }
    }
}

/**
 * 执行将作为map key的string类型按照kType定义转换为任意object的过程。
 */
private fun mapStringKey(string: String, kType: KType): Any? {
    val kClass: KClass<*> = when (kType.classifier) {
        is KClass<*> -> kType.classifier as KClass<*>
        is KTypeParameter -> (kType.classifier as KTypeParameter).variance.declaringJavaClass.kotlin
        else -> throw ClassCastException("kType is ${kType.classifier}.")
    }

    return when {
        kClass == String::class -> string
        kClass == Int::class -> string.toIntOrNull() ?: throw ClassCastException("Expected number type of Int.")
        kClass == Long::class -> string.toLongOrNull() ?: throw ClassCastException("Expected number type of Long.")
        kClass == Float::class -> string.toFloatOrNull() ?: throw ClassCastException("Expected number type of Float.")
        kClass == Double::class -> string.toDoubleOrNull() ?: throw ClassCastException("Expected number type of Double.")
        kClass == Boolean::class -> string.toBoolean()
        kClass == Instant::class -> {
            try {
                Instant.parse(string)
            }catch (e: DateTimeParseException) {
                throw ClassCastException(e.message)
            }
        }
        kClass == LocalDate::class -> {
            try {
                string.parseDate()
            }catch (e: DateTimeParseException) {
                throw ClassCastException(e.message)
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
        else -> throw IllegalArgumentException("Cannot analyse argument of type '$kClass'.")
    }
}

/**
 * 执行将任意jsonNode在未知类型情况下自动转换为object的过程。
 */
private fun mapAnyWithoutType(jsonNode: JsonNode): Any {
    return when(jsonNode.nodeType) {
        JsonNodeType.NUMBER -> if(jsonNode.isInt || jsonNode.isLong) {
            jsonNode.asInt()
        }else{
            jsonNode.asDouble()
        }
        JsonNodeType.STRING -> jsonNode.asText()
        JsonNodeType.BOOLEAN -> jsonNode.asBoolean()
        JsonNodeType.ARRAY -> jsonNode.parseJSONObject()
        JsonNodeType.OBJECT -> jsonNode.parseJSONObject()
        else -> throw ClassCastException("Cannot parse type ${jsonNode.nodeType}.")
    }
}

/**
 * 执行将jsonNode转换为Form定义的Object的过程。
 */
fun <T : Any> mapForm(jsonNode: JsonNode, formClass: KClass<T>): T {
    val constructor = formClass.primaryConstructor!!

    val args = constructor.parameters.mapNotNull { parameter ->
        val optional = parameter.isOptional
        val name = parameter.name!!

        when {
            //form中包含对此field的定义，将其提取出来
            jsonNode.has(name) -> {
                val node = jsonNode.get(name)
                val value = try {
                    mapAny<Any>(node, parameter.type)
                }catch (e: ClassCastException) {
                    throw be(ParamTypeError(name, e.message?.let { "type cast error: $it" } ?: "type cast failed."))
                }catch (e: NullPointerException) {
                    throw be(ParamTypeError(name, "cannot be null."))
                }

                if(value is Opt<*>) {
                    if(value.value != null) {
                        try {
                            analyseValidation(parameter.annotations, value.value as Any)
                        }catch (e: Exception) {
                            throw be(ParamTypeError(name, e.message ?: "validation failed."))
                        }
                    }
                }else{
                    if(value != null) {
                        try {
                            analyseValidation(parameter.annotations, value)
                        }catch (e: Exception) {
                            throw be(ParamTypeError(name, e.message ?: "validation failed."))
                        }
                    }
                }

                Pair(parameter, value)
            }
            //form中不包含field的定义，但是参数定义表示此field可选
            optional -> null
            //不包含定义且必选
            else -> if(parameter.type.classifier == Opt::class) {
                //Opt类型会自动解析为undefined值
                Pair(parameter, undefined<Any?>())
            }else{
                throw be(ParamRequired(name))
            }
        }
    }.toMap()

    return constructor.callBy(args)
}

/**
 * 解析附带的validation检验注解，并执行检验。
 */
private fun analyseValidation(annotations: List<Annotation>, value: Any) {
    if(value is String) {
        (annotations.firstOrNull { it is NotBlank } as NotBlank?)?.let {
            if(value.isBlank()) throw Exception("cannot be blank.")
        }
        (annotations.firstOrNull { it is Length } as Length?)?.let {
            if(value.length > it.value) throw Exception("cannot longer than ${value.length}.")
        }
    }else if(value is Number) {
        val i = value.toInt()
        (annotations.firstOrNull { it is Range } as Range?)?.let {
            if(i > it.max || i < it.min) throw Exception("must be in range [${it.min}, ${it.max}].")
        }
        (annotations.firstOrNull { it is Min } as Min?)?.let {
            if(i < it.value) throw Exception("must be greater than ${it.value}.")
        }
    }
}