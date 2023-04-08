package com.heerkirov.hedge.server.utils.ktorm.type

import org.ktorm.schema.BaseTable
import org.ktorm.schema.Column
import org.ktorm.schema.SqlType
import java.sql.PreparedStatement
import java.sql.ResultSet
import java.sql.Types

object StringUnionListType : SqlType<List<String>>(Types.VARCHAR, typeName = "varchar") {
    private const val SPLIT = "|"

    override fun doGetResult(rs: ResultSet, index: Int): List<String> {
        val value = rs.getString(index)
        return if(value.isNullOrBlank()) {
            emptyList()
        }else{
            val start = if(value.startsWith(SPLIT)) 1 else 0
            val end = if(value.endsWith(SPLIT)) value.length - 1 else value.length
            value.substring(start, end).split(SPLIT)
        }
    }

    override fun doSetParameter(ps: PreparedStatement, index: Int, parameter: List<String>) {
        ps.setString(index, if(parameter.isEmpty()) "" else parameter.joinToString(SPLIT, SPLIT, SPLIT))
    }
}

class UnionListType<T>(private val parser: (String) -> T) : SqlType<List<T>>(Types.VARCHAR, typeName = "varchar") {
    private val SPLIT = "|"

    override fun doGetResult(rs: ResultSet, index: Int): List<T> {
        val value = rs.getString(index)
        return if(value.isNullOrBlank()) {
            emptyList()
        }else{
            val start = if(value.startsWith(SPLIT)) 1 else 0
            val end = if(value.endsWith(SPLIT)) value.length - 1 else value.length
            value.substring(start, end).split(SPLIT).map(parser)
        }
    }

    override fun doSetParameter(ps: PreparedStatement, index: Int, parameter: List<T>) {
        ps.setString(index, if(parameter.isEmpty()) "" else parameter.joinToString(SPLIT, SPLIT, SPLIT))
    }
}

/**
 * 将字符串数组映射为联合字符串。
 */
fun BaseTable<*>.unionList(name: String): Column<List<String>> {
    return registerColumn(name, StringUnionListType)
}

/**
 * 将数组映射为联合字符串。
 */
fun <T> BaseTable<*>.unionList(name: String, parser: (String) -> T): Column<List<T>> {
    return registerColumn(name, UnionListType(parser))
}
