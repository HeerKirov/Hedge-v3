package com.heerkirov.hedge.server.components.backend.similar

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.components.status.AppStatusDriver
import com.heerkirov.hedge.server.dao.FindSimilarIgnores
import com.heerkirov.hedge.server.dao.FindSimilarResults
import com.heerkirov.hedge.server.dao.FindSimilarTasks
import com.heerkirov.hedge.server.enums.AppLoadStatus
import com.heerkirov.hedge.server.enums.FindSimilarEntityType
import com.heerkirov.hedge.server.events.*
import com.heerkirov.hedge.server.exceptions.NotFound
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.library.framework.StatefulComponent
import com.heerkirov.hedge.server.model.FindSimilarResult
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.utils.tools.ControlledLoopThread
import com.heerkirov.hedge.server.utils.types.FindSimilarEntityKey
import com.heerkirov.hedge.server.utils.types.toEntityKey
import com.heerkirov.hedge.server.utils.types.toEntityKeyString
import org.ktorm.dsl.*
import org.ktorm.entity.*
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
        bus.on(arrayOf(ImportCreated::class, ImportDeleted::class, IllustDeleted::class), ::processImportToImage)
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
            each<ImportSaved> { workerThread.processImportToImageEvent(it.importIdToImageIds) }
            each<ImportDeleted> { workerThread.processRemoveImportEvent(it.importId) }
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

    fun processImportToImageEvent(importIdToImageIds: Map<Int, Int>) {
        data.db.transaction {
            //接收ImportSaved信息，然后更改已有的result
            val likeCondition = importIdToImageIds.keys.map { FindSimilarEntityKey(FindSimilarEntityType.IMPORT_IMAGE, it).toEntityKeyString() }.map { "%|$it|%" }.map { FindSimilarResults.images like it }.reduce { a, b -> a or b }
            val existResults = data.db.sequenceOf(FindSimilarResults).filter { likeCondition }.toList()
            for (result in existResults) {
                val newImages = result.images.asSequence()
                    .map { it.toEntityKey() }
                    .map { if(it.type == FindSimilarEntityType.IMPORT_IMAGE && it.id in importIdToImageIds.keys) FindSimilarEntityKey(FindSimilarEntityType.ILLUST, importIdToImageIds[it.id]!!) else it }
                    .map { it.toEntityKeyString() }
                    .toList()

                val newRelations = result.relations.asSequence()
                    .map {
                        val ak = it.a.toEntityKey()
                        val bk = it.b.toEntityKey()
                        val newA = if(ak.type == FindSimilarEntityType.IMPORT_IMAGE && ak.id in importIdToImageIds.keys) importIdToImageIds[ak.id]!! else null
                        val newB = if(bk.type == FindSimilarEntityType.IMPORT_IMAGE && bk.id in importIdToImageIds.keys) importIdToImageIds[bk.id]!! else null
                        if(newA != null || newB != null) {
                            FindSimilarResult.RelationUnit(
                                newA?.let { i -> FindSimilarEntityKey(FindSimilarEntityType.ILLUST, i).toEntityKeyString() } ?: it.a,
                                newB?.let { i -> FindSimilarEntityKey(FindSimilarEntityType.ILLUST, i).toEntityKeyString() } ?: it.b,
                                it.type, it.params)
                        }else{
                            it
                        }
                    }
                    .toList()

                data.db.update(FindSimilarResults) {
                    where { it.id eq result.id }
                    set(it.images, newImages)
                    set(it.relations, newRelations)
                }
            }
            //更改已有的ignored
            val likeCondition1 = importIdToImageIds.keys.map { FindSimilarEntityKey(FindSimilarEntityType.IMPORT_IMAGE, it).toEntityKeyString() }.map { FindSimilarIgnores.firstTarget eq it }.reduce { a, b -> a or b }
            val existIgnores = data.db.sequenceOf(FindSimilarIgnores).filter { likeCondition1 }.toList()
            for (ignored in existIgnores) {
                val aId = ignored.firstTarget.toEntityKey().id
                val newA = FindSimilarEntityKey(FindSimilarEntityType.ILLUST, importIdToImageIds[aId]!!).toEntityKeyString()
                data.db.update(FindSimilarIgnores) {
                    where { it.id eq ignored.id }
                    set(it.firstTarget, newA)
                }
                data.db.update(FindSimilarIgnores) {
                    where { (it.secondTarget eq ignored.firstTarget) and (it.firstTarget eq ignored.secondTarget) }
                    set(it.secondTarget, newA)
                }
            }
        }
    }

    fun processRemoveImportEvent(importId: Int) {
        val key = FindSimilarEntityKey(FindSimilarEntityType.IMPORT_IMAGE, importId).toEntityKeyString()
        data.db.delete(FindSimilarIgnores) { (it.firstTarget eq key) or (it.secondTarget eq key) }
    }

    fun processRemoveImageEvent(illustId: Int) {
        val key = FindSimilarEntityKey(FindSimilarEntityType.ILLUST, illustId).toEntityKeyString()
        data.db.delete(FindSimilarIgnores) { (it.firstTarget eq key) or (it.secondTarget eq key) }
    }
}