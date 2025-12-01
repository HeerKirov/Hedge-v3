package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.FileRecords
import com.heerkirov.hedge.server.dao.Illusts
import com.heerkirov.hedge.server.dto.res.StagingPostImageRes
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.events.IllustDeleted
import com.heerkirov.hedge.server.events.IllustUpdated
import com.heerkirov.hedge.server.events.PackagedBusEvent
import com.heerkirov.hedge.server.events.StagingPostChanged
import com.heerkirov.hedge.server.utils.DateTime.toInstant
import com.heerkirov.hedge.server.utils.business.filePathFrom
import com.heerkirov.hedge.server.utils.business.sourcePathOf
import org.ktorm.dsl.*
import kotlin.math.min

class StagingPostManager(private val data: DataRepository, private val bus: EventBus) {
    private val stagingPosts = ArrayList<StagingPostImageRes>()
    private val stagingIdSet = mutableSetOf<Int>()

    init {
        bus.on(arrayOf(IllustUpdated::class, IllustDeleted::class), ::illustUpdateEvent)
    }

    /**
     * 查询中转站图像数量。
     */
    fun count(): Int {
        return stagingPosts.size
    }

    /**
     * 查询中转站图像列表。
     */
    fun query(limit: Int? = null, offset: Int? = null): List<StagingPostImageRes> {
        return if(limit == null && offset == null) stagingPosts else stagingPosts.subList(offset ?: 0, min((offset ?: 0) + (limit ?: stagingPosts.size), stagingPosts.size))
    }

    /**
     * 向中转站添加新图像。
     */
    fun add(imageIds: List<Int>, ordinal: Int?) {
        synchronized(stagingPosts) {
            val imageIdSet = imageIds.toSet()
            //首先将已有项移出列表，并统计在ordinal之前被移除的项的数量
            val existIllusts = mutableMapOf<Int, StagingPostImageRes>()
            var beforeOrdinalCount = 0
            for (i in stagingPosts.indices.reversed()) {
                if(stagingPosts[i].id in imageIdSet) {
                    stagingPosts.removeAt(i).also { existIllusts[it.id] = it }
                    if(ordinal != null && i <= ordinal) beforeOrdinalCount += 1
                }
            }
            //计算最终ordinal
            val finalOrdinal = if(ordinal != null && ordinal <= stagingPosts.size) ordinal - beforeOrdinalCount else stagingPosts.size

            //然后请求新项
            val newIllustIds = imageIdSet - existIllusts.keys
            val newIllusts = queryIllustFromRepo(newIllustIds.toList()).associateBy { it.id }
            //然后按顺序追加所有新项
            val appendIllusts = imageIds.mapNotNull { existIllusts[it] ?: newIllusts[it] }
            if(finalOrdinal < stagingPosts.size) {
                stagingPosts.addAll(finalOrdinal, appendIllusts)
            }else{
                stagingPosts.addAll(appendIllusts)
            }
            stagingIdSet.addAll(newIllusts.keys)
            if(newIllusts.isNotEmpty() || existIllusts.isNotEmpty()) bus.emit(StagingPostChanged(newIllusts.keys.toList(), existIllusts.keys.toList(), emptyList()))
        }
    }

    /**
     * 移动中转站中已有的图像。
     */
    fun move(imageIds: List<Int>, ordinal: Int?) {
        synchronized(stagingPosts) {
            val imageIdSet = imageIds.toSet()
            //首先将已有项移出列表，并统计在ordinal之前被移除的项的数量
            val existIllusts = mutableMapOf<Int, StagingPostImageRes>()
            var beforeOrdinalCount = 0
            for (i in stagingPosts.indices.reversed()) {
                if(stagingPosts[i].id in imageIdSet) {
                    stagingPosts.removeAt(i).also { existIllusts[it.id] = it }
                    if(ordinal != null && i <= ordinal) beforeOrdinalCount += 1
                }
            }
            //计算最终ordinal
            val finalOrdinal = if(ordinal != null && ordinal <= stagingPosts.size) ordinal - beforeOrdinalCount else stagingPosts.size
            //然后按顺序追加所有新项
            val appendIllusts = imageIds.mapNotNull { existIllusts[it] }
            if(finalOrdinal < stagingPosts.size) {
                stagingPosts.addAll(finalOrdinal, appendIllusts)
            }else{
                stagingPosts.addAll(appendIllusts)
            }
            if(existIllusts.isNotEmpty()) bus.emit(StagingPostChanged(emptyList(), existIllusts.keys.toList(), emptyList()))
        }
    }

    /**
     * 从中转站移除图像。
     */
    fun remove(imageIds: List<Int>) {
        synchronized(stagingPosts) {
            val imageIdSet = imageIds.toSet()
            val deleted = ArrayList<Int>(imageIds.size)
            stagingPosts.removeIf { (it.id in imageIdSet).also { checked -> if(checked) deleted.add(it.id) } }
            stagingIdSet.minusAssign(imageIdSet)
            if(deleted.isNotEmpty()) bus.emit(StagingPostChanged(emptyList(), emptyList(), deleted))
        }
    }

    /**
     * 清空中转站。
     */
    fun clear() {
        synchronized(stagingPosts) {
            if(stagingPosts.isNotEmpty()) {
                val deleted = stagingPosts.map { it.id }
                stagingPosts.clear()
                stagingIdSet.clear()
                bus.emit(StagingPostChanged(emptyList(), emptyList(), deleted))
            }
        }
    }

    /**
     * 事件总线：接受Illust的变化事件，以及时更新中转站内容。
     */
    private fun illustUpdateEvent(e: PackagedBusEvent) {
        e.which {
            all<IllustUpdated>({ it.listUpdated && it.illustType == IllustType.IMAGE && it.illustId in stagingIdSet }) { events ->
                synchronized(stagingPosts) {
                    val imageIds = events.map { it.illustId }
                    val illusts = queryIllustFromRepo(imageIds)
                    for (illust in illusts) {
                        val idx = stagingPosts.indexOfFirst { it.id == illust.id }
                        if(idx >= 0) stagingPosts[idx] = illust
                    }
                }
            }
            all<IllustDeleted>({ it.illustType == IllustType.IMAGE && it.illustId in stagingIdSet }) { events ->
                synchronized(stagingPosts) {
                    val imageIds = events.map { it.illustId }
                    remove(imageIds)
                }
            }
        }
    }

    /**
     * 从db查询illusts。
     */
    private fun queryIllustFromRepo(imageIds: List<Int>): List<StagingPostImageRes> {
        return data.db.from(Illusts)
            .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
            .select(
                Illusts.id, Illusts.exportedScore, Illusts.favorite, Illusts.partitionTime, Illusts.orderTime,
                FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { Illusts.type notEq IllustModelType.COLLECTION and (Illusts.id inList imageIds) }
            .map {
                val itemId = it[Illusts.id]!!
                val score = it[Illusts.exportedScore]
                val favorite = it[Illusts.favorite]!!
                val partitionTime = it[Illusts.partitionTime]!!
                val orderTime = it[Illusts.orderTime]!!.toInstant()
                val source = sourcePathOf(it)
                val filePath = filePathFrom(it)
                StagingPostImageRes(itemId, filePath, score, favorite, source, partitionTime, orderTime)
            }
            .associateBy { it.id }
            .let { res -> imageIds.mapNotNull(res::get) }
    }
}