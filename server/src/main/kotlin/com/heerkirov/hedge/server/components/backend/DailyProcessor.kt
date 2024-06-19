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
import com.heerkirov.hedge.server.library.framework.DaemonThreadComponent
import com.heerkirov.hedge.server.model.HomepageRecord
import com.heerkirov.hedge.server.utils.DateTime.toPartitionDate
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import org.ktorm.dsl.*
import org.ktorm.schema.ColumnDeclaring
import org.ktorm.support.sqlite.random
import java.time.Instant
import java.time.LocalDate
import kotlin.random.Random
import kotlin.random.nextInt

/**
 * 处理一些每日启动时要处理一次的事务。
 * - 启动时，重新生成主页内容。
 */
interface DailyProcessor

class DailyProcessorImpl(private val appStatusDriver: AppStatusDriver,
                         private val appdata: AppDataManager,
                         private val data: DataRepository,
                         private val bus: EventBus) : DailyProcessor, DaemonThreadComponent {

    override fun thread() {
        if(appStatusDriver.status == AppLoadStatus.READY) {
            refreshHomepage()
        }
    }

    private fun refreshHomepage() {
        val todayDate = Instant.now().toPartitionDate(appdata.setting.server.timeOffsetHour)

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
            //选取条件是NOT book member, score>=3。如果最后还空缺，则放开条件把空缺补上。
            val total = 28
            val partitions = queryPartition(3, random = true) { (it.score greaterEq 3) and (it.cachedBookCount eq 0) }
            val partitionImages = partitions.flatMap { partition -> queryImage(8, onlyImage = true) { (it.partitionTime eq partition) and (it.cachedBookCount eq 0) and (it.score greaterEq 3) } }
            val lacks = queryImage(total - partitionImages.size, onlyImage = true) { it.partitionTime notInList partitions }
            partitionImages + lacks
        }

        val todayBookIds = run {
            //共取12项book。
            //选取条件是score>=3 or fav，如果空缺就放开条件把空缺补上。
            val total = 12
            val books = queryBook(total) { it.favorite or (it.score greaterEq 3) }
            val lacks = queryBook(total - books.size) { it.favorite.not() and (it.score.isNull() or (it.score less 3)) }
            books + lacks
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
            //选取条件是score>=3。如果最后还空缺，则放开条件把空缺补上。
            queryPartition(8).map { date ->
                val total = 18
                val images = queryImage(total) { it.partitionTime eq date and (it.score greaterEq 3) }
                val lacks = queryImage(total - images.size) { it.partitionTime eq date and (it.score.isNull() or (it.score less 3))}
                HomepageRecord.HistoryImage(date, images + lacks)
            }
        }

        return HomepageRecord.Content(todayImageIds, todayBookIds, todayAuthorAndTopicIds, historyImages)
    }

    private inline fun queryImage(limit: Int, onlyImage: Boolean = false, condition: (Illusts) -> ColumnDeclaring<Boolean>): List<Int> {
        return if(limit <= 0) emptyList() else data.db.from(Illusts)
            .select(Illusts.id)
            .where { if(onlyImage) { (Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.IMAGE_WITH_PARENT) }else{ (Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.COLLECTION) } and condition(Illusts) }
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

    private fun queryPartition(limit: Int, random: Boolean = false, condition: ((Illusts) -> ColumnDeclaring<Boolean>)? = null): List<LocalDate> {
        return if(limit <= 0) emptyList() else data.db.from(Illusts)
            .select(Illusts.partitionTime)
            .where { ((Illusts.type eq IllustModelType.IMAGE) or (Illusts.type eq IllustModelType.COLLECTION)).let { if(condition != null) it and condition(Illusts) else it } }
            .groupBy(Illusts.partitionTime)
            .orderBy(if(random) random().asc() else Illusts.partitionTime.desc())
            .limit(limit)
            .map { it[Illusts.partitionTime]!! }
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