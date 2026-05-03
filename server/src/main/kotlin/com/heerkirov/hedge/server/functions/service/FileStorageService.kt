package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.FileRecords
import com.heerkirov.hedge.server.dto.filter.BlockFileListFilter
import com.heerkirov.hedge.server.dto.filter.BlockStorageListFilter
import com.heerkirov.hedge.server.dto.res.BlockFileItemRes
import com.heerkirov.hedge.server.dto.res.BlockStorageSummaryRes
import com.heerkirov.hedge.server.dto.res.ListResult
import com.heerkirov.hedge.server.enums.ArchiveType
import com.heerkirov.hedge.server.exceptions.Reject
import com.heerkirov.hedge.server.exceptions.StorageNotAccessibleError
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.utils.business.fileDedicatedThumbnailSampleFrom
import com.heerkirov.hedge.server.utils.business.filePathOrNullFrom
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.asSequence
import com.heerkirov.hedge.server.utils.ktorm.first
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.types.OrderItem
import org.ktorm.dsl.*
import java.io.File
import java.math.BigInteger
import java.time.Instant
import kotlin.math.max

class FileStorageService(private val appdata: AppDataManager, private val data: DataRepository) {

    private val blockFileOrderTranslator = OrderTranslator {
        "id" to FileRecords.id
        "fileName" to FileRecords.originFilename
        "size" to FileRecords.size
    }

    fun listBlocks(filter: BlockStorageListFilter): List<BlockStorageSummaryRes> {
        if (!appdata.storage.accessible) throw be(StorageNotAccessibleError(appdata.storage.storageDir))

        val originalRoot = originalRootDir()
        val physicalByBlock = scanOriginalBlockPhysical(originalRoot)

        val dbStats = data.db.from(FileRecords)
            .select(FileRecords.block, count(FileRecords.id).aliased("cnt"), sum(FileRecords.size).aliased("total"))
            .where { FileRecords.deleted eq false }
            .groupBy(FileRecords.block)
            .asSequence()
            .associate {
                val block = it[FileRecords.block]!!.lowercase()
                val cnt = it.getInt("cnt")
                val total = it.getLong("total")
                block to (cnt to total)
            }

        val summaries = dbStats.map { (block, pair) ->
            val (cnt, total) = pair
            val (hasZip, hasDir, lastModified) = physicalByBlock[block] ?: Triple(false, false, Instant.EPOCH)
            BlockStorageSummaryRes(
                name = block,
                fileCount = cnt,
                totalSize = total,
                hasZipFile = hasZip,
                hasDirectory = hasDir,
                lastModified = lastModified,
            )
        }

        return summaries.sortedWith(blockSummaryComparator(filter.order))
    }

    fun listBlockFiles(block: String, filter: BlockFileListFilter): ListResult<BlockFileItemRes> {
        if (!appdata.storage.accessible) throw be(StorageNotAccessibleError(appdata.storage.storageDir))

        val blockName = validateBlockName(block)
        val originalRoot = originalRootDir()
        val blockDir = File(originalRoot, blockName)
        val blockDirExists = blockDir.isDirectory

        val total = data.db.from(FileRecords)
            .select(count(FileRecords.id).aliased("cnt"))
            .where { (FileRecords.block eq blockName) and (FileRecords.deleted eq false) }
            .first()
            .getInt("cnt")

        val rows = data.db.from(FileRecords)
            .select(
                FileRecords.id, FileRecords.block, FileRecords.originFilename, FileRecords.extension, FileRecords.size,
                FileRecords.resolutionWidth, FileRecords.resolutionHeight, FileRecords.createTime, FileRecords.status,
                FileRecords.thumbnailSize, FileRecords.sampleSize)
            .where { (FileRecords.block eq blockName) and (FileRecords.deleted eq false) }
            .orderBy(blockFileOrderTranslator, filter.order, default = OrderItem("id", false))
            .limit(filter.offset, filter.limit)
            .asSequence()
            .map {
                val id = it[FileRecords.id]!!
                val extension = it[FileRecords.extension]!!
                val fileName = it[FileRecords.originFilename]!!
                val filepath = filePathOrNullFrom(it)
                val (hasThumbnail, hasSample) = fileDedicatedThumbnailSampleFrom(it)
                val inDir = if (blockDirExists) File(blockDir, "$id.$extension").isFile else false
                BlockFileItemRes(
                    id = id,
                    fileName = fileName,
                    createTime = it[FileRecords.createTime]!!,
                    size = it[FileRecords.size]!!,
                    resolutionWidth = it[FileRecords.resolutionWidth]!!,
                    resolutionHeight = it[FileRecords.resolutionHeight]!!,
                    extension = extension,
                    filepath = filepath,
                    hasThumbnail = hasThumbnail,
                    hasSample = hasSample,
                    inBlockDirectory = inDir,
                )
            }
            .toList()

        return ListResult(total, rows)
    }

    private fun originalRootDir(): File {
        return File(appdata.storage.storageDir, ArchiveType.ORIGINAL.toString())
    }

    /**
     * 单次扫描 original 根目录：每个 block 是否含 zip、是否含目录，以及 zip 与目录 lastModified 中较新者。
     * 值为 [Triple]：(hasZip, hasDirectory, lastModified)；无 zip 且无目录时 lastModified 为 [Instant.EPOCH]。
     */
    private fun scanOriginalBlockPhysical(originalRoot: File): Map<String, Triple<Boolean, Boolean, Instant>> {
        if (!originalRoot.isDirectory) return emptyMap()
        val zipLastModified = mutableMapOf<String, Long>()
        val dirLastModified = mutableMapOf<String, Long>()
        originalRoot.listFiles()?.forEach { f ->
            when {
                f.isFile && f.name.endsWith(".zip", ignoreCase = true) -> {
                    val base = f.name.removeSuffix(".zip").removeSuffix(".ZIP")
                    if (base.isBlank()) return@forEach
                    val key = base.lowercase()
                    val m = f.lastModified()
                    zipLastModified[key] = zipLastModified[key]?.let { max(it, m) } ?: m
                }
                f.isDirectory -> {
                    val key = f.name.lowercase()
                    val m = f.lastModified()
                    dirLastModified[key] = dirLastModified[key]?.let { max(it, m) } ?: m
                }
            }
        }
        return (zipLastModified.keys + dirLastModified.keys).toSet().associateWith { key ->
            val z = zipLastModified[key]
            val d = dirLastModified[key]
            Triple(
                z != null,
                d != null,
                Instant.ofEpochMilli(listOfNotNull(z, d).maxOrNull() ?: 0L),
            )
        }
    }

    private fun blockSummaryComparator(orders: List<OrderItem>?): Comparator<BlockStorageSummaryRes> {
        val seq = if (orders.isNullOrEmpty()) listOf(OrderItem("name", false)) else orders
        return Comparator { a, b ->
            for (o in seq) {
                val raw = when (o.name) {
                    "name" -> BigInteger(a.name, 16).compareTo(BigInteger(b.name, 16))
                    "fileCount" -> a.fileCount.compareTo(b.fileCount)
                    "totalSize" -> a.totalSize.compareTo(b.totalSize)
                    else -> 0
                }
                val v = if (o.desc) -raw else raw
                if (v != 0) return@Comparator v
            }
            0
        }
    }

    private fun validateBlockName(block: String): String {
        val n = block.trim().lowercase()
        if (n.isEmpty() || !blockNamePattern.matches(n)) throw be(Reject("Invalid block name."))
        return n
    }

    private val blockNamePattern = Regex("^[0-9a-f]+$", RegexOption.IGNORE_CASE)
}
