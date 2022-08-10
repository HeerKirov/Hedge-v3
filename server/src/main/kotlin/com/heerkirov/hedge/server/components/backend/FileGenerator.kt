package com.heerkirov.hedge.server.components.backend

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.components.status.AppStatusDriver
import com.heerkirov.hedge.server.dao.FileRecords
import com.heerkirov.hedge.server.enums.AppLoadStatus
import com.heerkirov.hedge.server.enums.FileStatus
import com.heerkirov.hedge.server.library.framework.StatefulComponent
import com.heerkirov.hedge.server.utils.Graphics
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

const val GENERATE_INTERVAL: Long = 200

class FileGeneratorImpl(private val appStatus: AppStatusDriver, private val appdata: AppDataManager, private val data: DataRepository) : FileGenerator {
    private val log = LoggerFactory.getLogger(FileGenerator::class.java)

    private val queue: MutableList<Int> = LinkedList()

    private val daemonTask = controlledThread(thread = ::daemonThread)

    override val isIdle: Boolean get() = !daemonTask.isAlive

    override fun load() {
        if(appStatus.status == AppLoadStatus.READY) {
            val tasks = data.db.from(FileRecords)
                .select(FileRecords.id)
                .where { FileRecords.status eq FileStatus.NOT_READY }
                .orderBy(FileRecords.updateTime.asc())
                .map { it[FileRecords.id]!! }
            if(tasks.isNotEmpty()) {
                synchronized(this) {
                    queue.addAll(tasks)
                    daemonTask.start()
                }
            }
        }
    }

    override fun appendTask(fileId: Int) {
        queue.add(fileId)
        daemonTask.start()
    }

    private fun daemonThread() {
        if(queue.isEmpty()) {
            synchronized(this) {
                if(queue.isEmpty()) {
                    daemonTask.stop()
                    return
                }
            }
        }
        if(!appdata.storagePathAccessor.accessible) {
            log.warn("File storage path ${appdata.storagePathAccessor.storageDir} is not accessible. File generator is paused.")
            return
        }

        val fileId = queue.first()

        try {
            val fileRecord = data.db.sequenceOf(FileRecords).firstOrNull { it.id eq fileId }
            if(fileRecord != null && fileRecord.status == FileStatus.NOT_READY) {
                val filepath = generateFilepath(fileRecord.folder, fileRecord.id, fileRecord.extension)
                val file = File("${appdata.storagePathAccessor.storageDir}/$filepath")
                if(file.exists()) {
                    val (tempFile, resolutionWidth, resolutionHeight) = Graphics.process(file)
                    if(tempFile != null) {
                        val thumbnailFilepath = generateThumbnailFilepath(fileRecord.folder, fileRecord.id)
                        val thumbnailFile = File("${appdata.storagePathAccessor.storageDir}/$thumbnailFilepath")
                        try {
                            tempFile.copyTo(thumbnailFile, overwrite = true)

                            data.db.transaction {
                                data.db.update(FileRecords) {
                                    where { it.id eq fileId }
                                    set(it.status, FileStatus.READY)
                                    set(it.thumbnailSize, thumbnailFile.length())
                                    set(it.resolutionWidth, resolutionWidth)
                                    set(it.resolutionHeight, resolutionHeight)
                                }
                            }

                            Thread.sleep(GENERATE_INTERVAL)
                        }catch(_: Exception) {
                            thumbnailFile.deleteIfExists()
                        }finally {
                            tempFile.deleteIfExists()
                        }
                    }else{
                        data.db.transaction {
                            data.db.update(FileRecords) {
                                where { it.id eq fileId }
                                set(it.status, FileStatus.READY_WITHOUT_THUMBNAIL)
                                set(it.resolutionWidth, resolutionWidth)
                                set(it.resolutionHeight, resolutionHeight)
                            }
                        }
                    }

                }else{
                    data.db.transaction {
                        data.db.update(FileRecords) {
                            where { it.id eq fileId }
                            set(it.status, FileStatus.READY_WITHOUT_THUMBNAIL)
                        }
                    }
                }

            }
            queue.remove(fileId)
        }catch (e: Exception) {
            log.error("Error occurred in thumbnail task of file $fileId.", e)
        }
    }
}