package com.heerkirov.hedge.server.components.backend

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.enums.TagTopicType
import com.heerkirov.hedge.server.library.framework.Component
import com.heerkirov.hedge.server.model.HomepageRecord
import com.heerkirov.hedge.server.utils.DateTime.toPartitionDate
import org.ktorm.dsl.*
import org.ktorm.entity.filter
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.map
import org.ktorm.entity.sequenceOf
import org.ktorm.schema.BaseTable
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

    /**
     * 重设主页内容。
     */
    fun resetHomepageInfo()
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

    override fun resetHomepageInfo() {
        val todayDate = Instant.now().toPartitionDate(appdata.setting.server.timeOffsetHour)

        data.db.delete(HomepageRecords) { it.date eq todayDate }

        records.clear()

        cacheAllPartitions.clear()
        cacheAllPartitions.addAll(selectAllPartition())

        getHomepageInfo(0, todayDate)
        getHomepageInfo(1, todayDate)
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
            "TOPIC" -> selectRandTopics()
            "AUTHOR" -> selectRandAuthors()
            "BOOK" -> selectRandBooks()
            else -> throw RuntimeException("Unsupported type $extraType.")
        }

        return HomepageRecord.Content(illusts, extras, partitions, extraType)
    }

    private fun selectAllPartition(): List<LocalDate> {
        return data.db.from(Illusts)
            .select(Illusts.partitionTime)
            .where { (Illusts.cachedBookCount eq 0) and ((Illusts.type eq IllustModelType.COLLECTION) or (Illusts.type eq IllustModelType.IMAGE)) }
            .groupBy(Illusts.partitionTime)
            .orderBy(Illusts.partitionTime.asc())
            .map { it[Illusts.partitionTime]!! }
    }

    private fun selectRandIllusts(limit: Int, partition: LocalDate): List<Int> {
        //illust的权重计算时，将无评分记作1，1分记作0
        val items = data.db.from(Illusts)
            .select(Illusts.id, Illusts.type, Illusts.exportedScore)
            .where { (Illusts.partitionTime eq partition) and (Illusts.cachedBookCount eq 0) and ((Illusts.type eq IllustModelType.COLLECTION) or (Illusts.type eq IllustModelType.IMAGE)) }
            .map { Triple(it[Illusts.id]!!, it[Illusts.type]!!, it[Illusts.exportedScore]) }

        val totalWeight = items.sumOf { (_, _, s) -> ILLUST_WEIGHTS[s ?: 0] }
        val cumulativeWeights = items.map { (_, _, s) -> ILLUST_WEIGHTS[s ?: 0].toDouble() / totalWeight }.scan(0.0) { acc, weight -> acc + weight }
        val sampled = mutableSetOf<Int>()
        var missing = 0

        while(sampled.size < limit && sampled.size < items.size) {
            if(missing <= 5) {
                //使用轮盘赌算法加权抽样
                val rand = Random.nextDouble()
                val (id, _, _) = items[cumulativeWeights.indexOfFirst { it >= rand } - 1]
                if(id !in sampled) {
                    sampled.add(id)
                }else{
                    missing += 1
                }
            }else{
                //如果累计5次抽样都MISS掉，就认为取样密度已经不足以支撑随机抽样了，更改抽样算法为直接依次选取
                val (id, _, _) = items.firstOrNull { (id, _, _) -> id !in sampled } ?: break
                sampled.add(id)
            }
        }

        return items.filter { (id, _, _) -> id in sampled }.sortedByDescending { (_, _, s) -> s ?: 0 }.map { (id, type, score) ->
            if(type == IllustModelType.COLLECTION) {
                //如果抽选项是一个集合，则查询一个它的children作为替代
                data.db.from(Illusts).select(Illusts.id)
                    .whereWithConditions {
                        it += Illusts.parentId.eq(id)
                        if(score != null) it += Illusts.exportedScore.isNotNull() and Illusts.exportedScore.greaterEq(score)
                    }
                    .map { it[Illusts.id]!! }
                    .randomOrNull() ?: id
            }else{
                id
            }
        }
    }

    private fun selectRandTopics(): List<Int> {
        val limit = 5
        val exists = records.values.filter { it.content.extraType == "TOPIC" }.flatMap { it.content.extras }
        val ret = mutableListOf<Int>()
        ret.addAll(selectRand(Topics, Random.nextInt(2, 6)) { it.type eq TagTopicType.CHARACTER and (it.cachedCount greaterEq 3) and (it.id notInList exists) and it.favorite })
        ret.addAll(selectRand(Topics, limit - ret.size) { (it.cachedCount greaterEq 3) and (it.id notInList exists) and it.favorite.not() })
        return ret
    }

    private fun selectRandAuthors(): List<Int> {
        val limit = 5
        val exists = records.values.filter { it.content.extraType == "AUTHOR" }.flatMap { it.content.extras }
        val ret = mutableListOf<Int>()
        ret.addAll(selectRand(Authors, Random.nextInt(2, 5)) { (it.cachedCount greaterEq 3) and (it.id notInList exists) and it.favorite })
        ret.addAll(selectRand(Authors, Random.nextInt(1, limit - ret.size + 1)) { (it.cachedCount greaterEq 3) and (it.id notInList exists) and it.favorite.not() and it.score.isNotNull() and it.score.greaterEq(3) })
        ret.addAll(selectRand(Authors, limit - ret.size) { (it.cachedCount greaterEq 3) and (it.id notInList exists) and it.favorite.not() and (it.score.isNull() or it.score.less(3)) })
        return ret
    }

    private fun selectRandBooks(): List<Int> {
        val limit = 9
        val exists = records.values.filter { it.content.extraType == "BOOK" }.flatMap { it.content.extras }
        val ret = mutableListOf<Int>()
        ret.addAll(selectRand(Books, Random.nextInt(2, 5)) { (it.cachedCount greaterEq 1) and (it.id notInList exists) and it.score.isNotNull() and it.score.greaterEq(4) })
        ret.addAll(selectRand(Books, Random.nextInt(1, limit - ret.size + 1)) { (it.cachedCount greaterEq 1) and (it.id notInList exists) and it.favorite.not() and it.score.isNotNull() and it.score.greaterEq(3) and it.score.less(4) })
        ret.addAll(selectRand(Books, limit - ret.size) { (it.cachedCount greaterEq 1) and (it.id notInList exists) and it.favorite.not() and (it.score.isNull() or it.score.less(3)) })
        return ret
    }

    private fun <D, T> selectRand(dao: D, limit: Int, condition: (D) -> ColumnDeclaring<Boolean>): List<Int> where D : BaseTable<T> {
        if(limit <= 0) return emptyList()
        val pk = dao.primaryKeys.first()
        return data.db.from(dao).select(pk)
            .where { condition(dao) }
            .orderBy(random().asc())
            .limit(limit)
            .map { it[pk]!! as Int }
    }

    private fun MutableList<LocalDate>.randomPopOrNull(): LocalDate? {
        if(this.isEmpty()) return null
        val i = Random.nextInt(this.size)
        return this.removeAt(i)
    }
}

private val EXTRA_TYPES = listOf("TOPIC", "AUTHOR", "BOOK")

private val ILLUST_WEIGHTS = listOf(1L, 0L, 4L, 9L, 16L, 25L)