package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.Partitions
import com.heerkirov.hedge.server.exceptions.NotFound
import com.heerkirov.hedge.server.dto.filter.PartitionFilter
import com.heerkirov.hedge.server.dto.res.PartitionMonthRes
import com.heerkirov.hedge.server.dto.res.PartitionRes
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import org.ktorm.dsl.*
import org.ktorm.entity.filter
import org.ktorm.entity.sequenceOf
import org.ktorm.entity.sortedBy
import java.time.LocalDate

class PartitionService(private val data: DataRepository) {
    fun list(filter: PartitionFilter): List<PartitionRes> {
        return data.db.from(Partitions).select()
            .whereWithConditions {
                if(filter.gte != null) it += Partitions.date greaterEq filter.gte
                if(filter.lt != null) it += Partitions.date less filter.lt
                it += Partitions.cachedCount greater 0
            }
            .orderBy(Partitions.date.asc())
            .map { PartitionRes(it[Partitions.date]!!, it[Partitions.cachedCount]!!) }
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun get(date: LocalDate): PartitionRes {
        return data.db.from(Partitions).select()
            .where { (Partitions.date eq date) and (Partitions.cachedCount greater 0) }
            .firstOrNull()
            ?.let { PartitionRes(it[Partitions.date]!!, it[Partitions.cachedCount]!!) }
            ?: throw be(NotFound())
    }

    fun listMonths(): List<PartitionMonthRes> {
        return data.db.sequenceOf(Partitions)
            .filter { it.cachedCount greater 0 }
            .sortedBy { it.date }
            .asKotlinSequence()
            .groupBy { it.date.year to it.date.monthValue }
            .map { (e, p) -> PartitionMonthRes(e.first, e.second, p.count(), p.sumOf { it.cachedCount }) }
    }
}