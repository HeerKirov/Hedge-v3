package com.heerkirov.hedge.server.utils.ktorm.type

import org.ktorm.schema.BaseTable
import org.ktorm.schema.Column
import org.ktorm.schema.SqlType
import java.sql.PreparedStatement
import java.sql.ResultSet
import java.sql.Types
import java.time.LocalDate

object InstantDateType : SqlType<LocalDate>(Types.DATE, "date") {

    override fun doSetParameter(ps: PreparedStatement, index: Int, parameter: LocalDate) {
        val ts = parameter.toEpochDay() * 86400 * 1000
        ps.setLong(index, ts)
    }

    override fun doGetResult(rs: ResultSet, index: Int): LocalDate? {
        val ts = rs.getLong(index)
        return if(ts <= 0) null else LocalDate.ofEpochDay(ts / 1000 / 86400)
    }
}

fun BaseTable<*>.instantDate(name: String): Column<LocalDate> {
    return registerColumn(name, InstantDateType)
}