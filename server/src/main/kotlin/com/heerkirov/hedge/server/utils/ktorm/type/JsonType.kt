package com.heerkirov.hedge.server.utils.ktorm.type

import com.fasterxml.jackson.databind.JavaType
import com.heerkirov.hedge.server.utils.Json
import com.heerkirov.hedge.server.utils.Json.parseJSONObject
import com.heerkirov.hedge.server.utils.Json.toJSONString
import org.ktorm.schema.BaseTable
import org.ktorm.schema.Column
import org.ktorm.schema.SqlType
import org.ktorm.schema.TypeReference
import java.lang.reflect.Type
import java.sql.PreparedStatement
import java.sql.ResultSet
import java.sql.Types

class JsonType<T: Any>(type: Type) : SqlType<T>(Types.OTHER, typeName = "jsonb") {
    private val javaType: JavaType = Json.objectMapper().constructType(type)

    override fun doGetResult(rs: ResultSet, index: Int): T? {
        val s = rs.getString(index)
        return if(s.isNullOrBlank()) {
            null
        }else{
            s.parseJSONObject(javaType)
        }
    }

    override fun doSetParameter(ps: PreparedStatement, index: Int, parameter: T) {
        ps.setObject(index, parameter.toJSONString(), Types.OTHER)
    }
}

fun <E: Any, C: Any> BaseTable<E>.json(name: String, typeReference: TypeReference<C>): Column<C> {
    return registerColumn(name, JsonType(typeReference.referencedType))
}