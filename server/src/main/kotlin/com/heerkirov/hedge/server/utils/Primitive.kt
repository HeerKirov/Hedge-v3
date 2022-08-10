package com.heerkirov.hedge.server.utils

import java.util.*
import kotlin.collections.HashMap

/**
 * 对迭代内容进行分类计数。
 */
fun <T> Iterable<T>.duplicateCount(): Map<T, Int> {
    val map = HashMap<T, Int>()
    for (t in this) {
        map[t] = map.computeIfAbsent(t) { 0 } + 1
    }
    return map
}

/**
 * 按照给定条件，将迭代内容分割至两个列表。
 */
inline fun <T> Iterable<T>.filterInto(condition: (T) -> Boolean): Pair<List<T>, List<T>> {
    val a = LinkedList<T>()
    val b = LinkedList<T>()
    for (t in this) {
        if(condition(t)) a.add(t) else b.add(t)
    }
    return a to b
}

/**
 * 按照给定条件，将迭代内容分割至两个列表。
 */
inline fun <T> Sequence<T>.filterInto(condition: (T) -> Boolean): Pair<List<T>, List<T>> {
    val a = LinkedList<T>()
    val b = LinkedList<T>()
    for (t in this) {
        if(condition(t)) a.add(t) else b.add(t)
    }
    return a to b
}

/**
 * 应用给Iterator的map函数。
 */
inline fun <T, R> Iterator<T>.map (transform: (T) -> R): List<R> {
    val list = arrayListOf<R>()
    this.forEach { list.add(transform(it)) }
    return list
}

/**
 * 从fromIndex处开始搜索第一个符合条件的元素。
 */
inline fun <T> List<T>.indexOfFirst(fromIndex: Int, predicate: (T) -> Boolean): Int {
    val iterator = this.listIterator(fromIndex)
    while (iterator.hasNext()) {
        if (predicate(iterator.next())) {
            return iterator.previousIndex()
        }
    }
    return -1
}

/**
 * 从fromIndex处向前搜索第一个符合条件的元素。
 */
inline fun <T> List<T>.indexOfLast(fromIndex: Int, predicate: (T) -> Boolean): Int {
    val iterator = this.listIterator(fromIndex)
    while (iterator.hasPrevious()) {
        if (predicate(iterator.previous())) {
            return iterator.nextIndex()
        }
    }
    return -1
}

/**
 * 如果条件满足，将T作为callback函数的this，执行callback。
 */
inline fun <T> T.applyIf(predicate: Boolean, block: T.() -> Unit): T {
    if(predicate) {
        block()
    }
    return this
}

/**
 * 如果条件满足，将T计算为另一个同类型的值，且将T作为callback函数的this。
 */
inline fun <T> T.runIf(predicate: Boolean, block: T.() -> T): T {
    if(predicate) {
        return block()
    }
    return this
}

/**
 * 如果条件满足，将T计算为另一个同类型的值，且将T作为callback函数参数。
 */
inline fun <T> T.letIf(predicate: Boolean, block: (T) -> T): T {
    if(predicate) {
        return block(this)
    }
    return this
}