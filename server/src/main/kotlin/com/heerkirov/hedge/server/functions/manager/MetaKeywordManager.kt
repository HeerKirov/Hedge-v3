package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.Keywords
import com.heerkirov.hedge.server.dto.res.KeywordInfo
import com.heerkirov.hedge.server.enums.MetaType
import org.ktorm.dsl.*
import org.ktorm.entity.*
import java.time.Instant

class MetaKeywordManager(private val data: DataRepository) {
    /**
     * 当对一个meta对象的keyword进行更新时，使用此方法，更新keyword表中的记录。
     * 此方法需要提供该对象新的keyword和旧的keyword内容，以作比对。
     */
    fun updateByKeywords(metaType: MetaType, keywords: List<String>, oldKeywords: List<String>? = null) {
        val added = if(oldKeywords.isNullOrEmpty()) keywords else keywords - oldKeywords.toSet()
        if(added.isNotEmpty()) {
            val now = Instant.now()
            val exists = data.db.sequenceOf(Keywords).filter { (it.tagType eq metaType) and (it.keyword inList added) }.associateBy { it.keyword }
            val toBeInserted = added - exists.keys
            if(toBeInserted.isNotEmpty()) {
                data.db.batchInsert(Keywords) {
                    for (s in toBeInserted) {
                        item {
                            set(it.tagType, metaType)
                            set(it.keyword, s)
                            set(it.tagCount, 1)
                            set(it.lastUsedTime, now)
                        }
                    }
                }
            }
            if(exists.isNotEmpty()) {
                data.db.batchUpdate(Keywords) {
                    for (record in exists.values) {
                        item {
                            where { it.id eq record.id }
                            set(it.tagCount, it.tagCount + 1)
                            set(it.lastUsedTime, now)
                        }
                    }
                }
            }
        }

        val deleted = if(oldKeywords.isNullOrEmpty()) emptyList() else oldKeywords - keywords.toSet()
        if(deleted.isNotEmpty()) {
            val records = data.db.sequenceOf(Keywords).filter { (it.tagType eq metaType) and (it.keyword inList deleted) }.toList()
            if(records.isNotEmpty()) {
                data.db.batchUpdate(Keywords) {
                    for (record in records) {
                        item {
                            where { it.id eq record.id }
                            set(it.tagCount, it.tagCount - 1)
                        }
                    }
                }
            }
        }
    }

    /**
     * 查询指定类型的keywords。
     */
    fun queryKeywords(metaType: MetaType, prefix: String? = null, limit: Int = 10): List<KeywordInfo> {
        return data.db.from(Keywords)
            .select()
            .whereWithConditions {
                it += Keywords.tagType eq metaType
                if(!prefix.isNullOrEmpty()) Keywords.keyword like "$prefix%"
            }
            .orderBy(Keywords.lastUsedTime.desc())
            .limit(limit)
            .map { KeywordInfo(it[Keywords.tagType]!!, it[Keywords.keyword]!!, it[Keywords.tagCount]!!, it[Keywords.lastUsedTime]!!) }
    }
}