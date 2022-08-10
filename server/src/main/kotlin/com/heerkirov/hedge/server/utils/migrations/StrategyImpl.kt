package com.heerkirov.hedge.server.utils.migrations

import com.fasterxml.jackson.databind.JsonNode
import com.heerkirov.hedge.server.utils.Json.parseJSONObject
import com.heerkirov.hedge.server.utils.Json.parseJsonNode
import java.util.*
import kotlin.reflect.KClass

abstract class JsonObjectStrategy<T : Any>(private val clazz: KClass<T>) : CreateFinalDataStrategy<String?, JsonNode, T> {
    override fun translateSourceToOutputType(source: String?): T = source!!.parseJSONObject(clazz.java)

    override fun translateSourceToTempType(source: String?): JsonNode = source!!.parseJsonNode()

    override fun translateTempToOutputType(temp: JsonNode): T = temp.parseJSONObject(clazz.java)

    override fun createFinalData(source: String?): Optional<T> {
        return if(source != null) { Optional.empty() }else{ Optional.of(defaultData()) }
    }

    abstract fun defaultData(): T
}

abstract class SimpleStrategy<T> : Strategy<T, T, T> {
    override fun translateSourceToOutputType(source: T): T = source

    override fun translateSourceToTempType(source: T): T = source

    override fun translateTempToOutputType(temp: T): T = temp
}