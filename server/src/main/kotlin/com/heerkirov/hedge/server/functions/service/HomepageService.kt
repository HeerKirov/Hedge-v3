package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.backend.BackgroundTaskBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.enums.ImportStatus
import com.heerkirov.hedge.server.functions.manager.StagingPostManager
import com.heerkirov.hedge.server.model.HomepageRecord
import com.heerkirov.hedge.server.utils.DateTime.toPartitionDate
import com.heerkirov.hedge.server.utils.business.filePathFrom
import org.ktorm.dsl.*
import org.ktorm.entity.count
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import java.time.Instant
import java.time.LocalDate

class HomepageService(private val appdata: AppDataManager, private val data: DataRepository, private val stagingPostManager: StagingPostManager, private val backgroundTaskBus: BackgroundTaskBus) {
    fun getHomepageInfo(): HomepageRes {
        val currentRecord = data.db.sequenceOf(HomepageRecords).firstOrNull()

        val todayDate = Instant.now().toPartitionDate(appdata.setting.server.timeOffsetHour)

        return if(currentRecord != null && currentRecord.date == todayDate) {
            mapToHomepageRes(currentRecord)
        }else{
            HomepageRes(false, LocalDate.now(), emptyList(), emptyList(), emptyList(), emptyList(), emptyList())
        }
    }

    fun getHomepageState(): HomepageStateRes {
        val today = Instant.now().toPartitionDate(appdata.setting.server.timeOffsetHour)
        val importImageCount = data.db.sequenceOf(ImportRecords).count { it.status eq ImportStatus.COMPLETED and it.deleted.not() }
        val importImageErrorCount = data.db.sequenceOf(ImportRecords).count { it.status eq ImportStatus.ERROR and it.deleted.not() }
        val findSimilarCount = data.db.sequenceOf(FindSimilarResults).count()
        val stagingPostCount = stagingPostManager.count()

        return HomepageStateRes(today, importImageCount, importImageErrorCount, findSimilarCount, stagingPostCount)
    }

    fun getBackgroundTasks(): List<BackgroundTaskRes> = backgroundTaskBus.counters.filter { it.totalCount > 0 }.map { BackgroundTaskRes(it.type, it.count, it.totalCount) }

    private fun mapToHomepageRes(record: HomepageRecord): HomepageRes {
        val todayImages = if(record.content.todayImageIds.isEmpty()) emptyList() else {
            data.db.from(Illusts)
                .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
                .select(Illusts.id, Illusts.partitionTime, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
                .where { (Illusts.id inList record.content.todayImageIds) and (Illusts.type notEq IllustModelType.COLLECTION) }
                .map { HomepageRes.Illust(it[Illusts.id]!!, filePathFrom(it), it[Illusts.partitionTime]!!) }
                .associateBy { it.id }
                .let { record.content.todayImageIds.map(it::get) }
                .filterNotNull()
        }

        val books = if(record.content.todayBookIds.isEmpty()) emptyList() else {
            data.db.from(Books)
                .leftJoin(FileRecords, Books.fileId eq FileRecords.id and FileRecords.deleted.not())
                .select(Books.id, Books.title, Books.favorite, Books.cachedCount, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
                .where { Books.id inList record.content.todayBookIds }
                .map { HomepageRes.Book(it[Books.id]!!, it[Books.title]!!, it[Books.favorite]!!, it[Books.cachedCount]!!, if(it[FileRecords.id] != null) filePathFrom(it) else null) }
                .associateBy { it.id }
                .let { record.content.todayBookIds.mapNotNull(it::get) }
        }

        val authorAndTopics = if(record.content.todayAuthorAndTopicIds.isEmpty()) emptyList() else {
            val topics = record.content.todayAuthorAndTopicIds.filter { it.type == "TOPIC" }.map { it.id }.run {
                if(isEmpty()) emptyMap() else {
                    data.db.from(Topics)
                        .select(Topics.id, Topics.name, Topics.type)
                        .where { Topics.id inList this }
                        .map {
                            val topicType = it[Topics.type]!!
                            val color = appdata.setting.meta.topicColors[topicType]
                            TopicSimpleRes(it[Topics.id]!!, it[Topics.name]!!, topicType, false, color)
                        }
                        .associateBy { it.id }
                }
            }
            val authors = record.content.todayAuthorAndTopicIds.filter { it.type == "AUTHOR" }.map { it.id }.run {
                if(isEmpty()) emptyMap() else {
                    data.db.from(Authors)
                        .select(Authors.id, Authors.name, Authors.type)
                        .where { Authors.id inList this }
                        .map {
                            val authorType = it[Authors.type]!!
                            val color = appdata.setting.meta.authorColors[authorType]
                            AuthorSimpleRes(it[Authors.id]!!, it[Authors.name]!!, authorType, false, color)
                        }
                        .associateBy { it.id }
                }
            }
            record.content.todayAuthorAndTopicIds.mapNotNull { aot ->
                if(aot.type == "AUTHOR") {
                    authors[aot.id]?.run {
                        val images = data.db.from(Illusts)
                            .innerJoin(IllustAuthorRelations, IllustAuthorRelations.illustId eq Illusts.id)
                            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
                            .select(Illusts.id, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
                            .where { (IllustAuthorRelations.authorId eq id) and (Illusts.type notEq IllustModelType.IMAGE_WITH_PARENT) }
                            .orderBy(Illusts.orderTime.desc())
                            .limit(3)
                            .map { IllustSimpleRes(it[Illusts.id]!!, filePathFrom(it)) }

                        HomepageRes.AuthorOrTopic("AUTHOR", type.toString(), id, name, color, images)
                    }
                }else{
                    topics[aot.id]?.run {
                        val images = data.db.from(Illusts)
                            .innerJoin(IllustTopicRelations, IllustTopicRelations.illustId eq Illusts.id)
                            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
                            .select(Illusts.id, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
                            .where { (IllustTopicRelations.topicId eq id) and (Illusts.type notEq IllustModelType.IMAGE_WITH_PARENT) }
                            .orderBy(Illusts.orderTime.desc())
                            .limit(3)
                            .map { IllustSimpleRes(it[Illusts.id]!!, filePathFrom(it)) }

                        HomepageRes.AuthorOrTopic("TOPIC", type.toString(), id, name, color, images)
                    }
                }
            }
        }
        val historyImages = if(record.content.historyImages.isEmpty()) emptyList() else {
            val allIds = record.content.historyImages.flatMap { it.imageIds }.distinct()

            val allImages = data.db.from(Illusts)
                .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
                .select(Illusts.id, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
                .where { (Illusts.id inList allIds) and (Illusts.type notEq IllustModelType.IMAGE_WITH_PARENT) }
                .map { IllustSimpleRes(it[Illusts.id]!!, filePathFrom(it)) }
                .associateBy { it.id }

            record.content.historyImages
                .map { HomepageRes.HistoryImage(it.date, it.imageIds.mapNotNull(allImages::get)) }
                .filter { it.images.isNotEmpty() }
        }

        val recentImages = data.db.from(Illusts)
            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
            .select(Illusts.id, Illusts.partitionTime, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { Illusts.type notEq IllustModelType.IMAGE_WITH_PARENT }
            .orderBy(Illusts.createTime.desc())
            .limit(20)
            .map { HomepageRes.Illust(it[Illusts.id]!!, filePathFrom(it), it[Illusts.partitionTime]!!) }

        return HomepageRes(true, record.date, todayImages, books, authorAndTopics, recentImages, historyImages)
    }

}