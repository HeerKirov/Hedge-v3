package com.heerkirov.hedge.server.components.backend

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.status.AppStatusDriver
import com.heerkirov.hedge.server.dao.TrashedImages
import com.heerkirov.hedge.server.enums.AppLoadStatus
import com.heerkirov.hedge.server.functions.manager.TrashManager
import com.heerkirov.hedge.server.library.framework.DaemonThreadComponent
import org.ktorm.dsl.*
import org.slf4j.LoggerFactory
import java.time.Instant
import java.time.temporal.ChronoUnit
import kotlin.math.absoluteValue

/**
 * 处理已删除文件自动清理的相关工作。
 * - 自动清理工作仅在每次程序启动时会执行一次。根据自动清理间隔，与当前时间间隔超出此日数的项会被清除。
 */
interface TrashCleaner

class TrashCleanerImpl(private val appStatusDriver: AppStatusDriver,
                       private val appdata: AppDataManager,
                       private val data: DataRepository,
                       private val trashManager: TrashManager) : TrashCleaner, DaemonThreadComponent {
    private val log = LoggerFactory.getLogger(TrashCleaner::class.java)

    override fun thread() {
        if(appStatusDriver.status == AppLoadStatus.READY && appdata.setting.storage.autoCleanTrashes) {
            val intervalDay = appdata.setting.storage.autoCleanTrashesIntervalDay
            Thread.sleep(5000)
            execute(intervalDay)
        }
    }

    private fun execute(intervalDay: Int) {
        val now = Instant.now()
        val deadline = now.minus(intervalDay.absoluteValue.toLong(), ChronoUnit.DAYS)
        val imageIds = data.db.from(TrashedImages)
            .select(TrashedImages.imageId)
            .where { TrashedImages.trashedTime lessEq deadline }
            .map { it[TrashedImages.imageId]!! }

        trashManager.deleteTrashedImage(imageIds)

        if(imageIds.isNotEmpty()) {
            log.info("${imageIds.size} trashed images have been cleared.")
        }
    }
}