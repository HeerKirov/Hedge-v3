package com.heerkirov.hedge.server.utils.structs

import com.heerkirov.hedge.server.utils.indexOfFirst
import com.heerkirov.hedge.server.utils.indexOfLast

/**
 * 一个计数集合。可以向内容添加指定数量的对象，并且实现数量统计和按数量排序。内容列表按数量降序排序。
 */
class CountSet<T> {
    private val _ele: MutableList<T> = ArrayList(100)
    private val _cnt: MutableList<Int> = ArrayList(100)
    private var _size: Int = 0

    val size: Int get() = _size

    fun add(element: T, count: Int = 1): Int {
        if(count <= 0) throw IllegalAccessException()
        val targetIndex = _ele.indexOf(element)
        if(targetIndex >= 0) {
            //已存在此元素
            val currentCount = _cnt[targetIndex] + count
            //寻找当前元素后面第一个比当前元素大的位置，减1作为移动的目标位置；如果再也没有比当前元素大的了，就把末尾位作为移动位置
            val firstLarger = _cnt.indexOfFirst(targetIndex + 1) { it > currentCount }
            val moveIndex = if(firstLarger > targetIndex) firstLarger - 1 else if(targetIndex < _size - 1) _size - 1 else -1

            if(moveIndex >= 0) {
                //将当前元素向后移到moveIndex
                for(i in targetIndex until moveIndex) {
                    _ele[i] = _ele[i + 1]
                    _cnt[i] = _cnt[i + 1]
                }
                _ele[moveIndex] = element
                _cnt[moveIndex] = currentCount
            }else{
                _cnt[targetIndex] = currentCount
            }

            return currentCount
        }else{
            //此元素不存在，新插入此元素
            val insertIndex = _cnt.indexOfFirst { it > count }
            if(insertIndex >= 0) {
                _ele.add(insertIndex, element)
                _cnt.add(insertIndex, count)
            }else{
                _ele.add(element)
                _cnt.add(count)
            }
            _size += 1

            return count
        }
    }

    fun clear() {
        _ele.clear()
        _cnt.clear()
        _size = 0
    }

    fun remove(element: T, count: Int = 1): Int {
        if(count <= 0) throw IllegalAccessException()
        val targetIndex = _ele.indexOf(element)
        if(targetIndex >= 0) {
            //已存在此元素
            val currentCount = _cnt[targetIndex] - count
            if(currentCount <= 0) {
                //减少后数量为0，则将此元素移除
                _ele.removeAt(targetIndex)
                _cnt.removeAt(targetIndex)
                _size -= 1

                return 0
            }else{
                //寻找当前元素前面第一个比当前元素小的位置，加1作为移动的目标位置；如果再也没有比当前元素小的了，就把开头作为移动位置
                val firstLess = _cnt.indexOfLast(targetIndex) { it < currentCount }
                val moveIndex = if(firstLess >= 0) firstLess + 1 else if(targetIndex > 0) 0 else -1
                if(moveIndex >= 0) {
                    for(i in (targetIndex - 1) downTo moveIndex) {
                        _ele[i + 1] = _ele[i]
                        _cnt[i + 1] = _cnt[i]
                    }
                    _ele[moveIndex] = element
                    _cnt[moveIndex] = currentCount
                }else{
                    _cnt[targetIndex] = currentCount
                }

                return currentCount
            }
        }else{
            return 0
        }
    }

    fun isEmpty(): Boolean = _size == 0

    fun contains(element: T): Boolean = _ele.contains(element)

    operator fun get(element: T): Int {
        val i = _ele.lastIndexOf(element)
        return if(i >= 0) _cnt[i] else 0
    }

    fun toList(): List<Pair<T, Int>> {
        return _ele.zip(_cnt)
    }

    fun theMost(count: Int): List<Pair<T, Int>> {
        return if(_size > count) {
            _ele.subList(_size - count, _size).zip(_cnt.subList(_size - count, _size)).reversed()
        }else{
            _ele.zip(_cnt).reversed()
        }
    }
}