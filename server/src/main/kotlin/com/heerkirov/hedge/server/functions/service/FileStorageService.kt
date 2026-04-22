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
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.asSequence
import com.heerkirov.hedge.server.utils.ktorm.first
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.types.OrderItem
import org.ktorm.dsl.*
import java.io.File
import java.math.BigInteger

class FileStorageService(private val appdata: AppDataManager, private val data: DataRepository) {

    private val blockFileOrderTranslator = OrderTranslator {
        "id" to FileRecords.id
        "fileName" to FileRecords.originFilename
        "size" to FileRecords.size
    }

    fun listBlocks(filter: BlockStorageListFilter): List<BlockStorageSummaryRes> {
        if (!appdata.storage.accessible) throw be(StorageNotAccessibleError(appdata.storage.storageDir))

        val originalRoot = originalRootDir()
        val (zipBlocks, dirBlocks) = scanOriginalZipAndDirectoryFlags(originalRoot)

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
            BlockStorageSummaryRes(
                name = block,
                fileCount = cnt,
                totalSize = total,
                hasZipFile = block in zipBlocks,
                hasDirectory = block in dirBlocks,
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
                FileRecords.id, FileRecords.originFilename, FileRecords.extension, FileRecords.size,
                FileRecords.resolutionWidth, FileRecords.resolutionHeight, FileRecords.createTime)
            .where { (FileRecords.block eq blockName) and (FileRecords.deleted eq false) }
            .orderBy(blockFileOrderTranslator, filter.order, default = OrderItem("id", false))
            .limit(filter.offset, filter.limit)
            .asSequence()
            .map {
                val id = it[FileRecords.id]!!
                val extension = it[FileRecords.extension]!!
                val fileName = it[FileRecords.originFilename]!!
                val inDir = if (blockDirExists) File(blockDir, "$id.$extension").isFile else false
                BlockFileItemRes(
                    id = id,
                    fileName = fileName,
                    createTime = it[FileRecords.createTime]!!,
                    size = it[FileRecords.size]!!,
                    resolutionWidth = it[FileRecords.resolutionWidth]!!,
                    resolutionHeight = it[FileRecords.resolutionHeight]!!,
                    extension = extension,
                    inBlockDirectory = inDir,
                )
            }
            .toList()

        return ListResult(total, rows)
    }

    private fun originalRootDir(): File {
        return File(appdata.storage.storageDir, ArchiveType.ORIGINAL.toString())
    }

    private fun scanOriginalZipAndDirectoryFlags(originalRoot: File): Pair<Set<String>, Set<String>> {
        if (!originalRoot.isDirectory) return Pair(emptySet(), emptySet())
        val zipBlocks = mutableSetOf<String>()
        val dirBlocks = mutableSetOf<String>()
        originalRoot.listFiles()?.forEach { f ->
            when {
                f.isFile && f.name.endsWith(".zip", ignoreCase = true) -> {
                    val base = f.name.removeSuffix(".zip").removeSuffix(".ZIP")
                    if (base.isNotBlank()) zipBlocks += base.lowercase()
                }
                f.isDirectory -> dirBlocks += f.name.lowercase()
            }
        }
        return Pair(zipBlocks, dirBlocks)
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
