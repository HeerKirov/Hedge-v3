package com.heerkirov.hedge.server.components.backend.exporter

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.components.status.AppStatusDriver
import com.heerkirov.hedge.server.dao.ExporterRecords
import com.heerkirov.hedge.server.enums.AppLoadStatus
import com.heerkirov.hedge.server.functions.kit.BookKit
import com.heerkirov.hedge.server.functions.kit.IllustKit
import com.heerkirov.hedge.server.library.framework.StatefulComponent
import com.heerkirov.hedge.server.utils.Json.parseJSONObject
import com.heerkirov.hedge.server.utils.Json.toJSONString
import com.heerkirov.hedge.server.utils.tools.ControlledLoopThread
import com.heerkirov.hedge.server.utils.tuples.Tuple3
import org.ktorm.dsl.*
import org.ktorm.entity.*
import org.slf4j.LoggerFactory
import java.lang.IllegalArgumentException
import java.time.Instant
import java.util.concurrent.atomic.AtomicInteger
import kotlin.reflect.KClass

/**
 * 后台导出各类属性重新计算任务的组件。用于在更新过程中异步处理大量数据的重新导出。
 * 会将持有的任务持久化到数据库。
 */
interface BackendExporter {
    fun add(tasks: List<ExporterTask>)

    fun add(task: ExporterTask) {
        add(listOf(task))
    }
}

sealed interface ExporterTask

/**
 * backend exporter的工作线程。每一类此接口的实现对应一种task类型的工作。每一个线程实例都是单并发的。
 */
sealed interface ExporterWorker<T : ExporterTask> {
    /**
     * 类。
     */
    val clazz: KClass<T>

    /**
     * 将task序列化。
     */
    fun serialize(task: T): String = task.toJSONString()

    /**
     * 将task反序列化。
     */
    fun deserialize(content: String): T = content.parseJSONObject(clazz.java)

    /**
     * 执行针对某个task的处理操作。
     */
    fun run(task: T)
}

/**
 * 可选的worker属性：每个task开始执行之前，都会延迟一段时间。
 */
interface LatencyProcessWorker {
    /**
     * 延迟时间(毫秒)。
     */
    val latency: Long

    /**
     * 如果在等待时被打断，是退出当前task，还是直接开始。
     */
    val breakWhenInterrupted: Boolean get() = true
}

/**
 * 可选的worker属性：尝试合并具有相同key值的项。此属性给出合并策略。
 */
interface MergedProcessWorker<T : ExporterTask> {
    /**
     * 获得一个task的唯一key。
     */
    fun keyof(task: T): String

    /**
     * 对一组task执行合并。
     */
    fun merge(tasks: List<T>): T
}

private val EXPORTER_TYPE_INDEX = listOf(
    IllustMetadataExporterTask::class,
    BookMetadataExporterTask::class,
    TagGlobalSortExporterTask::class,
    IllustBookRelationExporterTask::class,
    IllustFolderRelationExporterTask::class
)
private val EXPORTER_TYPES = EXPORTER_TYPE_INDEX.mapIndexed { index, kClass -> kClass to index }.toMap()

class BackendExporterImpl(private val appStatus: AppStatusDriver,
                          private val bus: EventBus,
                          private val data: DataRepository,
                          private val illustKit: IllustKit,
                          private val bookKit: BookKit) : BackendExporter, StatefulComponent {
    private val workerThreads: MutableMap<KClass<out ExporterTask>, ExporterWorkerThread<*>> = mutableMapOf()

    override val isIdle: Boolean get() = workerThreads.values.none { it.isAlive }

    override fun load() {
        if(appStatus.status == AppLoadStatus.READY) {
            //组件加载时，从db加载剩余数量，若存在剩余数量就直接开始daemon task。
            val counts = data.db.from(ExporterRecords)
                .select(ExporterRecords.type, count(ExporterRecords.id).aliased("count"))
                .groupBy(ExporterRecords.type)
                .associate { it[ExporterRecords.type]!! to it.getInt("count") }

            for ((type, count) in counts) {
                if(count > 0) {
                    val thread = getWorkerThread(EXPORTER_TYPE_INDEX[type])
                    thread.load(count)
                }
            }
        }
    }

    override fun add(tasks: List<ExporterTask>) {
        if(tasks.isNotEmpty()) {
            for((clazz, sameClassTasks) in tasks.groupBy { it::class }) {
                @Suppress("UNCHECKED_CAST")
                val thread = getWorkerThread(clazz) as ExporterWorkerThread<ExporterTask>

                thread.add(sameClassTasks)
            }
        }
    }

    private fun <T : ExporterTask> newWorker(type: KClass<T>): ExporterWorker<T> {
        @Suppress("UNCHECKED_CAST")
        return when(type) {
            IllustMetadataExporterTask::class -> IllustMetadataExporter(data, bus, illustKit)
            BookMetadataExporterTask::class -> BookMetadataExporter(data, bus, bookKit)
            TagGlobalSortExporterTask::class -> TagGlobalSortExporter(data)
            IllustBookRelationExporterTask::class -> IllustBookRelationExporter(data, illustKit)
            IllustFolderRelationExporterTask::class -> IllustFolderRelationExporter(data, illustKit)
            else -> throw IllegalArgumentException("Unsupported task type ${type.simpleName}.")
        } as ExporterWorker<T>
    }

    private fun <T : ExporterTask> getWorkerThread(type: KClass<T>): ExporterWorkerThread<T> {
        synchronized(workerThreads) {
            return if(type in workerThreads) {
                @Suppress("UNCHECKED_CAST")
                workerThreads[type] as ExporterWorkerThread<T>
            }else{
                val worker = ExporterWorkerThread(data, newWorker(type))
                workerThreads[type] = worker
                worker
            }
        }
    }
}

class ExporterWorkerThread<T : ExporterTask>(private val data: DataRepository,
                                             private val worker: ExporterWorker<T>) : ControlledLoopThread() {
    private val log = LoggerFactory.getLogger(ExporterWorkerThread::class.java)

    @Suppress("UNCHECKED_CAST")
    private val merge: MergedProcessWorker<T>? = if(worker is MergedProcessWorker<*>) worker as MergedProcessWorker<T> else null
    private val latency: LatencyProcessWorker? = if(worker is LatencyProcessWorker) worker else null
    private val typeIndex = EXPORTER_TYPES[worker.clazz] ?: throw IllegalArgumentException("Cannot find type index of type ${worker.clazz.simpleName}.")

    @Volatile
    private var _currentKey: String? = null
    private val _taskCount = AtomicInteger(0)
    private val _totalTaskCount = AtomicInteger(0)

    fun load(initializeTaskCount: Int) {
        _taskCount.set(initializeTaskCount)
        _totalTaskCount.set(initializeTaskCount)
        if(initializeTaskCount > 0) {
            this.start()
        }
    }

    fun add(tasks: List<T>) {
        val now = Instant.now()
        synchronized(this) {
            //锁定thread时，处于对models的读写合并状态，以排斥线程任务对相同内容的修改

            val finalTasks = analyseMergeTasks(tasks)

            if(finalTasks.isNotEmpty()) {
                data.db.batchInsert(ExporterRecords) {
                    for (task in finalTasks) {
                        item {
                            set(it.type, typeIndex)
                            set(it.key, merge?.keyof(task) ?: "")
                            set(it.content, worker.serialize(task))
                            set(it.createTime, now)
                        }
                    }
                }

                _totalTaskCount.addAndGet(finalTasks.size)
                _taskCount.addAndGet(finalTasks.size)
            }
        }

        if(!this.isAlive) {
            //默认情况下，启动daemon task
            this.start()
        }
    }

    private fun analyseMergeTasks(tasks: List<T>): List<T> {
        return if(merge != null) {
            //在merge生效时，处理合并问题
            val groupedNewTasks = tasks.groupBy { merge.keyof(it) }
            data.db.transaction {
                val groupedDbTasks = data.db.sequenceOf(ExporterRecords)
                    .filter { (it.key inList groupedNewTasks.keys) and (it.type eq typeIndex) }
                    .map { Tuple3(it.id, it.key, worker.deserialize(it.content)) }
                    .groupBy { it.f2 }
                if(groupedNewTasks.values.any { it.size > 1 } || groupedDbTasks.isNotEmpty()) {
                    //newTasks存在超过1个相同key，或从数据库中查出的内容不为空，就认为存在需要merge的项，执行merge过程
                    val deleteIds = groupedDbTasks.values.flatten().map { (id, _) -> id }
                    data.db.delete(ExporterRecords) {
                        it.id inList deleteIds
                    }
                    _totalTaskCount.addAndGet(deleteIds.size)
                    _taskCount.addAndGet(deleteIds.size)

                    groupedNewTasks.map { (key, newTasks) ->
                        val dbTasks = groupedDbTasks[key]?.map { it.f3 } ?: emptyList()
                        merge.merge(newTasks + dbTasks)
                    }
                }else{
                    tasks
                }
            }
        }else{
            tasks
        }
    }

    override fun run() {
        latency?.let {
            try {
                Thread.sleep(it.latency)
            }catch (e: InterruptedException) {
                if(it.breakWhenInterrupted) {
                    return
                }
            }
        }

        val model = synchronized(this) {
            //锁定thread时，处于对一个model的数据库读写状态，以排斥add指令对相同内容的修改
            val model = data.db.sequenceOf(ExporterRecords).firstOrNull { it.type eq typeIndex }
            if(model == null) {
                log.info("${_totalTaskCount.get()} ${worker.clazz.simpleName} processed.")
                _taskCount.set(0)
                _totalTaskCount.set(0)
                this.stop()
                return
            }
            data.db.delete(ExporterRecords) { it.id eq model.id }
            model
        }

        val task = worker.deserialize(model.content)
        this._currentKey = merge?.keyof(task)
        try {
            worker.run(task)
        }catch (e: Exception) {
            val logTaskName = worker.clazz.simpleName + if(this._currentKey.isNullOrEmpty())  "" else " [${this._currentKey}]"
            log.error("Error occurred in export worker for $logTaskName.", e)
        }

        this._currentKey = null
    }
}
