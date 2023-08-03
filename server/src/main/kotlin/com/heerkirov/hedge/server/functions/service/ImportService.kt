package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.backend.similar.SimilarFinder
import com.heerkirov.hedge.server.components.backend.watcher.PathWatcher
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.ImportOption
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.filter.ImportFilter
import com.heerkirov.hedge.server.dto.form.*
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.FileStatus
import com.heerkirov.hedge.server.enums.FingerprintStatus
import com.heerkirov.hedge.server.enums.FolderType
import com.heerkirov.hedge.server.enums.IllustModelType
import com.heerkirov.hedge.server.events.ImportSaved
import com.heerkirov.hedge.server.events.ImportUpdated
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.manager.*
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.model.Illust
import com.heerkirov.hedge.server.model.ImportImage
import com.heerkirov.hedge.server.utils.DateTime.parseDateTime
import com.heerkirov.hedge.server.utils.DateTime.toMillisecond
import com.heerkirov.hedge.server.utils.business.takeAllFilepathOrNull
import com.heerkirov.hedge.server.utils.business.takeThumbnailFilepath
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.escapeLike
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.runIf
import com.heerkirov.hedge.server.utils.tuples.Tuple5
import com.heerkirov.hedge.server.utils.types.anyOpt
import com.heerkirov.hedge.server.utils.types.optOf
import com.heerkirov.hedge.server.utils.types.undefined
import org.ktorm.dsl.*
import org.ktorm.entity.*

class ImportService(private val data: DataRepository,
                    private val bus: EventBus,
                    private val importManager: ImportManager,
                    private val illustManager: IllustManager,
                    private val bookManager: BookManager,
                    private val folderManager: FolderManager,
                    private val importMetaManager: ImportMetaManager,
                    private val sourceDataManager: SourceDataManager,
                    private val similarFinder: SimilarFinder,
                    private val pathWatcher: PathWatcher) {
    private val orderTranslator = OrderTranslator {
        "id" to ImportImages.id
        "fileCreateTime" to ImportImages.fileCreateTime nulls last
        "fileUpdateTime" to ImportImages.fileUpdateTime nulls last
        "fileImportTime" to ImportImages.fileImportTime
        "orderTime" to ImportImages.orderTime
    }

    fun list(filter: ImportFilter): ListResult<ImportImageRes> {
        return data.db.from(ImportImages)
            .innerJoin(FileRecords, FileRecords.id eq ImportImages.fileId)
            .select(
                ImportImages.id, ImportImages.fileName,
                ImportImages.sourceSite, ImportImages.sourceId, ImportImages.sourcePart,
                ImportImages.partitionTime, ImportImages.orderTime, ImportImages.tagme,
                FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .whereWithConditions {
                if(!filter.search.isNullOrBlank()) {
                    it += ImportImages.fileName escapeLike filter.search.split(" ").map(String::trim).filter(String::isNotEmpty).joinToString("%", "%", "%")
                }
            }
            .orderBy(orderTranslator, filter.order)
            .limit(filter.offset, filter.limit)
            .toListResult {
                val (file, thumbnailFile) = takeAllFilepathOrNull(it)
                ImportImageRes(
                    it[ImportImages.id]!!, file, thumbnailFile, it[ImportImages.fileName],
                    it[ImportImages.sourceSite], it[ImportImages.sourceId], it[ImportImages.sourcePart],
                    it[ImportImages.tagme]!!,
                    it[ImportImages.partitionTime]!!, it[ImportImages.orderTime]!!.parseDateTime())
            }
    }

    /**
     * @throws IllegalFileExtensionError (extension) 此文件扩展名不受支持
     * @throws FileNotFoundError 此文件不存在
     * @throws StorageNotAccessibleError 存储路径不可访问
     */
    fun import(form: ImportForm): Pair<Int, List<BaseException<*>>> {
        return importManager.import(form.filepath, form.mobileImport)
    }

    /**
     * @throws IllegalFileExtensionError (extension) 此文件扩展名不受支持
     * @throws StorageNotAccessibleError 存储路径不可访问
     */
    fun upload(form: UploadForm): Pair<Int, List<BaseException<*>>> {
        return importManager.upload(form.content, form.filename, form.extension)
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun get(id: Int): ImportImageDetailRes {
        val row = data.db.from(ImportImages)
            .innerJoin(FileRecords, FileRecords.id eq ImportImages.fileId)
            .select()
            .where { ImportImages.id eq id }
            .firstOrNull() ?: throw be(NotFound())

        val (file, thumbnailFile) = takeAllFilepathOrNull(row)

        val collectionId: Any? = row[ImportImages.collectionId].let {
            if(it == null) {
                null
            }else if(it.startsWith('@')) {
                it.substring(1)
            }else if(it.startsWith('#')) {
                it.substring(1).toInt()
            }else{
                it
            }
        }

        val folderIds = row[ImportImages.folderIds]
        val bookIds = row[ImportImages.bookIds]

        val books = if(bookIds.isNullOrEmpty()) emptyList() else data.db.from(Books)
            .select(Books.id, Books.title)
            .where { Books.id inList bookIds }
            .map { BookSimpleRes(it[Books.id]!!, it[Books.title]!!) }

        val folders = if(folderIds.isNullOrEmpty()) emptyList() else data.db.from(Folders)
            .select(Folders.id, Folders.title, Folders.parentAddress, Folders.type)
            .where { Folders.id inList folderIds }
            .map { FolderSimpleRes(it[Folders.id]!!, (it[Folders.parentAddress] ?: emptyList()) + it[Folders.title]!!, it[Folders.type]!!) }

        val collection = if(collectionId !is Int) null else {
            val collectionRow = data.db.from(Illusts)
                .innerJoin(FileRecords, Illusts.fileId eq FileRecords.id)
                .select(Illusts.cachedChildrenCount, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
                .where { (Illusts.type eq IllustModelType.COLLECTION) and (Illusts.id eq collectionId) }
                .firstOrNull()
            if(collectionRow == null) null else {
                val collectionThumbnailFile = takeThumbnailFilepath(collectionRow)
                val childrenCount = collectionRow[Illusts.cachedChildrenCount]!!
                IllustCollectionSimpleRes(collectionId, collectionThumbnailFile, childrenCount)
            }
        }

        return ImportImageDetailRes(
            row[ImportImages.id]!!,
            file, thumbnailFile,
            row[ImportImages.fileName], row[ImportImages.filePath],
            row[ImportImages.fileCreateTime], row[ImportImages.fileUpdateTime], row[ImportImages.fileImportTime]!!,
            row[FileRecords.extension]!!, row[FileRecords.size]!!, row[FileRecords.resolutionWidth]!!, row[FileRecords.resolutionHeight]!!,
            row[ImportImages.tagme]!!, row[ImportImages.preference] ?: ImportImage.Preference(cloneImage = null),
            collectionId, collection, folders, books,
            row[ImportImages.sourceSite], row[ImportImages.sourceId], row[ImportImages.sourcePart], row[ImportImages.sourcePreference],
            row[ImportImages.partitionTime]!!, row[ImportImages.orderTime]!!.parseDateTime(), row[ImportImages.createTime]!!
        )
    }

    /**
     * @throws NotFound 请求对象不存在
     * @throws ResourceNotExist ("site", string) 给出的site不存在
     */
    fun update(id: Int, form: ImportUpdateForm) {
        data.db.transaction {
            importManager.update(id, form)
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun delete(id: Int) {
        data.db.transaction {
            val importImage = data.db.sequenceOf(ImportImages).firstOrNull { ImportImages.id eq id } ?: throw be(NotFound())
            importManager.delete(importImage)
        }
    }

    /**
     * @throws ResourceNotExist ("target", number[]) 要进行解析的对象不存在。给出不存在的source image id列表
     * @warn InvalidRegexError (regex) 执行正则表达式时发生错误，怀疑是表达式或相关参数没写对
     */
    fun batchUpdate(form: ImportBatchUpdateForm): Map<Int, List<BaseException<*>>> {
        data.db.transaction {
            if(form.tagme != null || form.partitionTime != null || form.setCreateTimeBy != null || form.setOrderTimeBy != null || form.analyseSource
                || form.collectionId != null || !form.appendBookIds.isNullOrEmpty() || !form.appendFolderIds.isNullOrEmpty()) {
                val records = if(form.target.isNullOrEmpty()) {
                    data.db.sequenceOf(ImportImages).toList()
                }else{
                    data.db.sequenceOf(ImportImages).filter { ImportImages.id inList form.target }.toList().also { records ->
                        if(records.size < form.target.size) {
                            throw be(ResourceNotExist("target", form.target.toSet() - records.map { it.id }.toSet()))
                        }
                    }
                }

                val sourceResultMap = mutableMapOf<Int, Tuple5<String, Long?, Int?, Illust.Tagme?, ImportImage.SourcePreference?>>()
                val errors = mutableMapOf<Int, List<BaseException<*>>>()
                if(form.analyseSource) {
                    val autoSetTagmeOfSource = data.setting.import.setTagmeOfSource

                    for (record in records) {
                        val (source, sourceId, sourcePart, sourcePreference) = try {
                            importMetaManager.analyseSourceMeta(record.fileName)
                        } catch (e: BusinessException) {
                            errors[record.id] = listOf(e.exception)
                            continue
                        }
                        if (source != null) {
                            val tagme = if (autoSetTagmeOfSource && Illust.Tagme.SOURCE in record.tagme) record.tagme - Illust.Tagme.SOURCE else null
                            sourceResultMap[record.id] = Tuple5(source, sourceId, sourcePart, tagme, sourcePreference)
                        }
                    }
                }
                val newCollectionId = when (form.collectionId) {
                    null -> null
                    is String -> "@${form.collectionId}"
                    is Int -> "#${form.collectionId}"
                    else -> throw be(ParamTypeError("collectionId", "must be number or string."))
                }

                val filterCommonCondition = !form.appendFolderIds.isNullOrEmpty() || !form.appendBookIds.isNullOrEmpty() || newCollectionId != null || form.tagme != null || form.partitionTime != null || form.setCreateTimeBy != null || form.setOrderTimeBy != null

                records.asSequence()
                    .map { it to sourceResultMap[it.id] }
                    .filter { (_, src) -> filterCommonCondition || src != null }
                    .forEach { (record, src) ->
                        data.db.update(ImportImages) {
                            where { it.id eq record.id }
                            if(src != null) {
                                val (sourceSite, sourceId, sourcePart, tagme, sourcePreference) = src
                                set(it.sourceSite, sourceSite)
                                set(it.sourceId, sourceId)
                                set(it.sourcePart, sourcePart)
                                if(tagme != null && form.tagme == null) set(it.tagme, tagme)
                                if(sourcePreference != null) set(it.sourcePreference, sourcePreference)
                            }
                            if(!form.appendBookIds.isNullOrEmpty()) {
                                val bookIds = ((record.bookIds ?: emptyList()) + form.appendBookIds).distinct()
                                set(it.bookIds, bookIds)
                            }
                            if(!form.appendFolderIds.isNullOrEmpty()) {
                                val folderIds = ((record.folderIds ?: emptyList()) + form.appendFolderIds).distinct()
                                set(it.folderIds, folderIds)
                            }
                            if(newCollectionId != null) set(it.collectionId, newCollectionId)
                            if(form.tagme != null) set(it.tagme, form.tagme)
                            if(form.partitionTime != null) set(it.partitionTime, form.partitionTime)
                            if(form.setCreateTimeBy != null) set(it.createTime, when(form.setCreateTimeBy) {
                                ImportOption.TimeType.CREATE_TIME -> record.fileCreateTime ?: record.fileImportTime
                                ImportOption.TimeType.UPDATE_TIME -> record.fileUpdateTime ?: record.fileImportTime
                                ImportOption.TimeType.IMPORT_TIME -> record.fileImportTime
                            })
                            if(form.setOrderTimeBy != null) set(it.orderTime, when(form.setOrderTimeBy) {
                                ImportOption.TimeType.CREATE_TIME -> record.fileCreateTime ?: record.fileImportTime
                                ImportOption.TimeType.UPDATE_TIME -> record.fileUpdateTime ?: record.fileImportTime
                                ImportOption.TimeType.IMPORT_TIME -> record.fileImportTime
                            }.toMillisecond())
                        }

                        val listUpdated = src != null || form.tagme != null || form.partitionTime != null || form.setOrderTimeBy != null
                        val detailUpdated = listUpdated || form.setCreateTimeBy != null || !form.appendBookIds.isNullOrEmpty() || !form.appendFolderIds.isNullOrEmpty() || newCollectionId != null || anyOpt()

                        if(listUpdated || detailUpdated) {
                            bus.emit(ImportUpdated(record.id, listUpdated = listUpdated, detailUpdated = true))
                        }
                    }

                return errors
            }else{
                return emptyMap()
            }
        }
    }

    /**
     * 保存。
     * @throws ResourceNotExist ("target", number[]) 要保存的对象不存在。给出不存在的source image id列表
     * @throws NotReadyFileError 还存在文件没有准备好，因此保险起见阻止了所有的导入。
     */
    fun save(form: ImportSaveForm): ImportSaveRes {
        data.db.transaction {
            val records = data.db.from(ImportImages)
                .innerJoin(FileRecords, ImportImages.fileId eq FileRecords.id)
                .select()
                .runIf(!form.target.isNullOrEmpty()) { where { ImportImages.id inList form.target!! } }
                .map { Pair(ImportImages.createEntity(it), FileRecords.createEntity(it)) }

            if(!form.target.isNullOrEmpty() && records.size < form.target.size) throw be(ResourceNotExist("target", form.target.toSet() - records.map { it.first.id }.toSet()))

            val existedFolderIds = records.map { (r, _) -> r.folderIds ?: emptyList() }.flatten().let { li ->
                if(li.isEmpty()) emptyList() else data.db.from(Folders).select(Folders.id)
                    .where { Folders.id inList li and (Folders.type eq FolderType.FOLDER) }
                    .map { it[Folders.id]!! }
                    .toSet()
            }
            val existedBookIds = records.map { (r, _) -> r.bookIds ?: emptyList() }.flatten().let { li ->
                if(li.isEmpty()) emptyList() else data.db.from(Books).select(Books.id)
                    .where { Books.id inList li }
                    .map { it[Books.id]!! }
                    .toSet()
            }
            val existedCollectionIds = records.mapNotNull { (r, _) -> if(r.collectionId?.startsWith('#') == true) r.collectionId.substring(1).toInt() else null }.let { li ->
                if(li.isEmpty()) emptyList() else data.db.from(Illusts).select(Illusts.id)
                    .where { Illusts.id inList li and (Illusts.type eq IllustModelType.COLLECTION) }
                    .map { it[Illusts.id]!! }
                    .toSet()
            }
            val existedCloneFromIds = records.mapNotNull { (r, _) -> r.preference?.cloneImage?.fromImageId }.let { li ->
                if(li.isEmpty()) emptyList() else data.db.from(Illusts).select(Illusts.id)
                    .where { Illusts.id inList li and ((Illusts.type eq IllustModelType.IMAGE_WITH_PARENT) or (Illusts.type eq IllustModelType.IMAGE)) }
                    .map { it[Illusts.id]!! }
                    .toSet()
            }

            val errorItems = mutableListOf<ImportSaveRes.SaveErrorItem>()
            val importToImageIds = mutableMapOf<Int, Int>()

            for ((record, file) in records) {
                //首先对记录所持有的collection、book、folder信息，以及file READY状态进行检查。如果不存在，则跳过此条
                var notExistedCollectionId: Int? = null
                var notExistedBookIds: List<Int>? = null
                var notExistedFolderIds: List<Int>? = null
                var notExistedCloneFrom: Int? = null
                var fileNotReady = false

                if(record.collectionId != null && record.collectionId.startsWith('#')) {
                    val collectionId = record.collectionId.substring(1).toInt()
                    if(collectionId !in existedCollectionIds) {
                        notExistedCollectionId = collectionId
                    }
                }
                if(!record.bookIds.isNullOrEmpty() && !existedBookIds.containsAll(record.bookIds)) {
                    notExistedBookIds = record.bookIds - existedBookIds.toSet()
                }
                if(!record.folderIds.isNullOrEmpty() && !existedFolderIds.containsAll(record.folderIds)) {
                    notExistedFolderIds = record.folderIds - existedFolderIds.toSet()
                }
                if(record.preference?.cloneImage != null && record.preference.cloneImage.fromImageId !in existedCloneFromIds) {
                    notExistedCloneFrom = record.preference.cloneImage.fromImageId
                }
                if(file.status == FileStatus.NOT_READY || file.fingerStatus == FingerprintStatus.NOT_READY) {
                    fileNotReady = true
                }
                if(notExistedCollectionId != null || notExistedBookIds != null || notExistedFolderIds != null || notExistedCloneFrom != null || fileNotReady) {
                    errorItems.add(ImportSaveRes.SaveErrorItem(record.id, fileNotReady, notExistedCollectionId, notExistedCloneFrom, notExistedBookIds, notExistedFolderIds))
                    continue
                }

                // 虽然{newImage}方法会抛出很多异常，但那都与这里无关。
                // source虽然是唯一看似有关的，但通过业务逻辑限制，使得有实例的site不可能被删除。
                // 就算最后真的出了bug，抛出去当unknown error处理算了。
                val imageId = illustManager.newImage(
                    fileId = record.fileId,
                    tagme = record.tagme,
                    sourceSite = record.sourceSite,
                    sourceId = record.sourceId,
                    sourcePart = record.sourcePart,
                    partitionTime = record.partitionTime,
                    orderTime = record.orderTime,
                    createTime = record.createTime)

                importToImageIds[record.id] = imageId
            }

            records.asSequence()
                .filter { (record, _) -> record.collectionId != null && record.id in importToImageIds }
                .map { (record, _) -> record.collectionId!! to importToImageIds[record.id]!! }
                .groupBy({ it.first }) { it.second }
                .forEach { (cStr, imageIds) ->
                    if(cStr.startsWith('#')) {
                        val collectionId = cStr.substring(1).toInt()
                        val images = illustManager.unfoldImages(listOf(collectionId) + imageIds, sorted = false)
                        illustManager.updateImagesInCollection(collectionId, images)
                    }else{
                        illustManager.newCollection(imageIds, "", null, false, Illust.Tagme.EMPTY)
                    }
                }

            records.asSequence()
                .filter { (record, _) -> !record.bookIds.isNullOrEmpty() && record.id in importToImageIds }
                .map { (record, _) -> record.bookIds!!.asSequence().map { it to importToImageIds[record.id]!! } }
                .flatten()
                .groupBy({ it.first }) { it.second }
                .forEach { (bookId, imageIds) ->
                    bookManager.addImagesInBook(bookId, imageIds, ordinal = null)
                }

            records.asSequence()
                .filter { (record, _) -> !record.folderIds.isNullOrEmpty() && record.id in importToImageIds }
                .map { (record, _) -> record.folderIds!!.asSequence().map { it to importToImageIds[record.id]!! } }
                .flatten()
                .groupBy({ it.first }) { it.second }
                .forEach { (folderId, imageIds) ->
                    folderManager.addImagesInFolder(folderId, imageIds, ordinal = null)
                }

            records.asSequence()
                .filter { (record, _) -> record.preference?.cloneImage != null && record.id in importToImageIds }
                .map { (record, _) -> importToImageIds[record.id]!! to record.preference?.cloneImage!! }
                .forEach { (imageId, cloneImage) ->
                    val props = ImagePropsCloneForm.Props(
                        cloneImage.props.score,
                        cloneImage.props.favorite,
                        cloneImage.props.description,
                        cloneImage.props.tagme,
                        cloneImage.props.metaTags,
                        cloneImage.props.partitionTime,
                        cloneImage.props.orderTime,
                        cloneImage.props.collection,
                        cloneImage.props.books,
                        cloneImage.props.folders,
                        cloneImage.props.associate,
                        cloneImage.props.source
                    )
                    illustManager.cloneProps(cloneImage.fromImageId, imageId, props, cloneImage.merge, cloneImage.deleteFrom)
                }

            records.asSequence()
                .filter { (record, _) -> record.sourcePreference != null && record.sourceSite != null && record.sourceId != null && record.id in importToImageIds }
                .map { (record, _) -> Triple(record.sourceSite!!, record.sourceId!!, record.sourcePreference!!) }
                .groupBy({ (s, i, _) -> s to i }) { (_, _, p) -> p }
                .forEach { (site, sourceId), preferences ->
                    val preference = if(preferences.size == 1) preferences.first() else {
                        ImportImage.SourcePreference(
                            title = preferences.mapNotNull { it.title }.lastOrNull(),
                            description = preferences.mapNotNull { it.description }.lastOrNull(),
                            tags = preferences.flatMap { it.tags ?: emptyList() }.distinct(),
                            books = preferences.flatMap { it.books ?: emptyList() }.distinct(),
                            relations = preferences.flatMap { it.relations ?: emptyList() }.distinct(),
                            additionalInfo = preferences.flatMap { it.additionalInfo?.entries ?: emptyList() }.groupBy { it.key }.mapValues { it.value.last().value }
                        )
                    }
                    sourceDataManager.createOrUpdateSourceData(site, sourceId,
                        status = undefined(), links = undefined(),
                        title = if(preference.title != null) optOf(preference.title) else undefined(),
                        description = if(preference.description != null) optOf(preference.description) else undefined(),
                        tags = if(preference.tags.isNullOrEmpty()) undefined() else optOf(preference.tags.map {
                            SourceTagForm(it.code, if(it.name != null) optOf(it.name) else undefined(), if(it.otherName != null) optOf(it.otherName) else undefined(), if(it.type != null) optOf(it.type) else undefined())
                        }),
                        books = if(preference.books.isNullOrEmpty()) undefined() else optOf(preference.books.map {
                            SourceBookForm(it.code, if(it.title != null) optOf(it.title) else undefined(), if(it.otherTitle != null) optOf(it.otherTitle) else undefined())
                        }),
                        relations = if(!preference.relations.isNullOrEmpty()) optOf(preference.relations) else undefined(),
                        additionalInfo = if(!preference.additionalInfo.isNullOrEmpty()) optOf(preference.additionalInfo) else undefined(),
                        appendUpdate = true
                    )
                }

            if(form.target.isNullOrEmpty() && importToImageIds.size >= records.size) {
                data.db.deleteAll(ImportImages)
            }else{
                data.db.delete(ImportImages) { it.id inList importToImageIds.keys }
            }

            if(data.setting.findSimilar.autoFindSimilar) {
                similarFinder.add(FindSimilarTask.TaskSelectorOfImage(importToImageIds.values.toList()), data.setting.findSimilar.autoTaskConf ?: data.setting.findSimilar.defaultTaskConf)
            }

            bus.emit(ImportSaved(importToImageIds))

            return ImportSaveRes(importToImageIds.size, errorItems)
        }
    }

    fun getWatcherStatus(): ImportWatcherRes {
        return ImportWatcherRes(pathWatcher.isOpen, pathWatcher.statisticCount, pathWatcher.errors)
    }

    fun updateWatcherStatus(form: ImportWatcherForm) {
        pathWatcher.isOpen = form.isOpen
    }
}
