package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.Partitions
import org.ktorm.dsl.*
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import java.time.LocalDate

class PartitionManager(private val data: DataRepository) {
    /**
     * 在这个时间分区下添加了一个或数个新项目。
     */
    fun addItemInPartition(date: LocalDate, count: Int = 1) {
        val partition = data.db.sequenceOf(Partitions).firstOrNull { it.date eq date }
        if(partition == null) {
            data.db.insert(Partitions) {
                set(it.date, date)
                set(it.cachedCount, count)
            }
        }else{
            data.db.update(Partitions) {
                where { it.date eq date }
                set(it.cachedCount, it.cachedCount plus count)
            }
        }
    }

    /**
     * 将一个项目从一个时间分区移动到了另一个时间分区。
     */
    fun updateItemPartition(fromDate: LocalDate, toDate: LocalDate) {
        if(fromDate != toDate) {
            deleteItemInPartition(fromDate)
            addItemInPartition(toDate)
        }
    }

    /**
     * 将一个项目从一个时间分区移除。计数归零的时间分区不会删除，但是应当在列表查询中过滤掉计数为0的分区。
     */
    fun deleteItemInPartition(date: LocalDate) {
        data.db.update(Partitions) {
            where { it.date eq date }
            set(it.cachedCount, it.cachedCount minus 1)
        }
    }
}