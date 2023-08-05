package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.filter.TrashFilter
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.TagAddressType
import com.heerkirov.hedge.server.exceptions.NotFound
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.functions.manager.TrashManager
import com.heerkirov.hedge.server.utils.DateTime
import com.heerkirov.hedge.server.utils.DateTime.parseDateTime
import com.heerkirov.hedge.server.utils.DateTime.toMillisecond
import com.heerkirov.hedge.server.utils.business.filePathFrom
import com.heerkirov.hedge.server.utils.business.toListResult
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import org.ktorm.dsl.*
import kotlin.math.absoluteValue

class TrashService(private val appdata: AppDataManager, private val data: DataRepository, private val trashManager: TrashManager) {
    private val orderTranslator = OrderTranslator {
        "id" to TrashedImages.imageId
        "orderTime" to TrashedImages.orderTime
        "trashedTime" to TrashedImages.trashedTime
    }

    fun list(filter: TrashFilter): ListResult<TrashedImageRes> {
        val deadline = if(appdata.setting.storage.autoCleanTrashes) DateTime.now().minusDays(appdata.setting.storage.autoCleanTrashesIntervalDay.absoluteValue.toLong()).toMillisecond() else null

        return data.db.from(TrashedImages)
            .innerJoin(FileRecords, FileRecords.id eq TrashedImages.fileId)
            .select(
                TrashedImages.imageId, TrashedImages.parentId,
                TrashedImages.sourceSite, TrashedImages.sourceId, TrashedImages.sourcePart,
                TrashedImages.score, TrashedImages.favorite, TrashedImages.tagme,
                TrashedImages.trashedTime, TrashedImages.orderTime,
                FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .orderBy(orderTranslator, filter.order)
            .limit(filter.offset, filter.limit)
            .toListResult {
                val filePath = filePathFrom(it)
                val trashedTime = it[TrashedImages.trashedTime]!!
                val remainingTime = if(deadline != null) trashedTime.toMillisecond() - deadline else null
                TrashedImageRes(
                    it[TrashedImages.imageId]!!, filePath,
                    it[TrashedImages.score], it[TrashedImages.favorite]!!, it[TrashedImages.tagme]!!,
                    it[TrashedImages.sourceSite], it[TrashedImages.sourceId], it[TrashedImages.sourcePart],
                    it[TrashedImages.orderTime]!!.parseDateTime(), trashedTime, remainingTime)
            }
    }

    fun get(imageId: Int): TrashedImageDetailRes {
        val row = data.db.from(TrashedImages)
            .innerJoin(FileRecords, FileRecords.id eq TrashedImages.fileId)
            .select()
            .where { TrashedImages.imageId eq imageId }
            .firstOrNull() ?: throw be(NotFound())

        val filePath = filePathFrom(row)
        val extension = row[FileRecords.extension]!!
        val size = row[FileRecords.size]!!
        val resolutionWidth = row[FileRecords.resolutionWidth]!!
        val resolutionHeight = row[FileRecords.resolutionHeight]!!
        val videoDuration = row[FileRecords.videoDuration]!!
        val metadata = row[TrashedImages.metadata]!!
        val parentId = row[TrashedImages.parentId]
        val trashedTime = row[TrashedImages.trashedTime]!!
        val deadline = if(appdata.setting.storage.autoCleanTrashes) DateTime.now().minusDays(appdata.setting.storage.autoCleanTrashesIntervalDay.absoluteValue.toLong()).toMillisecond() else null
        val remainingTime = if(deadline != null) trashedTime.toMillisecond() - deadline else null

        val authorColors = appdata.setting.meta.authorColors
        val topicColors = appdata.setting.meta.topicColors

        val topics = if(metadata.topics.isEmpty()) emptyList() else data.db.from(Topics)
            .select(Topics.id, Topics.name, Topics.type)
            .where { Topics.id inList metadata.topics }
            .orderBy(Topics.type.asc(), Topics.id.asc())
            .map {
                val topicType = it[Topics.type]!!
                val color = topicColors[topicType]
                TopicSimpleRes(it[Topics.id]!!, it[Topics.name]!!, topicType, false, color)
            }

        val authors = if(metadata.authors.isEmpty()) emptyList() else data.db.from(Authors)
            .select(Authors.id, Authors.name, Authors.type)
            .where { Authors.id inList metadata.authors }
            .orderBy(Authors.type.asc(), Authors.id.asc())
            .map {
                val authorType = it[Authors.type]!!
                val color = authorColors[authorType]
                AuthorSimpleRes(it[Authors.id]!!, it[Authors.name]!!, authorType, false, color)
            }

        val tags = if(metadata.tags.isEmpty()) emptyList() else data.db.from(Tags)
            .select(Tags.id, Tags.name, Tags.color)
            .where { (Tags.id inList metadata.tags) and (Tags.type eq TagAddressType.TAG) }
            .orderBy(Tags.globalOrdinal.asc())
            .map { TagSimpleRes(it[Tags.id]!!, it[Tags.name]!!, it[Tags.color], false) }

        val parent = if(parentId == null) null else data.db.from(Illusts)
            .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
            .select(Illusts.id, Illusts.cachedChildrenCount, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { Illusts.id eq parentId }
            .firstOrNull()
            ?.let { IllustParent(it[Illusts.id]!!, filePathFrom(it), it[Illusts.cachedChildrenCount]!!) }

        val books = if(metadata.books.isEmpty()) emptyList() else data.db.from(Books)
            .select(Books.id, Books.title)
            .where { Books.id inList metadata.books }
            .map { BookSimpleRes(it[Books.id]!!, it[Books.title]!!) }

        val folders = if(metadata.folders.isEmpty()) emptyList() else data.db.from(Folders)
            .select(Folders.id, Folders.title, Folders.parentAddress, Folders.type)
            .where { Folders.id inList metadata.folders }
            .map { FolderSimpleRes(it[Folders.id]!!, (it[Folders.parentAddress] ?: emptyList()) + it[Folders.title]!!, it[Folders.type]!!) }

        val associates = if(metadata.associates.isEmpty()) emptyList() else data.db.from(Illusts)
            .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
            .select(Illusts.id, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { Illusts.id inList metadata.associates }
            .map { IllustSimpleRes(it[Illusts.id]!!, filePathFrom(it)) }

        return TrashedImageDetailRes(
            row[TrashedImages.imageId]!!, filePath,
            extension, size, resolutionWidth, resolutionHeight, videoDuration,
            topics, authors, tags, parent, books, folders, associates,
            row[TrashedImages.description]!!, row[TrashedImages.score], row[TrashedImages.favorite]!!, row[TrashedImages.tagme]!!,
            row[TrashedImages.sourceSite], row[TrashedImages.sourceId], row[TrashedImages.sourcePart],
            row[TrashedImages.partitionTime]!!, row[TrashedImages.orderTime]!!.parseDateTime(),
            row[TrashedImages.createTime]!!, row[TrashedImages.updateTime]!!, trashedTime, remainingTime
        )
    }

    fun delete(imageIds: List<Int>) {
        data.db.transaction {
            trashManager.deleteTrashedImage(imageIds)
        }
    }

    fun restore(imageIds: List<Int>) {
        data.db.transaction {
            trashManager.restoreTrashedImage(imageIds)
        }
    }
}