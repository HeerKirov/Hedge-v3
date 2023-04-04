package com.heerkirov.hedge.server.components.backend.similar

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.status.AppStatusDriver
import com.heerkirov.hedge.server.dao.FindSimilarTasks
import com.heerkirov.hedge.server.enums.AppLoadStatus
import com.heerkirov.hedge.server.exceptions.NotFound
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.library.framework.StatefulComponent
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.utils.DateTime
import com.heerkirov.hedge.server.utils.tools.ControlledLoopThread
import org.ktorm.dsl.*
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.isNotEmpty
import org.ktorm.entity.sequenceOf

/**
 * 处理相似项查找的后台任务。它从task表读取任务，并将确切结果写入result表。
 */
interface SimilarFinder : StatefulComponent {
    fun add(selector: FindSimilarTask.TaskSelector, config: FindSimilarTask.TaskConfig? = null): Int

    fun delete(id: Int)
}

class SimilarFinderImpl(private val appStatus: AppStatusDriver, private val data: DataRepository) : SimilarFinder {
    private val workerThread = SimilarFinderWorkThread(data)

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
            set(it.recordTime, DateTime.now())
        } as Int

        workerThread.start()

        return id
    }

    override fun delete(id: Int) {
        if(data.db.delete(FindSimilarTasks) { it.id eq id } <= 0) {
            throw be(NotFound())
        }
    }
}

class SimilarFinderWorkThread(private val data: DataRepository) : ControlledLoopThread() {
    override fun run() {
        val model = data.db.sequenceOf(FindSimilarTasks).firstOrNull()
        if(model == null) {
            this.stop()
            return
        }

        val config = model.config ?: data.setting.findSimilar.defaultTaskConf
        val entityLoader = EntityLoader(data, config)
        val graphBuilder = GraphBuilder(data, entityLoader, config)
        val recordBuilder = RecordBuilder(data)
        val graph = graphBuilder.process(model.selector)
        recordBuilder.loadGraph(graph)
        recordBuilder.generateRecords()

        data.db.delete(FindSimilarTasks) { it.id eq model.id }
    }
}