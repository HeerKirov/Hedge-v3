package com.heerkirov.hedge.server.components.backend

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.components.status.AppStatusDriver
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.enums.AppLoadStatus
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.events.HomepageInfoUpdated
import com.heerkirov.hedge.server.functions.manager.TrashManager
import com.heerkirov.hedge.server.library.framework.DaemonThreadComponent
import com.heerkirov.hedge.server.model.HomepageRecord
import com.heerkirov.hedge.server.utils.DateTime.toSystemZonedTime
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import com.heerkirov.hedge.server.utils.runIf
import org.ktorm.dsl.*
import org.ktorm.schema.ColumnDeclaring
import org.ktorm.support.sqlite.random
import org.slf4j.LoggerFactory
import java.time.Instant
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.absoluteValue
import kotlin.random.Random
import kotlin.random.nextInt

/**
 * 处理一些每日启动时要处理一次的事务。
 * - 启动时，重新生成主页内容。
 * - 已删除文件的自动清理。根据自动清理间隔，与当前时间间隔超出此日数的项会被清除。
 */
interface DailyProcessor

class DailyProcessorImpl(private val appStatusDriver: AppStatusDriver,
                         private val appdata: AppDataManager,
                         private val data: DataRepository,
                         private val bus: EventBus,
                         private val trashManager: TrashManager) : DailyProcessor, DaemonThreadComponent {
    private val log = LoggerFactory.getLogger(DailyProcessor::class.java)

    override fun thread() {
        if(appStatusDriver.status == AppLoadStatus.READY) {
            refreshHomepage()
            cleanTrashedImages()
        }
    }

    private fun cleanTrashedImages() {
        if(appdata.setting.storage.autoCleanTrashes) {
            val intervalDay = appdata.setting.storage.autoCleanTrashesIntervalDay
            Thread.sleep(5000)

            val now = Instant.now()
            val deadline = now.minus(intervalDay.absoluteValue.toLong(), ChronoUnit.DAYS)
            val imageIds = data.db.from(TrashedImages)
                .select(TrashedImages.imageId)
                .where { TrashedImages.trashedTime lessEq deadline }
                .map { it[TrashedImages.imageId]!! }

            trashManager.deleteTrashedImage(imageIds)

            if(imageIds.isNotEmpty()) {
                log.info("${imageIds.size} trashed images have been cleared.")
            }
        }
    }

    private fun refreshHomepage() {
        val todayDate = Instant.now()
            .runIf(appdata.setting.server.timeOffsetHour != null && appdata.setting.server.timeOffsetHour!!!= 0) {
                this.minus(appdata.setting.server.timeOffsetHour!!.toLong(), ChronoUnit.HOURS)
            }
            .toSystemZonedTime().toLocalDate()

        val exist = data.db.from(HomepageRecords)
            .select((count(HomepageRecords.date) greater 0).aliased("exist"))
            .where { HomepageRecords.date greaterEq todayDate }
            .firstOrNull()?.getBoolean("exist") ?: false
        if(!exist) {
            data.db.transaction {
                val content = generateHomepageInfo()

                data.db.insert(HomepageRecords) {
                    set(it.date, todayDate)
                    set(it.content, content)
                }

                data.db.delete(HomepageRecords) { it.date less todayDate }

                bus.emit(HomepageInfoUpdated)
            }
        }
    }

    private fun generateHomepageInfo(): HomepageRecord.Content {
        val todayImageIds = run {
            //共取28项image。
            //随机取3个partition，每个partition随机取8项，然后在这之外随机取4项；
            //其次，选取条件是NOT book member, score>=3。如果最后还空缺，则放开条件把空缺补满。
            val total = 28
            val partitions = queryPartition(3, random = true)
            val partitionImages = partitions.flatMap { partition -> queryImage(8, onlyImage = true) { (it.partitionTime eq partition) and (it.cachedBookCount eq 0) and (it.score greaterEq 3) } }
            val lacks = queryImage(total - partitionImages.size, onlyImage = true) { it.partitionTime notInList partitions }
            partitionImages + lacks
        }

        val todayBookIds = run {
            //共取12项book。
            //[0, 4]：fav
            //[0, 4]：!fav && score!=NULL && score>=4
            //[0, 4]：!fav && score!=NULL && score>=3 && score<4
            //剩余：!fav && (score=NULL || score<3)
            val total = 12
            val typeA = queryBook(Random.nextInt(0..4)) { it.favorite }
            val typeB = queryBook(Random.nextInt(0..4)) { it.favorite.not() and it.score.isNotNull() and (it.score greaterEq 4) }
            val typeC = queryBook(Random.nextInt(0..4)) { it.favorite.not() and it.score.isNotNull() and (it.score greaterEq 3) and (it.score less 4) }
            val typeD = queryBook(total - typeA.size - typeB.size - typeC.size) { it.favorite.not() and (it.score less 3 or it.score.isNull()) }
            (typeA + typeB + typeC).shuffled() + typeD
        }

        val todayAuthorAndTopicIds = run {
            //共选取9项。首先随机分配总数，topic分配[0, 4]项，剩余的分配给author。
            //[N/4, N/2]：fav
            //[N/4, N/2]: !fav && score!=NULL && score>=3
            //剩余：!fav && (score=NULL || score<3)
            val totalTopic = Random.nextInt(0..4)
            val topicA = queryTopic(Random.nextInt((totalTopic / 4)..(totalTopic / 2))) { it.favorite }
            val topicB = queryTopic(Random.nextInt((totalTopic / 4)..(totalTopic / 2))) { it.favorite.not() and it.score.isNotNull() and (it.score greaterEq 3) }
            val topicC = queryTopic(totalTopic - topicA.size - topicB.size) { it.favorite.not() and (it.score less 3 or it.score.isNull()) }
            val topics = (topicA + topicB + topicC).map { HomepageRecord.AuthorOrTopic("TOPIC", it) }

            val totalAuthor = 9 - topics.size
            val authorA = queryAuthor(Random.nextInt((totalAuthor / 4)..(totalAuthor / 2))) { it.favorite }
            val authorB = queryAuthor(Random.nextInt((totalAuthor / 4)..(totalAuthor / 2))) { it.favorite.not() and it.score.isNotNull() and (it.score greaterEq 3) }
            val authorC = queryAuthor(totalAuthor - authorA.size - authorA.size) { it.favorite.not() and (it.score less 3 or it.score.isNull()) }
            val authors = (authorA + authorB + authorC).map { HomepageRecord.AuthorOrTopic("AUTHOR", it) }

            //shuffle时，确保一部分author总在最前。
            if(authors.size >= 3) {
                authors.subList(0, 3).shuffled() + (authors.subList(3, authors.size) + topics).shuffled()
            }else{
                authors.shuffled() + topics.shuffled()
            }
        }

        val historyImages = run {
            //选取最近的8个日期，每个日期取18项image。
            //[3, 6]：fav
            //[2, 6]: !fav && score!=NULL && score>=4
            //[1, 6]：!fav && score!=NULL && score>=3 && score<4
            //剩余：!fav && (score=NULL || score<3)
            queryPartition(8).map { date ->
                val total = 18
                val typeA = queryImage(Random.nextInt(3..6)) { (it.partitionTime eq date) and it.favorite }
                val typeB = queryImage(Random.nextInt(2..6)) { (it.partitionTime eq date) and it.favorite.not() and it.score.isNotNull() and (it.score greaterEq 4) }
                val typeC = queryImage(Random.nextInt(1..6)) { (it.partitionTime eq date) and it.favorite.not() and it.score.isNotNull() and (it.score greaterEq 3) and (it.score less 4) }
                val typeD = queryImage(total - typeA.size - typeB.size - typeC.size) { (it.partitionTime eq date) and it.favorite.not() and (it.score less 3 or it.score.isNull()) }
                HomepageRecord.HistoryImage(date, (typeA + typeB + typeC).shuffled() + typeD)
            }
        }

        return HomepageRecord.Content(todayImageIds, todayBookIds, todayAuthorAndTopicIds, historyImages)
    }

    private inline fun queryImage(limit: Int, onlyImage: Boolean = false, condition: (Illusts) -> ColumnDeclaring<Boolean>): List<Int> {
        return if(limit <= 0) emptyList() else data.db.from(Illusts)
            .select(Illusts.id)
            .where { (Illusts.type notEq if(onlyImage) IllustModelType.COLLECTION else IllustModelType.IMAGE_WITH_PARENT) and condition(Illusts) }
            .orderBy(random().asc())
            .limit(limit)
            .map { it[Illusts.id]!! }
    }

    private inline fun queryBook(limit: Int, condition: (Books) -> ColumnDeclaring<Boolean>): List<Int> {
        return if(limit <= 0) emptyList() else data.db.from(Books)
            .select(Books.id)
            .where { (Books.cachedCount greater 0) and condition(Books) }
            .orderBy(random().asc())
            .limit(limit)
            .map { it[Books.id]!! }
    }

    private fun queryPartition(limit: Int, random: Boolean = false): List<LocalDate> {
        return if(limit <= 0) emptyList() else data.db.from(Partitions)
            .select(Partitions.date)
            .where { Partitions.cachedCount greater 0 }
            .orderBy(if(random) random().asc() else Partitions.date.desc())
            .limit(limit)
            .map { it[Partitions.date]!! }
    }

    private inline fun queryAuthor(limit: Int, condition: (Authors) -> ColumnDeclaring<Boolean>): List<Int> {
        return if(limit <= 0) emptyList() else data.db.from(Authors)
            .select(Authors.id)
            .where { (Authors.cachedCount greater 0) and condition(Authors) }
            .orderBy(random().asc())
            .limit(limit)
            .map { it[Authors.id]!! }
    }

    private inline fun queryTopic(limit: Int, condition: (Topics) -> ColumnDeclaring<Boolean>): List<Int> {
        return if(limit <= 0) emptyList() else data.db.from(Topics)
            .select(Topics.id)
            .where { (Topics.cachedCount greater 0) and condition(Topics) }
            .orderBy(random().asc())
            .limit(limit)
            .map { it[Topics.id]!! }
    }
}