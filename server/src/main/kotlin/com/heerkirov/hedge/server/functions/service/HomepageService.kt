package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.backend.HomepageProcessor
import com.heerkirov.hedge.server.components.backend.TaskCounterModule
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.ExportType
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.enums.ImportStatus
import com.heerkirov.hedge.server.exceptions.ParamError
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.functions.manager.StagingPostManager
import com.heerkirov.hedge.server.model.HomepageRecord
import com.heerkirov.hedge.server.utils.DateTime.toPartitionDate
import com.heerkirov.hedge.server.utils.business.filePathFrom
import org.ktorm.dsl.*
import org.ktorm.entity.count
import org.ktorm.entity.sequenceOf
import java.time.Instant

class HomepageService(private val appdata: AppDataManager,
                      private val data: DataRepository,
                      private val stagingPostManager: StagingPostManager,
                      private val taskCounter: TaskCounterModule,
                      private val homepageProcessor: HomepageProcessor) {
    fun getHomepageInfo(page: Int = 0): HomepageRes {
        if(page >= 10) throw be(ParamError("page"))
        val record = homepageProcessor.getHomepageInfo(page)
        return mapToHomepage(record)
    }

    fun getHomepageState(): HomepageStateRes {
        val today = Instant.now().toPartitionDate(appdata.setting.server.timeOffsetHour)
        val importImageCount = data.db.sequenceOf(ImportRecords).count { it.status eq ImportStatus.COMPLETED and it.deleted.not() }
        val importImageErrorCount = data.db.sequenceOf(ImportRecords).count { it.status eq ImportStatus.ERROR and it.deleted.not() }
        val findSimilarCount = data.db.sequenceOf(FindSimilarResults).count()
        val stagingPostCount = stagingPostManager.count()

        return HomepageStateRes(today, importImageCount, importImageErrorCount, findSimilarCount, stagingPostCount)
    }

    fun getBackgroundTasks(): List<BackgroundTaskRes> = taskCounter.counters.filter { it.totalCount > 0 }.map { BackgroundTaskRes(it.type, it.count, it.totalCount) }

    fun cleanCompletedBackgroundTask() = taskCounter.cleanCompleted()

    fun resetHomepageInfo() = homepageProcessor.resetHomepageInfo()

    private fun mapToHomepage(record: HomepageRecord): HomepageRes {
        val illusts = if(record.content.illusts.isEmpty()) emptyList() else {
            data.db.from(Illusts)
                .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
                .select(Illusts.id, Illusts.partitionTime, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
                .where { (Illusts.id inList record.content.illusts) and (Illusts.type notEq IllustModelType.COLLECTION) }
                .map { HomepageRes.Illust(it[Illusts.id]!!, filePathFrom(it), it[Illusts.partitionTime]!!) }
                .associateBy { it.id }
                .let { record.content.illusts.map(it::get) }
                .filterNotNull()
        }

        val extras = if(record.content.extras.isEmpty()) emptyList() else {
            val result = when(record.content.extraType) {
                "TOPIC" -> data.db.from(Topics)
                    .select(Topics.id, Topics.name, Topics.type)
                    .where { Topics.id inList record.content.extras }
                    .toTopicSimpleList(appdata.setting.meta.topicColors, isExported = ExportType.NO, removeOverrideItem = false)
                    .associateBy { it.id }
                    .mapValues { (id, topic) ->
                        val images = data.db.from(Illusts)
                            .innerJoin(IllustTopicRelations, IllustTopicRelations.illustId eq Illusts.id)
                            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
                            .select(Illusts.id, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
                            .where { (IllustTopicRelations.topicId eq id) and (Illusts.type.eq(IllustModelType.IMAGE) or Illusts.type.eq(IllustModelType.COLLECTION)) }
                            .orderBy(IllustTopicRelations.illustId.desc()) //这里使用ID倒序。如果使用其他(如orderTime)，会导致使用其他索引而大幅降低查询效率
                            .limit(3)
                            .map { IllustSimpleRes(it[Illusts.id]!!, filePathFrom(it)) }
                        HomepageRes.Extra(id, topic.name, topic.type.toString(), topic.color, images, null, null, null, null)
                    }
                "AUTHOR" -> data.db.from(Authors)
                    .select(Authors.id, Authors.name, Authors.type)
                    .where { Authors.id inList record.content.extras }
                    .toAuthorSimpleList(appdata.setting.meta.authorColors, isExported = ExportType.NO)
                    .associateBy { it.id }
                    .mapValues { (id, author) ->
                        val images = data.db.from(Illusts)
                            .innerJoin(IllustAuthorRelations, IllustAuthorRelations.illustId eq Illusts.id)
                            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
                            .select(Illusts.id, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
                            .where { (IllustAuthorRelations.authorId eq id) and (Illusts.type.eq(IllustModelType.IMAGE) or Illusts.type.eq(IllustModelType.COLLECTION)) }
                            .orderBy(IllustAuthorRelations.illustId.desc())
                            .limit(3)
                            .map { IllustSimpleRes(it[Illusts.id]!!, filePathFrom(it)) }
                        HomepageRes.Extra(id, author.name, author.type.toString(), author.color, images, null, null, null, null)
                    }
                "BOOK" -> data.db.from(Books)
                    .leftJoin(FileRecords, Books.fileId eq FileRecords.id and FileRecords.deleted.not())
                    .select(Books.id, Books.title, Books.favorite, Books.cachedCount, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
                    .where { Books.id inList record.content.extras }
                    .map { HomepageRes.Extra(it[Books.id]!!, null, null, null, null, it[Books.title]!!, it[Books.favorite]!!, it[Books.cachedCount]!!, if(it[FileRecords.id] != null) filePathFrom(it) else null) }
                    .associateBy { it.id }
                else -> throw RuntimeException("Unsupported extra type ${record.content.extraType}.")
            }
            record.content.extras.mapNotNull(result::get)
        }

        return HomepageRes(record.date, record.page, illusts, record.content.extraType, extras)
    }
}