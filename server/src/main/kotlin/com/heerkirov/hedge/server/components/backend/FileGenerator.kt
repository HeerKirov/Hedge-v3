package com.heerkirov.hedge.server.components.backend

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.components.status.AppStatusDriver
import com.heerkirov.hedge.server.dao.FileFingerprints
import com.heerkirov.hedge.server.dao.FileRecords
import com.heerkirov.hedge.server.dao.ImportImages
import com.heerkirov.hedge.server.enums.AppLoadStatus
import com.heerkirov.hedge.server.enums.FileStatus
import com.heerkirov.hedge.server.enums.FingerprintStatus
import com.heerkirov.hedge.server.events.ImportUpdated
import com.heerkirov.hedge.server.exceptions.BusinessException
import com.heerkirov.hedge.server.exceptions.IllegalFileExtensionError
import com.heerkirov.hedge.server.library.framework.StatefulComponent
import com.heerkirov.hedge.server.model.FileRecord
import com.heerkirov.hedge.server.utils.DateTime
import com.heerkirov.hedge.server.utils.Graphics
import com.heerkirov.hedge.server.utils.Similarity
import com.heerkirov.hedge.server.utils.business.generateFilepath
import com.heerkirov.hedge.server.utils.business.generateThumbnailFilepath
import com.heerkirov.hedge.server.utils.tools.controlledThread
import com.heerkirov.hedge.server.utils.deleteIfExists
import org.ktorm.dsl.*
import org.ktorm.entity.*
import org.slf4j.LoggerFactory
import java.io.File
import java.util.*

/**
 * 处理文件的后台任务。每当新建了新的File时，都应当在后台任务生成其缩略图，并解析其附加参数。
 */
interface FileGenerator : StatefulComponent {
    /**
     * 添加一个新任务。任务不会被持久化，因此此方法仅用于新建File时对此组件发出通知。
     */
    fun appendTask(fileId: Int)
}

private const val GENERATE_INTERVAL: Long = 50

class FileGeneratorImpl(private val appStatus: AppStatusDriver, private val appdata: AppDataManager, private val data: DataRepository, private val bus: EventBus) : FileGenerator {
    private val log = LoggerFactory.getLogger(FileGenerator::class.java)

    private val thumbnailQueue: MutableList<Int> = LinkedList()
    private val fingerprintQueue: MutableList<Int> = LinkedList()

    private val thumbnailTask = controlledThread(thread = ::thumbnailDaemon)
    private val fingerprintTask = controlledThread(thread = ::fingerprintDaemon)

    override val isIdle: Boolean get() = !thumbnailTask.isAlive

    override fun load() {
        if(appStatus.status == AppLoadStatus.READY) {
            val thumbnailTasks = data.db.from(FileRecords)
                .select(FileRecords.id)
                .where { FileRecords.status eq FileStatus.NOT_READY }
                .orderBy(FileRecords.updateTime.asc())
                .map { it[FileRecords.id]!! }
            if(thumbnailTasks.isNotEmpty()) {
                synchronized(this) {
                    thumbnailQueue.addAll(thumbnailTasks)
                    thumbnailTask.start()
                }
            }
            val fingerprintTasks = data.db.from(FileRecords)
                .leftJoin(FileFingerprints, FileFingerprints.fileId eq FileRecords.id)
                .select(FileRecords.id)
                .where { (FileRecords.fingerStatus eq FingerprintStatus.NOT_READY) or (FileFingerprints.fileId.isNull()) }
                .orderBy(FileRecords.updateTime.asc())
                .map { it[FileRecords.id]!! }
            if(thumbnailTasks.isNotEmpty()) {
                synchronized(this) {
                    fingerprintQueue.addAll(fingerprintTasks)
                    fingerprintTask.start()
                }
            }
        }
    }

    override fun appendTask(fileId: Int) {
        thumbnailQueue.add(fileId)
        fingerprintQueue.add(fileId)
        thumbnailTask.start()
        fingerprintTask.start()
    }

    private fun thumbnailDaemon() {
        if(thumbnailQueue.isEmpty()) {
            synchronized(this) {
                if(thumbnailQueue.isEmpty()) {
                    thumbnailTask.stop()
                    return
                }
            }
        }
        if(!appdata.storagePathAccessor.accessible) {
            log.warn("File storage path ${appdata.storagePathAccessor.storageDir} is not accessible. File generator is paused.")
            return
        }

        val fileId = thumbnailQueue.first()

        try {
            val fileRecord = data.db.sequenceOf(FileRecords).firstOrNull { it.id eq fileId }
            if(fileRecord != null && fileRecord.status == FileStatus.NOT_READY) {
                val filepath = generateFilepath(fileRecord.folder, fileRecord.id, fileRecord.extension)
                val file = File("${appdata.storagePathAccessor.storageDir}/$filepath")
                if(file.exists()) {
                    val (thumbnailFileSize, resolutionWidth, resolutionHeight) = processThumbnail(fileRecord, file)
                    data.db.transaction {
                        data.db.update(FileRecords) {
                            where { it.id eq fileRecord.id }
                            if(thumbnailFileSize != null) {
                                set(it.status, FileStatus.READY)
                                set(it.thumbnailSize, thumbnailFileSize)
                            }else{
                                set(it.status, FileStatus.READY_WITHOUT_THUMBNAIL)
                            }
                            set(it.resolutionWidth, resolutionWidth)
                            set(it.resolutionHeight, resolutionHeight)
                        }
                    }

                    val importImageIds = data.db.from(ImportImages)
                        .select(ImportImages.id)
                        .where { ImportImages.fileId eq fileRecord.id }
                        .map { it[ImportImages.id]!! }
                    for (importImageId in importImageIds) {
                        bus.emit(ImportUpdated(importImageId, generalUpdated = false, thumbnailFileReady = true))
                    }

                    Thread.sleep(GENERATE_INTERVAL)
                }
            }
        }catch (e: Exception) {
            log.error("Error occurred in thumbnail task of file $fileId.", e)
        }finally{
            //即使报告错误，也会将它从队列移除
            thumbnailQueue.remove(fileId)
        }
    }

    private fun fingerprintDaemon() {
        if(fingerprintQueue.isEmpty()) {
            synchronized(this) {
                if(fingerprintQueue.isEmpty()) {
                    fingerprintTask.stop()
                    return
                }
            }
        }
        if(!appdata.storagePathAccessor.accessible) {
            log.warn("File storage path ${appdata.storagePathAccessor.storageDir} is not accessible. Fingerprint generator is paused.")
            return
        }

        val fileId = fingerprintQueue.first()

        try {
            val fileRecord = data.db.sequenceOf(FileRecords).firstOrNull { it.id eq fileId }
            if(fileRecord != null && fileRecord.status == FileStatus.NOT_READY) {
                val filepath = generateFilepath(fileRecord.folder, fileRecord.id, fileRecord.extension)
                val file = File("${appdata.storagePathAccessor.storageDir}/$filepath")
                if(file.exists()) {
                    val result = try { Similarity.process(file) }catch (e: BusinessException) {
                        if(e.exception is IllegalFileExtensionError) {
                            //忽略文件类型不支持的错误，且不生成指纹，直接退出
                            null
                        }else{
                            throw e
                        }
                    }

                    if(result != null) data.db.transaction {
                        data.db.insert(FileFingerprints) {
                            set(it.fileId, fileRecord.id)
                            set(it.createTime, DateTime.now())
                            set(it.pHashSimple, result.pHashSimple)
                            set(it.dHashSimple, result.dHashSimple)
                            set(it.pHash, result.pHash)
                            set(it.dHash, result.dHash)
                        }

                        data.db.update(FileRecords) {
                            where { it.id eq fileRecord.id }
                            set(it.fingerStatus, FingerprintStatus.READY)
                        }
                    }

                    Thread.sleep(GENERATE_INTERVAL)
                }
            }
        }catch (e: Exception) {
            log.error("Error occurred in fingerprint task of file $fileId.", e)
        }finally{
            //即使报告错误，也会将它从队列移除
            fingerprintQueue.remove(fileId)
        }
    }

    private fun processThumbnail(fileRecord: FileRecord, file: File): Triple<Long?, Int, Int> {
        val (tempFile, resolutionWidth, resolutionHeight) = Graphics.process(file)
        return if(tempFile != null) {
            val thumbnailFilepath = generateThumbnailFilepath(fileRecord.folder, fileRecord.id)
            val thumbnailFile = File("${appdata.storagePathAccessor.storageDir}/$thumbnailFilepath")
            try {
                tempFile.copyTo(thumbnailFile, overwrite = true)
                Triple(thumbnailFile.length(), resolutionWidth, resolutionHeight)
            } catch (e: Exception) {
                thumbnailFile.deleteIfExists()
                throw e
            } finally {
                tempFile.deleteIfExists()
            }
        }else{
            Triple(null, resolutionWidth, resolutionHeight)
        }
    }
}