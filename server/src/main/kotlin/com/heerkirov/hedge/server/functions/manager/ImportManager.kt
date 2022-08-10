package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.ImportOption
import com.heerkirov.hedge.server.dao.ImportImages
import com.heerkirov.hedge.server.exceptions.BaseException
import com.heerkirov.hedge.server.exceptions.BusinessException
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.utils.DateTime
import com.heerkirov.hedge.server.utils.DateTime.asZonedTime
import com.heerkirov.hedge.server.utils.DateTime.parseDateTime
import com.heerkirov.hedge.server.utils.DateTime.toMillisecond
import com.heerkirov.hedge.server.utils.runIf
import org.ktorm.dsl.insertAndGenerateKey
import java.io.File
import java.nio.file.Files
import java.nio.file.attribute.BasicFileAttributes

class ImportManager(private val data: DataRepository, private val importMetaManager: ImportMetaManager) {
    /**
     * 创建一条新的import记录。
     * 在此方法中进行source analyse时，分析过程抛出的异常会被捕获，并以警告的形式返回。
     * @return (import image id, warnings)
     */
    fun newImportRecord(fileId: Int, sourceFile: File? = null, sourceFilename: String? = null): Pair<Int, List<BaseException<*>>> {
        val options = data.setting.import

        val attr = sourceFile?.let { Files.readAttributes(it.toPath(), BasicFileAttributes::class.java) }

        val fileImportTime = DateTime.now()
        val fileCreateTime = attr?.creationTime()?.toMillis()?.parseDateTime()
        val fileUpdateTime = sourceFile?.lastModified()?.parseDateTime()

        val orderTime = when(options.setOrderTimeBy) {
            ImportOption.TimeType.CREATE_TIME -> fileCreateTime ?: fileImportTime
            ImportOption.TimeType.UPDATE_TIME -> fileUpdateTime ?: fileImportTime
            ImportOption.TimeType.IMPORT_TIME -> fileImportTime
        }

        val partitionTime = orderTime
            .runIf(options.setPartitionTimeDelay != null && options.setPartitionTimeDelay!!!= 0L) { (this.toMillisecond() - options.setPartitionTimeDelay!!).parseDateTime() }
            .asZonedTime().toLocalDate()

        val fileName = sourceFilename ?: sourceFile?.name
        val filePath = sourceFile?.absoluteFile?.parent

        val warnings = mutableListOf<BaseException<*>>()

        val (sourceSite, sourceId, sourcePart) = if(options.autoAnalyseSourceData) {
            try {
                importMetaManager.analyseSourceMeta(fileName)
            }catch (e: BusinessException) {
                warnings.add(e.exception)
                Triple(null, null, null)
            }
        }else Triple(null, null, null)

        val tagme = Illust.Tagme.EMPTY.runIf<Illust.Tagme>(options.setTagmeOfTag) {
            this + Illust.Tagme.TAG + Illust.Tagme.AUTHOR + Illust.Tagme.TOPIC
        }.runIf(sourceSite == null && options.setTagmeOfSource) {
            this + Illust.Tagme.SOURCE
        }

        val id = data.db.insertAndGenerateKey(ImportImages) {
            set(it.fileId, fileId)
            set(it.fileName, fileName)
            set(it.filePath, filePath)
            set(it.fileCreateTime, fileCreateTime)
            set(it.fileUpdateTime, fileUpdateTime)
            set(it.fileImportTime, fileImportTime)
            set(it.tagme, tagme)
            set(it.sourceSite, sourceSite)
            set(it.sourceId, sourceId)
            set(it.sourcePart, sourcePart)
            set(it.partitionTime, partitionTime)
            set(it.orderTime, orderTime.toMillisecond())
            set(it.createTime, fileImportTime)
        } as Int

        return Pair(id, warnings)
    }
}