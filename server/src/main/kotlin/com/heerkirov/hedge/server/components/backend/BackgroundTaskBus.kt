package com.heerkirov.hedge.server.components.backend

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.events.BackgroundTaskChanged
import java.util.TreeSet
import java.util.concurrent.atomic.AtomicInteger

class BackgroundTaskBus(private val bus: EventBus) {
    val counters = TreeSet<Counter>()

    fun cleanCompleted() {
        synchronized(counters) {
            counters.forEach { it.cleanCompleted() }
        }
    }

    fun counter(type: BackgroundTaskType): Counter {
        return Counter(type, this).also { counters.add(it) }
    }

    private fun eventToast(counter: Counter) {
        bus.emit(BackgroundTaskChanged(counter.type, counter.count, counter.totalCount))
    }

    inner class Counter(val type: BackgroundTaskType, private val taskBus: BackgroundTaskBus) : Comparable<Counter> {
        private val _count = AtomicInteger(0)
        private val _totalCount = AtomicInteger(0)

        val count: Int get() = _count.get()
        val totalCount: Int get() = _totalCount.get()

        fun addTotal(addTotalCount: Int) {
            _totalCount.addAndGet(addTotalCount)
            taskBus.eventToast(this)
        }

        fun addCount(addCount: Int) {
            _count.addAndGet(addCount)
            taskBus.eventToast(this)
        }

        fun cleanCompleted() {
            if(count >= totalCount) {
                _count.set(0)
                _totalCount.set(0)
            }
        }

        override fun compareTo(other: Counter): Int = type.compareTo(other.type)
    }
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