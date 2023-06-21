package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.model.HomepageRecord
import com.heerkirov.hedge.server.utils.DateTime
import com.heerkirov.hedge.server.utils.DateTime.asZonedTime
import com.heerkirov.hedge.server.utils.DateTime.parseDateTime
import com.heerkirov.hedge.server.utils.DateTime.toMillisecond
import com.heerkirov.hedge.server.utils.business.takeThumbnailFilepath
import com.heerkirov.hedge.server.utils.runIf
import org.ktorm.dsl.*
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import org.ktorm.schema.ColumnDeclaring
import org.ktorm.support.sqlite.random
import java.time.LocalDate
import kotlin.random.Random
import kotlin.random.nextInt

class HomepageService(private val data: DataRepository) {
    fun getHomepageInfo(): HomepageRes {
        val todayDate = DateTime.now()
            .runIf(data.setting.import.setPartitionTimeDelay != null && data.setting.import.setPartitionTimeDelay!!!= 0L) {
                (this.toMillisecond() - data.setting.import.setPartitionTimeDelay!!).parseDateTime()
            }
            .asZonedTime().toLocalDate()

        var currentRecord = data.db.sequenceOf(HomepageRecords).firstOrNull()
        if(currentRecord == null || currentRecord.date < todayDate) {
            data.db.transaction {
                currentRecord = data.db.sequenceOf(HomepageRecords).firstOrNull()
                if(currentRecord == null || currentRecord!!.date < todayDate) {
                    data.db.deleteAll(HomepageRecords)

                    val content = generateHomepageInfo()

                    data.db.insert(HomepageRecords) {
                        set(it.date, todayDate)
                        set(it.content, content)
                    }

                    currentRecord = HomepageRecord(todayDate, content)
                }
            }
        }

        return mapToHomepageRes(currentRecord!!)
    }

    private fun mapToHomepageRes(record: HomepageRecord): HomepageRes {
        val todayImages = if(record.content.todayImageIds.isEmpty()) emptyList() else {
            data.db.from(Illusts)
                .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
                .select(Illusts.id, Illusts.partitionTime, FileRecords.id, FileRecords.folder, FileRecords.extension, FileRecords.status)
                .where { (Illusts.id inList record.content.todayImageIds) and (Illusts.type notEq IllustModelType.COLLECTION) }
                .map { HomepageRes.Illust(it[Illusts.id]!!, takeThumbnailFilepath(it), it[Illusts.partitionTime]!!) }
                .associateBy { it.id }
                .let { record.content.todayImageIds.mapNotNull(it::get) }
        }

        val books = if(record.content.todayBookIds.isEmpty()) emptyList() else {
            data.db.from(Books)
                .leftJoin(FileRecords, Books.fileId eq FileRecords.id)
                .select(Books.id, Books.title, Books.cachedCount, FileRecords.id, FileRecords.folder, FileRecords.extension, FileRecords.status)
                .where { Books.id inList record.content.todayBookIds }
                .map { HomepageRes.Book(it[Books.id]!!, it[Books.title]!!, it[Books.cachedCount]!!, if(it[FileRecords.id] != null) takeThumbnailFilepath(it) else null) }
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
                            val color = data.setting.meta.topicColors[topicType]
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
                            val color = data.setting.meta.authorColors[authorType]
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
                            .select(Illusts.id, FileRecords.id, FileRecords.folder, FileRecords.extension, FileRecords.status)
                            .where { (IllustAuthorRelations.authorId eq id) and (Illusts.type notEq IllustModelType.COLLECTION) }
                            .orderBy(Illusts.orderTime.desc())
                            .limit(3)
                            .map { IllustSimpleRes(it[Illusts.id]!!, takeThumbnailFilepath(it)) }

                        HomepageRes.AuthorOrTopic("AUTHOR", type.toString(), id, name, color, images)
                    }
                }else{
                    topics[aot.id]?.run {
                        val images = data.db.from(Illusts)
                            .innerJoin(IllustTopicRelations, IllustTopicRelations.illustId eq Illusts.id)
                            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
                            .select(Illusts.id, FileRecords.id, FileRecords.folder, FileRecords.extension, FileRecords.status)
                            .where { (IllustTopicRelations.topicId eq id) and (Illusts.type notEq IllustModelType.COLLECTION) }
                            .orderBy(Illusts.orderTime.desc())
                            .limit(3)
                            .map { IllustSimpleRes(it[Illusts.id]!!, takeThumbnailFilepath(it)) }

                        HomepageRes.AuthorOrTopic("TOPIC", type.toString(), id, name, color, images)
                    }
                }
            }
        }
        val historyImages = if(record.content.historyImages.isEmpty()) emptyList() else {
            val allIds = record.content.historyImages.flatMap { it.imageIds }.distinct()

            val allImages = data.db.from(Illusts)
                .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
                .select(Illusts.id, FileRecords.id, FileRecords.folder, FileRecords.extension, FileRecords.status)
                .where { (Illusts.id inList allIds) and (Illusts.type notEq IllustModelType.COLLECTION) }
                .map { IllustSimpleRes(it[Illusts.id]!!, takeThumbnailFilepath(it)) }
                .associateBy { it.id }

            record.content.historyImages
                .map { HomepageRes.HistoryImage(it.date, it.imageIds.mapNotNull(allImages::get)) }
                .filter { it.images.isNotEmpty() }
        }

        val recentImages = data.db.from(Illusts)
            .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
            .select(Illusts.id, Illusts.partitionTime, FileRecords.id, FileRecords.folder, FileRecords.extension, FileRecords.status)
            .where { Illusts.type notEq IllustModelType.COLLECTION }
            .orderBy(Illusts.createTime.desc())
            .limit(20)
            .map { HomepageRes.Illust(it[Illusts.id]!!, takeThumbnailFilepath(it), it[Illusts.partitionTime]!!) }

        return HomepageRes(record.date, todayImages, books, authorAndTopics, recentImages, historyImages)
    }

    private fun generateHomepageInfo(): HomepageRecord.Content {
        val todayImageIds = run {
            //共取28项image。
            //有额外的选取条件，首先随机取4个partition，只在这4个里选；其次不选book member。除非选到最后还空缺。
            //[4, 8]：fav
            //[2, 8]: !fav && score!=NULL && score>=8
            //[0, 8]：!fav && score!=NULL && score>=6 && score<8
            //剩余：!fav && (score=NULL || score<6)
            val total = 18
            val partitions = queryPartition(4, random = true)
            val typeA = queryImage(Random.nextInt(4..8)) { (it.partitionTime inList partitions) and (it.cachedBookCount greater 0) and it.favorite }
            val typeB = queryImage(Random.nextInt(2..8)) { (it.partitionTime inList partitions) and (it.cachedBookCount greater 0) and it.favorite.not() and it.score.isNotNull() and (it.score greaterEq 8) }
            val typeC = queryImage(Random.nextInt(0..8)) { (it.partitionTime inList partitions) and (it.cachedBookCount greater 0) and it.favorite.not() and it.score.isNotNull() and (it.score greaterEq 6) and (it.score less 8) }
            val typeD = queryImage(total - typeA.size - typeB.size - typeC.size) { it.favorite.not() and (it.score.isNull() or (it.score less 6)) }
            (typeA + typeB + typeC).shuffled() + typeD
        }

        val todayBookIds = run {
            //共取12项book。
            //[0, 4]：fav
            //[0, 4]：!fav && score!=NULL && score>=8
            //[0, 4]：!fav && score!=NULL && score>=6 && score<8
            //剩余：!fav && (score=NULL || score<6)
            val total = 12
            val typeA = queryBook(Random.nextInt(0..4)) { it.favorite }
            val typeB = queryBook(Random.nextInt(0..4)) { it.favorite.not() and it.score.isNotNull() and (it.score greaterEq 8) }
            val typeC = queryBook(Random.nextInt(0..4)) { it.favorite.not() and it.score.isNotNull() and (it.score greaterEq 6) and (it.score less 8) }
            val typeD = queryBook(total - typeA.size - typeB.size - typeC.size) { it.favorite.not() and (it.score less 6 or it.score.isNull()) }
            (typeA + typeB + typeC).shuffled() + typeD
        }

        val todayAuthorAndTopicIds = run {
            //共选取9项。首先随机分配总数，author分配[5, 9]项，剩余的分配给topic。
            //[N/4, N/2]：fav
            //[N/4, N/2]: !fav && score!=NULL && score>=5
            //剩余：!fav && (score=NULL || score<5)
            val totalAuthor = Random.nextInt(5..9)
            val authorA = queryAuthor(Random.nextInt((totalAuthor / 4)..(totalAuthor / 2))) { it.favorite }
            val authorB = queryAuthor(Random.nextInt((totalAuthor / 4)..(totalAuthor / 2))) { it.favorite.not() and it.score.isNotNull() and (it.score greaterEq 5) }
            val authorC = queryAuthor(totalAuthor - authorA.size - authorA.size) { it.favorite.not() and (it.score less 5 or it.score.isNull()) }
            val authors = (authorA + authorB + authorC).map { HomepageRecord.AuthorOrTopic("AUTHOR", it) }

            val totalTopic = 9 - authors.size
            val topicA = queryTopic(Random.nextInt((totalTopic / 4)..(totalTopic / 2))) { it.favorite }
            val topicB = queryTopic(Random.nextInt((totalTopic / 4)..(totalTopic / 2))) { it.favorite.not() and it.score.isNotNull() and (it.score greaterEq 5) }
            val topicC = queryTopic(totalTopic - topicA.size - topicB.size) { it.favorite.not() and (it.score less 5 or it.score.isNull()) }
            val topics = (topicA + topicB + topicC).map { HomepageRecord.AuthorOrTopic("TOPIC", it) }

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
            //[2, 6]: !fav && score!=NULL && score>=7
            //[1, 6]：!fav && score!=NULL && score>=5 && score<7
            //剩余：!fav && (score=NULL || score<6)
            queryPartition(8).map {  date ->
                val total = 18
                val typeA = queryImage(Random.nextInt(3..6)) { (it.partitionTime eq date) and it.favorite }
                val typeB = queryImage(Random.nextInt(2..6)) { (it.partitionTime eq date) and it.favorite.not() and it.score.isNotNull() and (it.score greaterEq 7) }
                val typeC = queryImage(Random.nextInt(1..6)) { (it.partitionTime eq date) and it.favorite.not() and it.score.isNotNull() and (it.score greaterEq 5) and (it.score less 7) }
                val typeD = queryImage(total - typeA.size - typeB.size - typeC.size) { (it.partitionTime eq date) and it.favorite.not() and (it.score less 6 or it.score.isNull()) }
                HomepageRecord.HistoryImage(date, (typeA + typeB + typeC).shuffled() + typeD)
            }
        }

        return HomepageRecord.Content(todayImageIds, todayBookIds, todayAuthorAndTopicIds, historyImages)
    }

    private inline fun queryImage(limit: Int, condition: (Illusts) -> ColumnDeclaring<Boolean>): List<Int> {
        return if(limit <= 0) emptyList() else data.db.from(Illusts)
            .select(Illusts.id)
            .where { (Illusts.type notEq IllustModelType.COLLECTION) and condition(Illusts) }
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