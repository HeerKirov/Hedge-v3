package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.Annotations
import com.heerkirov.hedge.server.dao.Authors
import com.heerkirov.hedge.server.dao.Folders
import com.heerkirov.hedge.server.dao.Topics
import com.heerkirov.hedge.server.dto.form.HistoryPushForm
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.FolderType
import com.heerkirov.hedge.server.enums.MetaType
import com.heerkirov.hedge.server.exceptions.ParamError
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.functions.manager.HistoryRecordManager
import com.heerkirov.hedge.server.model.HistoryRecord
import org.ktorm.dsl.*
import org.ktorm.entity.associate
import org.ktorm.entity.filter
import org.ktorm.entity.sequenceOf

class PickerUtilService(private val appdata: AppDataManager, private val data: DataRepository, private val historyRecordManager: HistoryRecordManager) {
    private val limitCount = 20
    private val channels = listOf("FOLDER", "TOPIC", "AUTHOR", "ANNOTATION:${MetaType.TAG}", "ANNOTATION:${MetaType.TOPIC}", "ANNOTATION:${MetaType.AUTHOR}")

    fun getRecentFolders(): List<FolderSimpleRes> {
        val folderIds = historyRecordManager.getHistory(HistoryRecord.HistoryType.PICKER, "FOLDER", limitCount).map { it.toInt() }
        val result = data.db.from(Folders).select(Folders.id, Folders.title, Folders.parentAddress, Folders.type)
            .where { Folders.id inList folderIds and (Folders.type notEq FolderType.NODE) }
            .associate {
                val id = it[Folders.id]!!
                id to FolderSimpleRes(id, (it[Folders.parentAddress] ?: emptyList()) + it[Folders.title]!!, it[Folders.type]!!)
            }
        return folderIds.mapNotNull(result::get)
    }

    fun getRecentTopics(): List<TopicSimpleRes> {
        val topicIds = historyRecordManager.getHistory(HistoryRecord.HistoryType.PICKER, "TOPIC", limitCount).map { it.toInt() }
        val topicColors = appdata.setting.meta.topicColors
        val result = data.db.from(Topics)
            .select(Topics.id, Topics.name, Topics.type)
            .where { Topics.id inList topicIds }
            .associate {
                val id = it[Topics.id]!!
                val type = it[Topics.type]!!
                val color = topicColors[type]
                id to TopicSimpleRes(id, it[Topics.name]!!, type, false, color)
            }
        return topicIds.mapNotNull(result::get)
    }

    fun getRecentAuthors(): List<AuthorSimpleRes> {
        val authorIds = historyRecordManager.getHistory(HistoryRecord.HistoryType.PICKER, "AUTHOR", limitCount).map { it.toInt() }
        val authorColors = appdata.setting.meta.authorColors
        val result = data.db.from(Authors)
            .select(Authors.id, Authors.name, Authors.type)
            .where { Authors.id inList authorIds }
            .associate {
                val id = it[Authors.id]!!
                val type = it[Authors.type]!!
                val color = authorColors[type]
                id to AuthorSimpleRes(id, it[Authors.name]!!, type, false, color)
            }
        return authorIds.mapNotNull(result::get)
    }

    fun getRecentAnnotations(annotationType: MetaType): List<AnnotationRes> {
        val annotationIds = historyRecordManager.getHistory(HistoryRecord.HistoryType.PICKER, "ANNOTATION:$annotationType", limitCount).map { it.toInt() }
        val result = data.db.sequenceOf(Annotations).filter { it.id inList annotationIds }.associate { it.id to newAnnotationRes(it) }
        return annotationIds.mapNotNull(result::get)
    }

    fun pushUsedHistory(form: HistoryPushForm) {
        val channel = form.type.uppercase()
        if(channel !in channels) throw be(ParamError("type"))

        data.db.transaction {
            historyRecordManager.push(HistoryRecord.HistoryType.PICKER, channel, form.id.toString())
        }
    }
}