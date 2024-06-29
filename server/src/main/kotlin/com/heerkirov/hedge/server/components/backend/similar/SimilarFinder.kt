package com.heerkirov.hedge.server.components.backend.similar

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.backend.BackgroundTaskBus
import com.heerkirov.hedge.server.components.backend.BackgroundTaskType
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.components.status.AppStatusDriver
import com.heerkirov.hedge.server.dao.FindSimilarIgnores
import com.heerkirov.hedge.server.dao.FindSimilarTasks
import com.heerkirov.hedge.server.enums.AppLoadStatus
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.events.IllustDeleted
import com.heerkirov.hedge.server.events.PackagedBusEvent
import com.heerkirov.hedge.server.exceptions.NotFound
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.library.framework.StatefulComponent
import com.heerkirov.hedge.server.model.FindSimilarIgnored
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.utils.tools.ControlledLoopThread
import com.heerkirov.hedge.server.components.backend.BackgroundTaskCounter
import org.ktorm.dsl.*
import org.ktorm.entity.count
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import java.time.Instant

/**
 * 处理相似项查找的后台任务。它从task表读取任务，并将确切结果写入result表。
 */
interface SimilarFinder {
    fun add(selector: FindSimilarTask.TaskSelector, config: FindSimilarTask.TaskConfig? = null): Int

    fun delete(id: Int)

    fun addQuickFind(selector: QuickFindSelector): Int

    fun getQuickFind(id: Int): QuickFinderResult?

    fun castQuickFindToTask(id: Int): Int?
}

class SimilarFinderImpl(private val appStatus: AppStatusDriver,
                        private val appdata: AppDataManager,
                        private val data: DataRepository,
                        bus: EventBus, taskBus: BackgroundTaskBus) : SimilarFinder, StatefulComponent {
    private val counter = BackgroundTaskCounter(BackgroundTaskType.FIND_SIMILARITY, taskBus)
    private val workerThread = SimilarFinderWorkThread(data, bus, counter)
    private val quickFinder = QuickFinder(data, bus)

    init {
        bus.on(IllustDeleted::class, ::processIgnoredDeleted)
    }

    override val isIdle: Boolean get() = !workerThread.isAlive

    override fun load() {
        if(appStatus.status == AppLoadStatus.READY) {
            val recordCount = data.db.sequenceOf(FindSimilarTasks).count()
            if(recordCount > 0) {
                counter.addTotal(recordCount)
                workerThread.start()
            }
        }
    }

    override fun add(selector: FindSimilarTask.TaskSelector, config: FindSimilarTask.TaskConfig?): Int {
        val id = data.db.insertAndGenerateKey(FindSimilarTasks) {
            set(it.selector, selector)
            set(it.config, config ?: appdata.setting.findSimilar.defaultTaskConf)
            set(it.recordTime, Instant.now())
        } as Int

        counter.addTotal(1)

        workerThread.start()

        return id
    }

    override fun delete(id: Int) {
        if(data.db.delete(FindSimilarTasks) { it.id eq id } <= 0) {
            throw be(NotFound())
        }else{
            counter.addTotal(-1)
        }
    }

    override fun addQuickFind(selector: QuickFindSelector): Int {
        synchronized(quickFinder) {
            val r = QuickFinderResult(++quickFinder.nextId, selector, false, emptyList())
            quickFinder.memories.add(r)
            if(quickFinder.memories.size >= 100) {
                for(i in 0..(quickFinder.memories.size - 100)) {
                    val rm = quickFinder.memories.removeFirst()
                    quickFinder.list.remove(rm.id)
                }
            }
            quickFinder.list[r.id] = r
            quickFinder.queue.add(r)
            quickFinder.start()
            return r.id
        }
    }

    override fun getQuickFind(id: Int): QuickFinderResult? {
        return quickFinder.list[id]
    }

    override fun castQuickFindToTask(id: Int): Int? {
        val r = quickFinder.list[id]
        if(r != null && r.succeed && r.imageIds.isNotEmpty()) {
            val selector = FindSimilarTask.TaskSelectorOfImages(r.imageIds)
            val config = FindSimilarTask.TaskConfig(
                findBySimilarity = true, filterInCurrentScope = true,
                findBySourceIdentity = false, findBySourcePart = false, findBySourceRelation = false, findBySourceBook = false,
                filterBySourcePart = false, filterByAuthor = false, filterByTopic = false, filterByPartition = false,
                filterBySourceBook = false, filterBySourceRelation = false, filterBySourceTagType = emptyList()
            )

            return add(selector, config)
        }
        return null
    }

    private fun processIgnoredDeleted(events: PackagedBusEvent) {
        events.which {
            all<IllustDeleted> { events ->
                val illustIds = events.filter { it.illustType == IllustType.IMAGE }.map { it.illustId }
                if(illustIds.isNotEmpty()) data.db.transaction {
                    data.db.delete(FindSimilarIgnores) { (it.type eq FindSimilarIgnored.IgnoredType.EDGE) and (it.firstTarget inList illustIds) or (it.secondTarget inList illustIds) }
                }
            }
        }
    }
}

class SimilarFinderWorkThread(private val data: DataRepository, private val bus: EventBus, private val counter: BackgroundTaskCounter) : ControlledLoopThread() {
    override fun run() {
        val model = data.db.sequenceOf(FindSimilarTasks).firstOrNull()
        if(model == null) {
            this.stop()
            return
        }

        val config = model.config
        val entityLoader = EntityLoader(data, config)
        val graphBuilder = GraphBuilder(data, entityLoader, config)
        val recordBuilder = RecordBuilder(data, bus)
        val graph = graphBuilder.process(model.selector)
        recordBuilder.loadGraph(graph)
        recordBuilder.generateRecords()

        data.db.transaction {
            data.db.delete(FindSimilarTasks) { it.id eq model.id }
        }

        counter.addCount(1)
    }
}