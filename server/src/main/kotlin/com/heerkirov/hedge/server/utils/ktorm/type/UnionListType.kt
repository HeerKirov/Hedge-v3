package com.heerkirov.hedge.server.utils.ktorm.type

import org.ktorm.schema.BaseTable
import org.ktorm.schema.Column
import org.ktorm.schema.SqlType
import java.sql.PreparedStatement
import java.sql.ResultSet
import java.sql.Types

object UnionListType : SqlType<List<String>>(Types.VARCHAR, typeName = "varchar") {
    private const val SPLIT = "|"

    override fun doGetResult(rs: ResultSet, index: Int): List<String> {
        val value = rs.getString(index)
        return if(value.isBlank()) emptyList() else value.split(SPLIT)
    }

    override fun doSetParameter(ps: PreparedStatement, index: Int, parameter: List<String>) {
        ps.setString(index, if(parameter.isEmpty()) "" else parameter.joinToString(SPLIT))
    }
}

/**
 * 将字符串数组映射为联合字符串。
 */
fun BaseTable<*>.unionList(name: String): Column<List<String>> {
    return registerColumn(name, UnionListType)
}
