package com.heerkirov.hedge.server.components.backend.exporter

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.Illusts
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.events.IllustUpdated
import com.heerkirov.hedge.server.functions.kit.IllustKit
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import com.heerkirov.hedge.server.utils.types.Opt
import com.heerkirov.hedge.server.utils.types.anyOpt
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
            exportFirstCover = tasks.any { it.exportFirstCover }
        )
    }

    override fun run(task: IllustMetadataExporterTask) {
        data.db.transaction {
            val illust = data.db.sequenceOf(Illusts).firstOrNull { it.id eq task.id } ?: return
            val exportedScore: Opt<Int?>
            val exportedDescription: Opt<String>
            val exportedFileAndTime: Opt<Triple<Int, LocalDate, Long>>
            val cachedChildrenCount: Opt<Int>
            if(illust.type == IllustModelType.COLLECTION) {
                //collection??????????????????description??????????????????????????????originDescription?????????????????????????????????????????????????????????
                exportedDescription = undefined()

                //?????????collection??????????????????file???orderTime???childrenCount
                exportedFileAndTime = if(task.exportFirstCover) {
                    val firstChild = data.db.from(Illusts).select()
                        .where { Illusts.parentId eq task.id }
                        .orderBy(Illusts.orderTime.asc())
                        .limit(0, 1)
                        .firstOrNull()
                        ?.let { Illusts.createEntity(it) }
                    if(firstChild != null) {
                        Opt(Triple(firstChild.fileId, firstChild.partitionTime, firstChild.orderTime))
                    }else undefined()
                }else undefined()
                cachedChildrenCount = if(task.exportFirstCover) {
                    Opt(data.db.sequenceOf(Illusts).filter { Illusts.parentId eq task.id }.count())
                }else undefined()

                //exportedScore???score???????????????????????????avg(children.score)
                exportedScore = if(task.exportScore) {
                    Opt(illust.score ?: data.db.from(Illusts)
                        .select(count(Illusts.id).aliased("count"), avg(Illusts.score).aliased("score"))
                        .where { (Illusts.parentId eq task.id) and (Illusts.score.isNotNull()) }
                        .firstOrNull()?.run {
                            if(getInt("count") > 0) getDouble("score").roundToInt() else null
                        })

                }else undefined()

                //exportedMeta??????????????????????????????????????????children???notExportedMeta?????????????????????
                if(task.exportMetaTag) {
                    illustKit.refreshAllMeta(task.id, copyFromChildren = true)
                }
            }else{
                val parent by lazy { if(illust.parentId == null) null else data.db.sequenceOf(Illusts).firstOrNull { it.id eq illust.parentId} }

                exportedFileAndTime = undefined()
                cachedChildrenCount = undefined()

                //exportedDescription???description?????????????????????i??????parent???description
                exportedDescription = if(task.exportDescription) {
                    Opt(illust.description.ifEmpty { parent?.description ?: "" })
                }else undefined()

                //exportedScore???score???????????????????????????parent???exportedScore
                exportedScore = if(task.exportScore) {
                    Opt(illust.score ?: parent?.score)
                }else undefined()

                //exportedMeta????????????????????????????????????????????????parent????????????MetaTag
                if(task.exportMetaTag) {
                    illustKit.refreshAllMeta(task.id, copyFromParent = illust.parentId)
                }
            }

            if(anyOpt(exportedDescription, exportedScore, exportedFileAndTime, cachedChildrenCount)) {
                data.db.update(Illusts) {
                    where { it.id eq task.id }
                    exportedDescription.applyOpt { set(it.exportedDescription, this) }
                    exportedScore.applyOpt { set(it.exportedScore, this) }
                    exportedFileAndTime.alsoOpt { (fileId, partitionTime, orderTime) ->
                        set(it.fileId, fileId)
                        set(it.partitionTime, partitionTime)
                        set(it.orderTime, orderTime)
                    }
                    cachedChildrenCount.applyOpt { set(it.cachedChildrenCount, this) }
                }
            }

            val generalUpdated = task.exportDescription || task.exportFirstCover || task.exportScore
            val metaTagUpdated = task.exportMetaTag
            if(generalUpdated || metaTagUpdated) {
                bus.emit(IllustUpdated(illust.id, illust.type.toIllustType(), generalUpdated, metaTagUpdated, sourceDataUpdated = false, relatedItemsUpdated = false))
            }
        }
    }
}