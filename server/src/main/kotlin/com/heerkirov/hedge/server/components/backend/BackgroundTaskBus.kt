package com.heerkirov.hedge.server.components.backend

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.events.BackgroundTaskChanged
import java.util.TreeSet
import java.util.concurrent.atomic.AtomicInteger

class BackgroundTaskBus(private val bus: EventBus) {
    val counters = TreeSet<BackgroundTaskCounter>()

    fun register(counter: BackgroundTaskCounter) {
        counters.add(counter)
    }

    fun eventToast(counter: BackgroundTaskCounter) {
        bus.emit(BackgroundTaskChanged(counter.type, counter.count, counter.totalCount))
        println("eventToast[${counter.type}] ${counter.count}/${counter.totalCount}")
    }
}

open class ProgressCounter {
    private val _count = AtomicInteger(0)
    private val _totalCount = AtomicInteger(0)

    val count: Int get() = _count.get()
    val totalCount: Int get() = _totalCount.get()

    open fun addTotal(addTotalCount: Int) {
        if(_count.get() >= _totalCount.get()) {
            _count.set(0)
            _totalCount.set(addTotalCount)
        }else{
            _totalCount.addAndGet(addTotalCount)
        }
    }

    open fun addCount(addCount: Int) {
        _count.addAndGet(addCount)
    }

    open fun reset() {
        _count.set(0)
        _totalCount.set(0)
    }
}

class BackgroundTaskCounter(val type: BackgroundTaskType, private val taskBus: BackgroundTaskBus) : ProgressCounter(), Comparable<BackgroundTaskCounter> {
    init {
        taskBus.register(this)
    }

    override fun addTotal(addTotalCount: Int) {
        super.addTotal(addTotalCount)
        taskBus.eventToast(this)
    }

    override fun addCount(addCount: Int) {
        super.addCount(addCount)
        taskBus.eventToast(this)
    }

    override fun reset() {
        super.reset()
        taskBus.eventToast(this)
    }

    override fun compareTo(other: BackgroundTaskCounter): Int = type.compareTo(other.type)
}

enum class BackgroundTaskType {
    FILE_ARCHIVE,
    FILE_GENERATE,
    FIND_SIMILARITY,
    EXPORT_ILLUST_METADATA,
    EXPORT_BOOK_METADATA,
    EXPORT_ILLUST_BOOK_RELATION,
    EXPORT_ILLUST_FOLDER_RELATION
}