package com.heerkirov.hedge.server.components.backend.exporter

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.Illusts
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.events.IllustUpdated
import com.heerkirov.hedge.server.functions.kit.IllustKit
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.utils.ktorm.first
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import com.heerkirov.hedge.server.utils.types.Opt
import com.heerkirov.hedge.server.utils.types.anyOpt
import com.heerkirov.hedge.server.utils.types.optOf
import com.heerkirov.hedge.server.utils.types.undefined
import org.ktorm.dsl.*
import org.ktorm.entity.count
import org.ktorm.entity.filter
import org.ktorm.entity.firstOrNull
import org.ktorm.entity.sequenceOf
import java.time.LocalDate
import kotlin.math.roundToInt
import kotlin.reflect.KClass

data class IllustMetadataExporterTask(val id: Int,
                                      val exportScore: Boolean = false,
                                      val exportMetaTag: Boolean = false,
                                      val exportDescription: Boolean = false,
                                      val exportFavorite: Boolean = false,
                                      val exportTagme: Boolean = false,
                                      val exportFirstCover: Boolean = false) : ExporterTask

class IllustMetadataExporter(private val data: DataRepository,
                             private val bus: EventBus,
                             private val illustKit: IllustKit) : ExporterWorker<IllustMetadataExporterTask>, MergedProcessWorker<IllustMetadataExporterTask> {
    override val clazz: KClass<IllustMetadataExporterTask> = IllustMetadataExporterTask::class

    override fun keyof(task: IllustMetadataExporterTask) = task.id.toString()

    override fun merge(tasks: List<IllustMetadataExporterTask>): IllustMetadataExporterTask {
        return IllustMetadataExporterTask(tasks.first().id,
            exportScore = tasks.any { it.exportScore },
            exportMetaTag = tasks.any { it.exportMetaTag },
            exportDescription = tasks.any { it.exportDescription },
            exportFavorite = tasks.any { it.exportFavorite },
            exportTagme = tasks.any { it.exportTagme },
            exportFirstCover = tasks.any { it.exportFirstCover }
        )
    }

    override fun run(task: IllustMetadataExporterTask) {
        data.db.transaction {
            val illust = data.db.sequenceOf(Illusts).firstOrNull { it.id eq task.id } ?: return
            val exportedScore: Opt<Int?>
            val exportedFavorite: Opt<Boolean>
            val exportedTagme: Opt<Illust.Tagme>
            val exportedDescription: Opt<String>
            val exportedFileAndTime: Opt<Triple<Int, LocalDate, Long>>
            val cachedChildrenCount: Opt<Int>
            if(illust.type == IllustModelType.COLLECTION) {
                //collection不需要重导出description，因为它的值总是取自originDescription，在编写时赋值，不会有别的东西影响它的
                exportedDescription = undefined()

                exportedFavorite = if(task.exportFavorite) {
                    val cnt = data.db.from(Illusts)
                        .select(count(Illusts.id).aliased("cnt"))
                        .where { Illusts.parentId eq task.id and Illusts.favorite }
                        .first()
                        .getInt("cnt")
                    optOf(cnt > 0)
                }else undefined()

                exportedTagme = if(task.exportTagme) {
                    val childrenTagmeList = data.db.from(Illusts).select(Illusts.tagme)
                        .where { Illusts.parentId eq task.id }
                        .map { it[Illusts.tagme]!! }
                        .toList()
                    optOf(childrenTagmeList.reduce { acc, tagme -> acc + tagme })
                }else undefined()

                //实际上collection还得重新导出file、orderTime、partitionTime
                exportedFileAndTime = if(task.exportFirstCover) {
                    val children = data.db.from(Illusts)
                        .select(Illusts.fileId, Illusts.partitionTime, Illusts.orderTime)
                        .where { Illusts.parentId eq task.id }
                        .map { Triple(it[Illusts.fileId]!!, it[Illusts.partitionTime]!!, it[Illusts.orderTime]!!) }

                    if(children.isNotEmpty()) {
                        val fileId = children.minBy { it.third }.first
                        val partitionTime = children.asSequence().map { it.second }.groupBy { it }.maxBy { it.value.size }.key
                        val orderTime = children.filter { it.second == partitionTime }.minOf { it.third }
                        optOf(Triple(fileId, partitionTime, orderTime))
                    }else{
                        undefined()
                    }
                }else undefined()

                //以及childrenCount
                cachedChildrenCount = if(task.exportFirstCover) {
                    Opt(data.db.sequenceOf(Illusts).filter { Illusts.parentId eq task.id }.count())
                }else undefined()

                //exportedScore取score，或者缺省时，取出avg(children.score)
                exportedScore = if(task.exportScore) {
                    Opt(illust.score ?: data.db.from(Illusts)
                        .select(count(Illusts.id).aliased("count"), avg(Illusts.score).aliased("score"))
                        .where { (Illusts.parentId eq task.id) and (Illusts.score.isNotNull()) }
                        .firstOrNull()?.run {
                            if(getInt("count") > 0) getDouble("score").roundToInt() else null
                        })
                }else undefined()

                //exportedMeta通过推导生成，或者缺省时，从children取notExportedMeta的并集推导生成
                if(task.exportMetaTag) {
                    illustKit.refreshAllMeta(task.id, copyFromChildren = true)
                }
            }else{
                val parent by lazy { if(illust.parentId == null) null else data.db.sequenceOf(Illusts).firstOrNull { it.id eq illust.parentId} }

                exportedFavorite = undefined()

                exportedTagme = undefined()

                exportedFileAndTime = undefined()

                cachedChildrenCount = undefined()

                //exportedDescription取description，或者缺省时，沿用parent的description
                exportedDescription = if(task.exportDescription) {
                    Opt(illust.description.ifEmpty { parent?.description ?: "" })
                }else undefined()

                //exportedScore取score，或者缺省时，沿用parent的exportedScore
                exportedScore = if(task.exportScore) {
                    Opt(illust.score ?: parent?.score)
                }else undefined()

                //exportedMeta通过推导生成，或者缺省时，直接从parent拷贝全部MetaTag
                if(task.exportMetaTag) {
                    illustKit.refreshAllMeta(task.id, copyFromParent = illust.parentId)
                }
            }

            if(anyOpt(exportedDescription, exportedScore, exportedFileAndTime, exportedFavorite, exportedTagme, cachedChildrenCount)) {
                data.db.update(Illusts) {
                    where { it.id eq task.id }
                    exportedDescription.applyOpt { set(it.exportedDescription, this) }
                    exportedScore.applyOpt { set(it.exportedScore, this) }
                    exportedFavorite.applyOpt { set(it.favorite, this) }
                    exportedTagme.applyOpt { set(it.tagme, this) }
                    exportedFileAndTime.alsoOpt { (fileId, partitionTime, orderTime) ->
                        set(it.fileId, fileId)
                        set(it.partitionTime, partitionTime)
                        set(it.orderTime, orderTime)
                    }
                    cachedChildrenCount.applyOpt { set(it.cachedChildrenCount, this) }
                }
            }

            val listUpdated = task.exportFirstCover || task.exportScore || task.exportFavorite || task.exportTagme
            val detailUpdated = listUpdated || task.exportDescription || task.exportMetaTag
            if(listUpdated || detailUpdated) {
                bus.emit(IllustUpdated(illust.id, illust.type.toIllustType(), listUpdated = listUpdated, detailUpdated = true))
            }
        }
    }
}