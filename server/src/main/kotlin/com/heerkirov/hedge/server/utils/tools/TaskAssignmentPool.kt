package com.heerkirov.hedge.server.utils.tools

import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger

interface TaskAssignmentThread<T> {
    val isAlive: Boolean
    fun addAll(tasks: Iterable<T>)
}

abstract class TaskAssignmentThreadImpl<T>(poolSize: Int?) : TaskAssignmentThread<T> {
    private val size = poolSize ?: Runtime.getRuntime().availableProcessors()
    private val pool: ExecutorService = Executors.newFixedThreadPool(size)
    private val aliveTaskCount = AtomicInteger(0)

    override val isAlive: Boolean get() = aliveTaskCount.get() > 0

    override fun addAll(tasks: Iterable<T>) {
        for (t in tasks) {
            aliveTaskCount.incrementAndGet()
            pool.execute {
                try {
                    thread(t)
                }finally{
                    aliveTaskCount.decrementAndGet()
                }
            }
        }
    }

    abstract fun thread(task: T)
}

inline fun <T> assignmentTask(poolSize: Int? = null, crossinline thread: (T) -> Unit): TaskAssignmentThread<T> {
    return object : TaskAssignmentThreadImpl<T>(poolSize) {
        override fun thread(task: T) {
            thread(task)
        }
    }
}