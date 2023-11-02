package com.heerkirov.hedge.server.components.backend.similar

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.status.AppStatusDriver
import com.heerkirov.hedge.server.dao.FindSimilarIgnores
import com.heerkirov.hedge.server.dao.FindSimilarTasks
import com.heerkirov.hedge.server.enums.AppLoadStatus
import com.heerkirov.hedge.server.enums.FindSimilarEntityType
import com.heerkirov.hedge.server.events.IllustDeleted
import com.heerkirov.hedge.server.events.PackagedBusEvent
import com.heerkirov.hedge.server.exceptions.NotFound
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.library.framework.StatefulComponent
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.utils.tools.ControlledLoopThread
import com.heerkirov.hedge.server.utils.types.FindSimilarEntityKey
import com.heerkirov.hedge.server.utils.types.toEntityKeyString
import org.ktorm.dsl.delete
import org.ktorm.dsl.eq
import org.ktorm.dsl.insertAndGenerateKey
import org.ktorm.dsl.or
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.isNotEmpty
import org.ktorm.entity.sequenceOf
import java.time.Instant

/**
 * 处理相似项查找的后台任务。它从task表读取任务，并将确切结果写入result表。
 */
interface SimilarFinder {
    fun add(selector: FindSimilarTask.TaskSelector, config: FindSimilarTask.TaskConfig? = null): Int

    fun delete(id: Int)
}

class SimilarFinderImpl(private val appStatus: AppStatusDriver, appdata: AppDataManager, private val data: DataRepository, bus: EventBus) : SimilarFinder, StatefulComponent {
    private val workerThread = SimilarFinderWorkThread(appdata, data, bus)

    init {
        bus.on(IllustDeleted::class, ::processImportToImage)
    }

    override val isIdle: Boolean get() = !workerThread.isAlive

    override fun load() {
        if(appStatus.status == AppLoadStatus.READY) {
            if(data.db.sequenceOf(FindSimilarTasks).isNotEmpty()) {
                workerThread.start()
            }
        }
    }

    override fun add(selector: FindSimilarTask.TaskSelector, config: FindSimilarTask.TaskConfig?): Int {
        val id = data.db.insertAndGenerateKey(FindSimilarTasks) {
            set(it.selector, selector)
            set(it.config, config)
            set(it.recordTime, Instant.now())
        } as Int

        workerThread.start()

        return id
    }

    override fun delete(id: Int) {
        if(data.db.delete(FindSimilarTasks) { it.id eq id } <= 0) {
            throw be(NotFound())
        }
    }

    private fun processImportToImage(events: PackagedBusEvent) {
        events.which {
            each<IllustDeleted> { workerThread.processRemoveImageEvent(it.illustId) }
        }
    }
}

class SimilarFinderWorkThread(private val appdata: AppDataManager, private val data: DataRepository, private val bus: EventBus) : ControlledLoopThread() {
    override fun run() {
        val model = data.db.sequenceOf(FindSimilarTasks).firstOrNull()
        if(model == null) {
            this.stop()
            return
        }

        val config = model.config ?: appdata.setting.findSimilar.defaultTaskConf
        val entityLoader = EntityLoader(data, config)
        val graphBuilder = GraphBuilder(data, entityLoader, config)
        val recordBuilder = RecordBuilder(data, bus)
        val graph = graphBuilder.process(model.selector)
        recordBuilder.loadGraph(graph)
        recordBuilder.generateRecords()

        data.db.delete(FindSimilarTasks) { it.id eq model.id }
    }

    fun processRemoveImageEvent(illustId: Int) {
        val key = FindSimilarEntityKey(FindSimilarEntityType.ILLUST, illustId).toEntityKeyString()
        data.db.delete(FindSimilarIgnores) { (it.firstTarget eq key) or (it.secondTarget eq key) }
    }
}