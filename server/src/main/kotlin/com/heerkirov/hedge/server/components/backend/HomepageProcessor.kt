package com.heerkirov.hedge.server.components.backend

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.library.framework.Component
import com.heerkirov.hedge.server.model.HomepageRecord
import com.heerkirov.hedge.server.utils.DateTime.toPartitionDate
import org.ktorm.dsl.*
import org.ktorm.entity.filter
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.map
import org.ktorm.entity.sequenceOf
import org.ktorm.schema.ColumnDeclaring
import org.ktorm.support.sqlite.random
import java.time.Instant
import java.time.LocalDate
import java.util.concurrent.ConcurrentHashMap
import kotlin.random.Random

/**
 * 处理一些每日启动时要处理一次的事务。
 * - 启动时，重新生成主页内容。
 */
interface HomepageProcessor {
    /**
     * 获得主页内容记录。
     * @param page 指定页码
     */
    fun getHomepageInfo(page: Int, date: LocalDate? = null): HomepageRecord
}

class HomepageProcessorImpl(private val appdata: AppDataManager, private val data: DataRepository, taskScheduler: TaskSchedulerModule) : HomepageProcessor, Component {
    private val records = ConcurrentHashMap<Int, HomepageRecord>()
    private val cacheAllPartitions = mutableListOf<LocalDate>()

    init {
        taskScheduler.dayStart(::refreshHomepage)
    }

    private fun refreshHomepage() {
        val todayDate = Instant.now().toPartitionDate(appdata.setting.server.timeOffsetHour)

        //清空records并尝试加载今天的所有records。如果不是今天第一次启动，那么就应该会有records
        records.clear()
        records.putAll(data.db.sequenceOf(HomepageRecords).filter { it.date eq todayDate }.map { it.page to it })

        //配置all partitions缓存。查询所有的时间分区并从中剔除records中已经使用过的
        cacheAllPartitions.clear()
        cacheAllPartitions.addAll(selectAllPartition().filterNot { p -> p in records.values.flatMap { it.content.partitions } })

        //无记录时，预创建今天的主页记录
        if(records.isEmpty()) {
            getHomepageInfo(0, todayDate)
            getHomepageInfo(1, todayDate)
        }

        //删除1天之前的所有主页记录
        data.db.delete(HomepageRecords) { it.date less todayDate.minusDays(1) }
    }

    override fun getHomepageInfo(page: Int, date: LocalDate?): HomepageRecord {
        val todayDate = date ?: Instant.now().toPartitionDate(appdata.setting.server.timeOffsetHour)

        return records.computeIfAbsent(page) {
            data.db.transaction {
                data.db.sequenceOf(HomepageRecords).firstOrNull { (it.date eq todayDate) and (it.page eq page) } ?: run {
                    val content = generateHomepageInfo(page)
                    data.db.insert(HomepageRecords) {
                        set(it.date, todayDate)
                        set(it.page, page)
                        set(it.content, content)
                    }
                    HomepageRecord(todayDate, page, content)
                }
            }
        }

    }

    private fun generateHomepageInfo(pageNum: Int): HomepageRecord.Content {
        if(cacheAllPartitions.isEmpty()) return HomepageRecord.Content(emptyList(), emptyList(), emptyList(), "BOOKS")

        val partitions = mutableListOf<LocalDate>().also { partitions ->
            while (partitions.size < 3) {
                //随机选择未使用过的时间分区，直到数量补充充足，或者不再有可用的时间分区
                val p = cacheAllPartitions.randomPopOrNull() ?: break
                partitions.add(p)
            }
        }

        val illusts = mutableListOf<Int>().also { ret ->
            partitions.forEach { ret.addAll(selectRandIllusts(8, it)) }
            while (ret.size < 24) {
                //如果数量不足，就会继续加时间分区，直到数量补充充足，或者不再有可用的时间分区
                val p = cacheAllPartitions.randomPopOrNull() ?: break
                ret.addAll(selectRandIllusts(24 - ret.size, p))
                partitions.add(p)
            }
        }

        val extraType = if(pageNum == 0) EXTRA_TYPES.random() else {
            //随机选择一个类型，但是不能与前两份数据的重复
            val extras = mutableListOf<String>().also { it.addAll(EXTRA_TYPES) }
            records[pageNum - 1]?.also { extras.remove(it.content.extraType) }
            if(pageNum >= 2) records[pageNum - 2]?.also { extras.remove(it.content.extraType) }
            if(extras.size == 1) extras.first() else extras.random()
        }

        val extras = when(extraType) {
            "TOPIC" -> selectRandTopics(6)
            "AUTHOR" -> selectRandAuthors(6)
            "BOOK" -> selectRandBooks(6)
            else -> throw RuntimeException("Unsupported type $extraType.")
        }

        return HomepageRecord.Content(illusts, extras, partitions, extraType)
    }

    private fun selectAllPartition(): List<LocalDate> {
        return data.db.from(Illusts)
            .select(Illusts.partitionTime)
            .where { (Illusts.score greaterEq 2) and (Illusts.cachedBookCount eq 0) }
            .groupBy(Illusts.partitionTime)
            .orderBy(Illusts.partitionTime.asc())
            .map { it[Illusts.partitionTime]!! }
    }

    private fun selectRandIllusts(limit: Int, partition: LocalDate): List<Int> {
        TODO()
        //(it.cachedBookCount eq 0) and (it.score greaterEq 2)
    }

    private fun selectRandTopics(limit: Int): List<Int> {
        TODO()
    }

    private fun selectRandAuthors(limit: Int): List<Int> {
        TODO()
    }

    private fun selectRandBooks(limit: Int): List<Int> {
        TODO()
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

    private fun MutableList<LocalDate>.randomPopOrNull(): LocalDate? {
        if(this.isEmpty()) return null
        val i = Random.nextInt(this.size)
        return this.removeAt(i)
    }
}

private val EXTRA_TYPES = listOf("TOPIC", "AUTHOR", "BOOK")