package com.heerkirov.hedge.server.components.backend

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.status.AppStatusDriver
import com.heerkirov.hedge.server.dao.TrashedImages
import com.heerkirov.hedge.server.enums.AppLoadStatus
import com.heerkirov.hedge.server.functions.manager.TrashManager
import com.heerkirov.hedge.server.library.framework.Component
import com.heerkirov.hedge.server.utils.DateTime
import org.ktorm.dsl.*
import org.slf4j.LoggerFactory
import kotlin.concurrent.thread
import kotlin.math.absoluteValue

/**
 * 处理已删除文件自动清理的相关工作。
 * - 自动清理工作仅在每次程序启动时会执行一次。根据自动清理间隔，与当前时间间隔超出此日数的项会被清除。
 */
interface TrashCleaner : Component

class TrashCleanerImpl(private val appStatusDriver: AppStatusDriver, private val data: DataRepository, private val trashManager: TrashManager) : TrashCleaner {
    private val log = LoggerFactory.getLogger(TrashCleaner::class.java)

    override fun load() {
        if(appStatusDriver.status == AppLoadStatus.READY && data.setting.file.autoCleanTrashes) {
            val intervalDay = data.setting.file.autoCleanTrashesIntervalDay
            thread(isDaemon = false) {
                Thread.sleep(5000)
                execute(intervalDay)
            }
        }
    }

    private fun execute(intervalDay: Int) {
        val now = DateTime.now()
        val deadline = now.minusDays(intervalDay.absoluteValue.toLong())
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