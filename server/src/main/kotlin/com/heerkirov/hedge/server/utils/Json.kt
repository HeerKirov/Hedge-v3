package com.heerkirov.hedge.server.utils

import com.fasterxml.jackson.core.JsonGenerator
import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.*
import com.fasterxml.jackson.databind.module.SimpleModule
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import com.heerkirov.hedge.server.utils.composition.Composition
import com.heerkirov.hedge.server.utils.composition.CompositionGenerator
import com.heerkirov.hedge.server.utils.tuples.Tuple


private val objectMapper = jacksonObjectMapper()
    .configure(DeserializationFeature.FAIL_ON_IGNORED_PROPERTIES, false)
    .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false)
    .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)
    .configure(SerializationFeature.FAIL_ON_EMPTY_BEANS, false)
    .registerModule(JavaTimeModule())
    .registerModule(SimpleModule().apply {
        addSerializer(Composition::class.java, CompositionSerializer)
        addSerializer(Tuple::class.java, TupleSerializer)
    })

object Json {
    fun objectMapper(): ObjectMapper = objectMapper

    fun <T> T.toJSONString(): String {
        return objectMapper.writeValueAsString(this)
    }

    inline fun <reified T> String.parseJSONObject(): T {
        return objectMapper().readValue(this, T::class.java)
    }

    fun <T> String.parseJSONObject(clazz: Class<T>): T {
        return objectMapper().readValue(this, clazz)
    }

    fun <T> String.parseJSONObject(typeReference: TypeReference<T>): T {
        return objectMapper().readValue(this, typeReference)
    }

    fun <T> String.parseJSONObject(javaType: JavaType): T {
        return objectMapper().readValue(this, javaType)
    }

    fun <T> T.toJsonNode(): JsonNode {

        return objectMapper.valueToTree(this)
    }

    inline fun <reified T> JsonNode.parseJSONObject(): T {
        return objectMapper().convertValue(this, T::class.java)
    }

    fun <T> JsonNode.parseJSONObject(clazz: Class<T>): T {
        return objectMapper().convertValue(this, clazz)
    }

    fun <T> JsonNode.parseJSONObject(typeReference: TypeReference<T>): T {
        return objectMapper().convertValue(this, typeReference)
    }

    fun String.parseJsonNode(): JsonNode {
        return objectMapper.readTree(this)
    }

    inline fun JsonNode.updateField(field: String, mapper: (fieldValue: JsonNode) -> JsonNode): JsonNode {
        return this.parseJSONObject(object : TypeReference<Map<String, JsonNode>>() {}).mapValues { (k, v) ->
            if (k !== field) v else mapper(v)
        }.toJsonNode()
    }

    inline fun JsonNode.upsertField(field: String, mapper: (fieldValue: JsonNode?) -> JsonNode): JsonNode {
        val map = this.parseJSONObject(object : TypeReference<MutableMap<String, JsonNode>>() {})
        if(map.containsKey(field)) {
            map[field] = mapper(map[field])
        }else{
            map[field] = mapper(null)
        }
        return map.toJsonNode()
    }
}

object CompositionSerializer : JsonSerializer<Composition<*>>() {
    override fun serialize(element: Composition<*>, jsonGenerator: JsonGenerator, serializerProvider: SerializerProvider) {
        val generator = CompositionGenerator.getGenerator(element::class)
        val result = generator.exportedElementsOfGeneric(element).map { it.toString() }
        jsonGenerator.writeObject(result)
    }
}

object TupleSerializer : JsonSerializer<Tuple>() {
    override fun serialize(value: Tuple, gen: JsonGenerator, serializers: SerializerProvider) {
        gen.writeStartArray(value.length)
        value.toArray().forEach { gen.writeObject(it) }
        gen.writeEndArray()
    }
}