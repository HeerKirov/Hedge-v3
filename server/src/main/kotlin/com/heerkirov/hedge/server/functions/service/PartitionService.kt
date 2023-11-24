package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.filter.IllustQueryType
import com.heerkirov.hedge.server.exceptions.NotFound
import com.heerkirov.hedge.server.dto.filter.PartitionFilter
import com.heerkirov.hedge.server.dto.res.PartitionMonthRes
import com.heerkirov.hedge.server.dto.res.PartitionRes
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.functions.manager.query.QueryManager
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import org.ktorm.dsl.*
import org.ktorm.entity.filter
import org.ktorm.entity.sequenceOf
import org.ktorm.entity.sortedBy
import java.time.LocalDate

class PartitionService(private val data: DataRepository, private val queryManager: QueryManager) {
    fun list(filter: PartitionFilter): List<PartitionRes> {
        if(filter.query.isNullOrBlank() && filter.type == IllustQueryType.IMAGE) {
            return data.db.from(Partitions).select()
                .whereWithConditions {
                    if(filter.gte != null) it += Partitions.date greaterEq filter.gte
                    if(filter.lt != null) it += Partitions.date less filter.lt
                    it += Partitions.cachedCount greater 0
                }
                .orderBy(Partitions.date.asc())
                .map { PartitionRes(it[Partitions.date]!!, it[Partitions.cachedCount]!!) }
        }else{
            val schema = if(filter.query.isNullOrBlank()) null else {
                queryManager.querySchema(filter.query, QueryManager.Dialect.ILLUST).executePlan ?: return emptyList()
            }

            return data.db.from(Illusts)
                .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
                .let { schema?.joinConditions?.fold(it) { acc, join -> if(join.left) acc.leftJoin(join.table, join.condition) else acc.innerJoin(join.table, join.condition) } ?: it }
                .select(Illusts.partitionTime, countDistinct(Illusts.id).aliased("count"))
                .whereWithConditions {
                    it += when(filter.type) {
                        IllustQueryType.COLLECTION -> (Illusts.type eq IllustModelType.COLLECTION) or (Illusts.type eq IllustModelType.IMAGE)
                        IllustQueryType.IMAGE -> (Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT)
                        IllustQueryType.ONLY_COLLECTION -> Illusts.type eq IllustModelType.COLLECTION
                        IllustQueryType.ONLY_IMAGE -> Illusts.type eq IllustModelType.IMAGE
                    }
                    if(filter.gte != null) it += Illusts.partitionTime greaterEq filter.gte
                    if(filter.lt != null) it += Illusts.partitionTime less filter.lt
                    if(schema != null && schema.whereConditions.isNotEmpty()) {
                        it.addAll(schema.whereConditions)
                    }
                }
                .groupBy(Illusts.partitionTime)
                .orderBy(Illusts.partitionTime.asc())
                .map { PartitionRes(it[Illusts.partitionTime]!!, it.getInt("count")) }
        }
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