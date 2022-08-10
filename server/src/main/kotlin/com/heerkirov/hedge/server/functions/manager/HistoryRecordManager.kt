package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.HistoryRecords
import com.heerkirov.hedge.server.model.HistoryRecord
import com.heerkirov.hedge.server.utils.structs.CountSet
import org.ktorm.dsl.*
import org.ktorm.entity.sequenceOf
import org.ktorm.entity.toList
import java.util.*

class HistoryRecordManager(private val data: DataRepository) {
    private val maxStorageCount = 100
    private val history: EnumMap<HistoryRecord.SystemHistoryRecordType, MutableList<HistoryRecord>> = EnumMap(HistoryRecord.SystemHistoryRecordType::class.java)
    private val frequent: EnumMap<HistoryRecord.SystemHistoryRecordType, CountSet<String>> = EnumMap(HistoryRecord.SystemHistoryRecordType::class.java)
    private val sequenceIds: EnumMap<HistoryRecord.SystemHistoryRecordType, Long> = EnumMap(HistoryRecord.SystemHistoryRecordType::class.java)
    private var loaded: Boolean = false

    fun getRecent(type: HistoryRecord.SystemHistoryRecordType, limit: Int? = null): List<String> {
        checkAndLoadRecordFromDB()
        val list = history[type] ?: return emptyList()
        return list.asReversed().distinctBy { it.key }
            .let { if(limit != null && it.size > limit) it.subList(0, limit) else it }
            .map { it.key }
    }

    fun getFrequent(type: HistoryRecord.SystemHistoryRecordType, limit: Int? = null): List<Pair<String, Int>> {
        checkAndLoadRecordFromDB()
        val set = frequent[type] ?: return emptyList()
        return set.theMost(limit ?: set.size)
    }

    @Synchronized
    fun push(type: HistoryRecord.SystemHistoryRecordType, key: String) {
        checkAndLoadRecordFromDB()

        val sequenceId = sequenceIds.getOrDefault(type, 0) + 1

        val model = HistoryRecord(sequenceId, type, key, System.currentTimeMillis())

        data.db.insert(HistoryRecords) {
            set(it.sequenceId, model.sequenceId)
            set(it.type, model.type)
            set(it.key, model.key)
            set(it.recordTime, model.recordTime)
        }

        val frequent = frequent.computeIfAbsent(type) { CountSet() }
        val history = history.computeIfAbsent(type) { mutableListOf() }
        frequent.add(model.key)
        history.add(model)
        sequenceIds[type] = sequenceId

        if(history.size > maxStorageCount) {
            val removedModel = history.removeAt(0)
            frequent.remove(removedModel.key)

            data.db.delete(HistoryRecords) {
                (it.sequenceId eq removedModel.sequenceId) and (it.type eq type)
            }
        }
    }

    @Synchronized
    fun clear(type: HistoryRecord.SystemHistoryRecordType? = null) {
        if(type == null) {
            history.clear()
            frequent.clear()
            sequenceIds.clear()
            data.db.deleteAll(HistoryRecords)
        }else{
            if(type in history) history.remove(type)
            if(type in frequent) frequent.remove(type)
            if(type in sequenceIds) sequenceIds.remove(type)
            data.db.delete(HistoryRecords) { it.type eq type }
        }
    }

    @Synchronized
    private fun checkAndLoadRecordFromDB() {
        if(!loaded) {
            val dbResult = data.db.sequenceOf(HistoryRecords).toList()
            if(dbResult.isNotEmpty()) {
                //将db记录全部加入history
                for(record in dbResult) {
                    history.computeIfAbsent(record.type) { mutableListOf() }.add(record)
                }
                //将db记录全部加入frequent统计
                for ((t, l) in history) {
                    val eachCount = l.groupingBy { it.key }.eachCount()
                    for ((id, count) in eachCount) {
                        frequent.computeIfAbsent(t) { CountSet() }.add(id, count)
                    }
                }
                //从db记录统计max sequenceId
                sequenceIds.putAll(history.mapValues { (_, l) -> l.maxOfOrNull { it.sequenceId } ?: 0 })
            }

            loaded = true
        }
    }
}