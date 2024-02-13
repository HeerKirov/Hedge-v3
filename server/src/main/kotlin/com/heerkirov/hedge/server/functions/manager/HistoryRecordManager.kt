package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.HistoryRecords
import com.heerkirov.hedge.server.model.HistoryRecord
import org.ktorm.dsl.*
import org.ktorm.entity.sequenceOf
import org.ktorm.entity.sortedBy
import org.ktorm.entity.toList
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import kotlin.collections.LinkedHashSet

class HistoryRecordManager(private val data: DataRepository) {
    private val maxStorageCount = 100
    private val records = ConcurrentHashMap<Identity, LinkedHashSet<String>>()
    @Volatile private var loaded: Boolean = false

    private fun checkAndLoadRecordFromDB() {
        if(!loaded) {
            synchronized(this) {
                if(!loaded) {
                    val dbResult = data.db.sequenceOf(HistoryRecords).sortedBy { it.recordTime } .toList()
                    if(dbResult.isNotEmpty()) {
                        //将db记录全部加入history
                        for(record in dbResult) {
                            records.computeIfAbsent(Identity(record.type, record.channel)) { LinkedHashSet() }.add(record.key)
                        }
                    }

                    loaded = true
                }
            }
        }
    }

    fun getHistory(type: HistoryRecord.HistoryType, channel: String, limit: Int? = null): List<String> {
        checkAndLoadRecordFromDB()

        val list = records[Identity(type, channel)] ?: return emptyList()

        return if(limit != null && list.size > limit) list.reversed().subList(0, limit) else list.reversed()
    }

    fun push(type: HistoryRecord.HistoryType, channel: String, key: String) {
        checkAndLoadRecordFromDB()

        val history = records.computeIfAbsent(Identity(type, channel)) { LinkedHashSet() }
        synchronized(history) {
            when (history.indexOf(key)) {
                -1 -> {
                    history.add(key)

                    data.db.insert(HistoryRecords) {
                        set(it.type, type)
                        set(it.channel, channel)
                        set(it.key, key)
                        set(it.recordTime, Instant.now().toEpochMilli())
                    }
                }
                history.size - 1 -> {
                    data.db.update(HistoryRecords) {
                        where { (it.type eq type) and (it.channel eq channel) and (it.key eq key) }
                        set(it.recordTime, Instant.now().toEpochMilli())
                    }
                }
                else -> {
                    history.remove(key)
                    history.add(key)

                    data.db.update(HistoryRecords) {
                        where { (it.type eq type) and (it.channel eq channel) and (it.key eq key) }
                        set(it.recordTime, Instant.now().toEpochMilli())
                    }
                }
            }

            if(history.size > maxStorageCount) {
                val removedKey = history.toList().subList(0, history.size - maxStorageCount)
                history.removeAll(removedKey.toSet())
                data.db.delete(HistoryRecords) { (it.type eq type) and (it.channel eq channel) and (it.key inList removedKey) }
            }
        }
    }

    fun clear(type: HistoryRecord.HistoryType? = null, channel: String? = null) {
        synchronized(this) {
            if(type == null) {
                records.clear()
                data.db.deleteAll(HistoryRecords)
            }else if(channel == null) {
                records.keys.filter { it.type == type }.forEach { records.remove(it) }
                data.db.delete(HistoryRecords) { it.type eq type }
            }else{
                records.keys.filter { it.type == type && it.channel == channel }.forEach { records.remove(it) }
                data.db.delete(HistoryRecords) { (it.type eq type) and (it.channel eq channel) }
            }
        }
    }

    data class Identity(val type: HistoryRecord.HistoryType, val channel: String)
}