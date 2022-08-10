package com.heerkirov.hedge.server.utils.ktorm.type

import org.ktorm.schema.BaseTable
import org.ktorm.schema.Column
import org.ktorm.schema.SqlType
import org.ktorm.schema.TypeReference
import java.sql.PreparedStatement
import java.sql.ResultSet
import java.sql.Types

class EnumType<T: Enum<T>>(enumClass: Class<T>) : SqlType<T>(Types.TINYINT, typeName = "tinyint") {
    private val values = enumClass.enumConstants

    override fun doGetResult(rs: ResultSet, index: Int): T? {
        return values[rs.getInt(index)]
    }

    override fun doSetParameter(ps: PreparedStatement, index: Int, parameter: T) {
        ps.setByte(index, parameter.ordinal.toByte())
    }
}

/**
 * 将枚举类型映射为byte/tinyint类型。映射基于枚举类型的ordinal。
 */
fun <E: Any, C: Enum<C>> BaseTable<E>.enum(name: String, typeReference: TypeReference<C>): Column<C> {
    @Suppress("UNCHECKED_CAST")
    return registerColumn(name, EnumType(typeReference.referencedType as Class<C>))
}
