package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dao.FileRecords
import com.heerkirov.hedge.server.dao.FolderImageRelations
import com.heerkirov.hedge.server.dao.Folders
import com.heerkirov.hedge.server.dao.Illusts
import com.heerkirov.hedge.server.dto.filter.FolderImagesFilter
import com.heerkirov.hedge.server.dto.filter.FolderQueryFilter
import com.heerkirov.hedge.server.dto.filter.FolderTreeFilter
import com.heerkirov.hedge.server.dto.form.*
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.FolderType
import com.heerkirov.hedge.server.events.*
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.kit.FolderKit
import com.heerkirov.hedge.server.functions.manager.IllustManager
import com.heerkirov.hedge.server.model.Folder
import com.heerkirov.hedge.server.utils.business.takeAllFilepath
import com.heerkirov.hedge.server.utils.DateTime
import com.heerkirov.hedge.server.utils.DateTime.parseDateTime
import com.heerkirov.hedge.server.utils.applyIf
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.first
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.tuples.Tuple3
import com.heerkirov.hedge.server.utils.types.*
import org.ktorm.dsl.*
import org.ktorm.entity.*

class FolderService(private val data: DataRepository,
                    private val bus: EventBus,
                    private val kit: FolderKit,
                    private val illustManager: IllustManager) {
    private val orderTranslator = OrderTranslator {
        "id" to Folders.id
        "ordinal" to Folders.ordinal
        "title" to Folders.title
        "createTime" to Folders.createTime
        "updateTime" to Folders.updateTime
    }

    private val imagesOrderTranslator = OrderTranslator {
        "id" to Illusts.id
        "score" to Illusts.exportedScore
        "ordinal" to FolderImageRelations.ordinal
        "orderTime" to Illusts.orderTime
        "createTime" to Illusts.createTime
        "updateTime" to Illusts.updateTime
    }

    fun list(filter: FolderQueryFilter): ListResult<FolderRes> {
        return data.db.from(Folders).select()
            .whereWithConditions {
                it += Folders.type notEq FolderType.NODE
                if(filter.search != null) {
                    it += Folders.title like "%${filter.search}%"
                }
            }
            .limit(filter.offset, filter.limit)
            .orderBy(orderTranslator, filter.order, default = ascendingOrderItem("ordinal"))
            .toListResult {
                val id = it[Folders.id]!!
                val title = it[Folders.title]!!
                val parentId = it[Folders.parentId]
                val parentAddress = it[Folders.parentAddress] ?: emptyList()
                val type = it[Folders.type]!!
                val pinned = it[Folders.pin] != null
                val imageCount = it[Folders.cachedCount]
                val createTime = it[Folders.createTime]!!
                val updateTime = it[Folders.updateTime]!!
                FolderRes(id, title, parentId, parentAddress, type, imageCount, pinned, createTime, updateTime)
            }
    }

    fun tree(filter: FolderTreeFilter): List<FolderTreeNode> {
        val records = data.db.sequenceOf(Folders).asKotlinSequence().groupBy { it.parentId }

        fun generateNodeList(key: Int?): List<FolderTreeNode>? = records[key]
            ?.sortedBy { it.ordinal }
            ?.map { FolderTreeNode(it.id, it.title, it.type, it.cachedCount, it.pin != null, it.createTime, it.updateTime, generateNodeList(it.id)) }

        return generateNodeList(filter.parent) ?: emptyList()
    }

    /**
     * @throws AlreadyExists ("Folder", "name", string) 此名称的folder已存在
     * @throws ResourceNotExist ("images", number[]) 给出的images不存在。给出不存在的image id列表
     * @throws ResourceNotExist ("parentId", number) 给出的parentId不存在
     * @throws ResourceNotSuitable ("parentId", number) 给出的parentId不适用，它不是NODE类型
     */
    fun create(form: FolderCreateForm): Int {
        data.db.transaction {
            kit.validateTitle(form.title)
            //相同节点下的title重名检查
            if(data.db.sequenceOf(Folders).any {
                if(form.parentId != null) { it.parentId eq form.parentId }else{ it.parentId.isNull() } and (it.title eq form.title)
            }) throw be(AlreadyExists("Folder", "title", form.title))

            val images = if(form.type == FolderType.FOLDER) {
                if(!form.images.isNullOrEmpty()) illustManager.unfoldImages(form.images) else emptyList()
            }else null

            val parent = form.parentId?.let { parentId ->
                val p = data.db.sequenceOf(Folders).firstOrNull { it.id eq parentId } ?: throw be(ResourceNotExist("parentId", parentId))
                if(p.type !== FolderType.NODE) throw be(ResourceNotSuitable("parentId", parentId))
                p
            }
            val parentAddress = parent?.let {
                (it.parentAddress ?: emptyList()) + it.title
            }
            val countInParent by lazy {
                data.db.sequenceOf(Folders)
                    .filter { if(form.parentId != null) { Folders.parentId eq form.parentId }else{ Folders.parentId.isNull() } }
                    .count()
            }
            //未指定ordinal时，将其排在序列的末尾，相当于当前的序列长度
            //已指定ordinal时，按照指定的ordinal排序，并且不能超出[0, count]的范围
            val ordinal = if(form.ordinal == null) countInParent else when {
                form.ordinal <= 0 -> 0
                form.ordinal >= countInParent -> countInParent
                else -> form.ordinal
            }.also { ordinal ->
                data.db.update(Folders) {
                    //同parent下，ordinal>=newOrdinal的那些folder，向后顺延一位
                    where { if(form.parentId != null) { Folders.parentId eq form.parentId }else{ Folders.parentId.isNull() } and (it.ordinal greaterEq ordinal) }
                    set(it.ordinal, it.ordinal + 1)
                }
            }

            val createTime = DateTime.now()

            val id = data.db.insertAndGenerateKey(Folders) {
                set(it.title, form.title)
                set(it.type, form.type)
                set(it.parentId, form.parentId)
                set(it.parentAddress, parentAddress)
                set(it.ordinal, ordinal)
                set(it.pin, null)
                set(it.cachedCount, images?.size)
                set(it.createTime, createTime)
                set(it.updateTime, createTime)
            } as Int

            if(images != null) kit.updateSubImages(id, images.map { it.id })

            bus.emit(FolderCreated(id, form.type))

            return id
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun get(id: Int): FolderRes {
        val row = data.db.from(Folders)
            .select()
            .where { Folders.id eq id }
            .firstOrNull()
            ?: throw be(NotFound())

        val title = row[Folders.title]!!
        val parentId = row[Folders.parentId]
        val parentAddress = row[Folders.parentAddress] ?: emptyList()
        val type = row[Folders.type]!!
        val pinned = row[Folders.pin] != null
        val imageCount = row[Folders.cachedCount]
        val createTime = row[Folders.createTime]!!
        val updateTime = row[Folders.updateTime]!!
        return FolderRes(id, title, parentId, parentAddress, type, imageCount, pinned, createTime, updateTime)
    }

    /**
     * @throws NotFound 请求对象不存在
     * @throws AlreadyExists ("Folder", "name", string) 此名称的folder已存在
     * @throws ResourceNotExist ("parentId", number) parentId不存在
     * @throws ResourceNotSuitable ("parentId", number) parentId适用，它不是NODE类型
     * @throws RecursiveParentError parent存在闭环
     */
    fun update(id: Int, form: FolderUpdateForm) {
        data.db.transaction {
            val folder = data.db.sequenceOf(Folders).firstOrNull { it.id eq id } ?: throw be(NotFound())

            form.title.letOpt { kit.validateTitle(it) }

            val (newParentId, newParentAddress, newOrdinal) = if(form.parentId.isPresent && form.parentId.value != folder.parentId) {
                //parentId发生了变化
                val newParentId = form.parentId.value

                //闭环和可用性检查
                if(newParentId != null) {
                    tailrec fun recursiveCheckParent(id: Int, chains: Set<Int>) {
                        if(id in chains) {
                            //在过去经历过的parent中发现了重复的id，判定存在闭环
                            throw be(RecursiveParentError())
                        }
                        val parent = data.db.from(Folders)
                            .select(Folders.parentId, Folders.type)
                            .where { Folders.id eq id }
                            .limit(0, 1)
                            .map { Pair(it[Folders.parentId], it[Folders.type]!!) }
                            .firstOrNull() //检查parent是否存在
                            ?: throw be(ResourceNotExist("parentId", newParentId))
                        val parentId = parent.first
                        if(parent.second != FolderType.NODE) throw be(ResourceNotSuitable("parentId", newParentId))
                        if(parentId != null) recursiveCheckParent(parentId, chains + id)
                    }

                    recursiveCheckParent(newParentId, setOf(id))
                }

                //调整旧的parent下的元素顺序
                data.db.update(Folders) {
                    where { if(folder.parentId != null) { Folders.parentId eq folder.parentId }else{ Folders.parentId.isNull() } and (it.ordinal greater folder.ordinal) }
                    set(it.ordinal, it.ordinal - 1)
                }

                val countInNewParent = data.db.sequenceOf(Folders)
                    .filter { if(newParentId != null) { Folders.parentId eq newParentId }else{ Folders.parentId.isNull() } }
                    .count()

                val parentAddress = if(newParentId != null) {
                    data.db.from(Folders).select(Folders.parentAddress, Folders.title)
                        .where { Folders.id eq newParentId }
                        .first()
                        .let { (it[Folders.parentAddress] ?: emptyList()) + it[Folders.title]!! }
                }else null

                Tuple3(optOf(newParentId), optOf(parentAddress), if(form.ordinal.isPresent) {
                    //指定了新的ordinal
                    val newOrdinal = if (form.ordinal.value > countInNewParent) countInNewParent else form.ordinal.value

                    data.db.update(Folders) {
                        where { if(newParentId != null) { Folders.parentId eq newParentId }else{ Folders.parentId.isNull() } and (it.ordinal greaterEq newOrdinal) }
                        set(it.ordinal, it.ordinal + 1)
                    }
                    optOf(newOrdinal)
                }else{
                    //没有指定新ordinal，追加到末尾
                    optOf(countInNewParent)
                })
            }else{
                //parentId没有变化，只在当前范围内变动
                Tuple3(undefined(), undefined(), if(form.ordinal.isUndefined || form.ordinal.value == folder.ordinal) undefined() else {
                    //ordinal发生了变化
                    val countInParent = data.db.sequenceOf(Folders)
                        .filter { if(folder.parentId != null) { Folders.parentId eq folder.parentId }else{ Folders.parentId.isNull() } }
                        .count()
                    val newOrdinal = if (form.ordinal.value > countInParent) countInParent else form.ordinal.value
                    if(newOrdinal > folder.ordinal) {
                        //插入位置在原位置之后时，实际上会使夹在中间的项前移，为了保证插入顺位与想要的顺位保持不变，因此final ordinal位置是要-1的。
                        data.db.update(Folders) {
                            where { if(folder.parentId != null) { Folders.parentId eq folder.parentId }else{ Folders.parentId.isNull() } and (it.ordinal greater folder.ordinal) and (it.ordinal lessEq (newOrdinal - 1)) }
                            set(it.ordinal, it.ordinal - 1)
                        }
                        optOf(newOrdinal - 1)
                    }else{
                        //插入位置在原位置之前，则不需要final ordinal变更
                        data.db.update(Folders) {
                            where { if(folder.parentId != null) { Folders.parentId eq folder.parentId }else{ Folders.parentId.isNull() } and (it.ordinal greaterEq newOrdinal) and (it.ordinal less folder.ordinal) }
                            set(it.ordinal, it.ordinal + 1)
                        }
                        optOf(newOrdinal)
                    }
                })
            }

            applyIf(form.title.isPresent || form.parentId.isPresent) {
                //name/parentId的变化会触发重名检查
                val title = form.title.unwrapOr { folder.title }
                val parentId = newParentId.unwrapOr { folder.parentId }
                //相同节点下禁止重名
                if(data.db.sequenceOf(Folders).any {
                    if(parentId != null) { it.parentId eq parentId }else{ it.parentId.isNull() } and (it.title eq title) and (it.id notEq folder.id)
                }) throw be(AlreadyExists("Folder", "title", title))
            }

            applyIf(form.title.isPresent || newParentAddress.isPresent) {
                //name/parentAddress的变化会修改下属节点的parentAddress
                val title = form.title.unwrapOr { folder.title }
                val parentAddress = newParentAddress.unwrapOr { folder.parentAddress }
                val childrenParentAddress = (parentAddress ?: emptyList()) + title

                fun recursiveUpdateAddress(parentId: Int, parentAddress: List<String>) {
                    val children = data.db.from(Folders).select(Folders.id, Folders.title)
                        .where { Folders.parentId eq parentId }
                        .map { Pair(it[Folders.id]!!, it[Folders.title]!!) }
                    if(children.isNotEmpty()) {
                        data.db.update(Folders) {
                            where { it.parentId eq parentId }
                            set(it.parentAddress, parentAddress)
                        }
                        children.forEach { child -> recursiveUpdateAddress(child.first, parentAddress + child.second) }
                    }
                }

                recursiveUpdateAddress(id, childrenParentAddress)
            }

            if(anyOpt(form.title, newParentId, newParentAddress, newOrdinal)) {
                data.db.update(Folders) {
                    where { it.id eq id }
                    form.title.applyOpt { set(it.title, this) }
                    newParentId.applyOpt { set(it.parentId, this) }
                    newParentAddress.applyOpt { set(it.parentAddress, this) }
                    newOrdinal.applyOpt { set(it.ordinal, this) }
                }

                bus.emit(FolderUpdated(id, folder.type))
            }
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun delete(id: Int) {
        fun recursiveDelete(folder: Folder) {
            data.db.delete(Folders) { it.id eq folder.id }
            data.db.delete(FolderImageRelations) { it.folderId eq folder.id }

            bus.emit(FolderDeleted(folder.id, folder.type))
            //删除folder时，也需要发送pinChanged事件
            if(folder.pin != null) bus.emit(FolderPinChanged(folder.id, false, null))

            val children = data.db.sequenceOf(Folders).filter { it.parentId eq folder.id }
            for (child in children) {
                recursiveDelete(child)
            }
        }
        data.db.transaction {
            val folder = data.db.sequenceOf(Folders).firstOrNull { it.id eq id } ?: throw be(NotFound())

            //删除folder时，处理后面邻近记录ordinal
            data.db.update(Folders) {
                where { if(folder.parentId != null) { it.parentId eq folder.parentId }else{ it.parentId.isNull() } and (it.ordinal greater folder.ordinal) }
                set(it.ordinal, it.ordinal - 1)
            }
            recursiveDelete(folder)
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     * @throws Reject 不能访问NODE类型的images
     */
    fun getImages(id: Int, filter: FolderImagesFilter): ListResult<FolderImageRes> {
        val row = data.db.from(Folders).select(Folders.type).where { Folders.id eq id }.firstOrNull() ?: throw be(NotFound())

        return when(row[Folders.type]!!) {
            FolderType.FOLDER -> getSubItemImages(id, filter)
            FolderType.NODE -> throw be(Reject("Cannot access images of NODE."))
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     * @throws Reject 只能给FOLDER更新项目内容
     * @throws ResourceNotExist ("images", number[]) 给出的images不存在。给出不存在的image id列表
     */
    fun updateImages(id: Int, items: List<Int>) {
        data.db.transaction {
            val folder = data.db.sequenceOf(Folders).firstOrNull { Folders.id eq id } ?: throw be(NotFound())
            if(folder.type !== FolderType.FOLDER) throw be(Reject("Can only update images for FOLDER."))

            val images = if(items.isNotEmpty()) illustManager.unfoldImages(items) else emptyList()
            val imageIds = images.map { it.id }

            data.db.update(Folders) {
                where { it.id eq id }
                set(it.cachedCount, images.size)
                set(it.updateTime, DateTime.now())
            }

            val oldIdSet = kit.updateSubImages(id, imageIds).toSet()
            val imageIdSet = imageIds.toSet()

            bus.emit(FolderImagesChanged(id, (imageIdSet - oldIdSet).toList(), emptyList(), (oldIdSet - imageIdSet).toList()))
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     * @throws Reject 只能给FOLDER更新项目内容
     * @throws ResourceNotExist ("images", number[]) 给出的images不存在。给出不存在的image id列表
     */
    fun partialUpdateImages(id: Int, form: FolderImagesPartialUpdateForm) {
        data.db.transaction {
            val folder = data.db.sequenceOf(Folders).firstOrNull { Folders.id eq id } ?: throw be(NotFound())
            if(folder.type !== FolderType.FOLDER) throw be(Reject("Can only update images for FOLDER."))

            when (form.action) {
                BatchAction.ADD -> {
                    //添加新项目。添加时，结果按照表单的列表顺序排序。
                    //也可以用来移动已存在的项目。
                    val formImages = form.images ?: throw be(ParamRequired("images"))
                    val images = illustManager.unfoldImages(formImages)
                    if(images.isNotEmpty()) {
                        val imageIds = images.map { it.id }
                        val imageCount = kit.upsertSubImages(id, imageIds, form.ordinal)
                        data.db.update(Folders) {
                            where { it.id eq id }
                            set(it.cachedCount, imageCount)
                            set(it.updateTime, DateTime.now())
                        }

                        bus.emit(FolderImagesChanged(id, imageIds, emptyList(), emptyList()))
                    }
                }
                BatchAction.MOVE -> {
                    //移动现存的项目。被移动的项目之间仍保持ordinal的顺序挪到新位置。
                    //不能用来添加新项目，会被忽略。
                    val formImages = form.images ?: throw be(ParamRequired("images"))
                    if(formImages.isNotEmpty()) {
                        kit.moveSubImages(id, formImages, form.ordinal)
                        data.db.update(Folders) {
                            where { it.id eq id }
                            set(it.updateTime, DateTime.now())
                        }

                        bus.emit(FolderImagesChanged(id, emptyList(), formImages, emptyList()))
                    }
                }
                BatchAction.DELETE -> {
                    val formImages = form.images ?: throw be(ParamRequired("images"))
                    if(formImages.isNotEmpty()) {
                        val imageCount = kit.deleteSubImages(id, formImages)
                        data.db.update(Folders) {
                            where { it.id eq id }
                            if(imageCount != null) set(it.cachedCount, imageCount)
                            set(it.updateTime, DateTime.now())
                        }

                        bus.emit(FolderImagesChanged(id, emptyList(), emptyList(), formImages))
                    }
                }
            }
        }
    }

    fun getPinFolders(): List<FolderSimpleRes> {
        return data.db.from(Folders).select(Folders.id, Folders.title, Folders.parentAddress, Folders.type)
            .where { Folders.pin.isNotNull() and (Folders.type notEq FolderType.NODE) }
            .orderBy(Folders.pin.asc())
            .map { FolderSimpleRes(it[Folders.id]!!, (it[Folders.parentAddress] ?: emptyList()) + it[Folders.title]!!, it[Folders.type]!!) }
    }

    /**
     * @throws NotFound 请求对象不存在
     * @throws Reject 不能为NODE设置pin
     */
    fun updatePinFolder(id: Int, form: FolderPinForm) {
        data.db.transaction {
            val folder = data.db.sequenceOf(Folders).firstOrNull { it.id eq id } ?: throw be(NotFound())
            if(folder.type == FolderType.NODE) throw be(Reject("Cannot pin NODE."))
            if((form.ordinal == null && folder.pin != null) || (form.ordinal != null && folder.pin == form.ordinal)) return

            val count = data.db.sequenceOf(Folders).count { it.pin.isNotNull() }
            if(folder.pin == null) {
                //insert
                val ordinal = if(form.ordinal != null && form.ordinal < count) form.ordinal else count

                data.db.update(Folders) {
                    where { it.pin.isNotNull() and (it.pin greaterEq ordinal) }
                    set(it.pin, it.pin plus 1)
                }
                data.db.update(Folders) {
                    where { it.id eq id }
                    set(it.pin, ordinal)
                }

                bus.emit(FolderPinChanged(id, true, ordinal))
            }else{
                //update
                val ordinal = if(form.ordinal!! < count) form.ordinal else count

                val finalOrdinal = if(ordinal > folder.ordinal) {
                    //移动pin时存在和移动位置一样的问题，因此在向后移动时也要使实际位置-1。
                    data.db.update(Folders) {
                        where { it.pin.isNotNull() and (it.pin greater folder.ordinal) and (it.pin lessEq (ordinal - 1)) }
                        set(it.pin, it.pin minus 1)
                    }
                    ordinal - 1
                }else{
                    data.db.update(Folders) {
                        where { it.pin.isNotNull() and (it.pin greaterEq ordinal) and (it.pin less folder.ordinal) }
                        set(it.pin, it.pin plus 1)
                    }
                    ordinal
                }
                data.db.update(Folders) {
                    where { it.id eq id }
                    set(it.pin, finalOrdinal)
                }

                bus.emit(FolderPinChanged(id, true, finalOrdinal))
            }
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     * @throws Reject 不能为NODE设置unpin
     */
    fun deletePinFolder(id: Int) {
        data.db.transaction {
            val folder = data.db.sequenceOf(Folders).firstOrNull { it.id eq id } ?: throw be(NotFound())
            if(folder.type == FolderType.NODE) throw be(Reject("Cannot unpin NODE."))
            if(folder.pin == null) return

            data.db.update(Folders) {
                where { it.id eq id }
                set(it.pin, null)
            }

            bus.emit(FolderPinChanged(id, false, null))
        }
    }

    private fun getSubItemImages(id: Int, filter: FolderImagesFilter): ListResult<FolderImageRes> {
        return data.db.from(FolderImageRelations)
            .innerJoin(Illusts, FolderImageRelations.imageId eq Illusts.id)
            .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
            .select(FolderImageRelations.ordinal, Illusts.id,
                Illusts.exportedScore, Illusts.favorite, Illusts.tagme, Illusts.orderTime,
                Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart,
                FileRecords.id, FileRecords.folder, FileRecords.extension, FileRecords.status)
            .where { FolderImageRelations.folderId eq id }
            .limit(filter.offset, filter.limit)
            .orderBy(imagesOrderTranslator, filter.order)
            .toListResult {
                val ordinal = it[FolderImageRelations.ordinal]!!
                val itemId = it[Illusts.id]!!
                val score = it[Illusts.exportedScore]
                val favorite = it[Illusts.favorite]!!
                val tagme = it[Illusts.tagme]!!
                val orderTime = it[Illusts.orderTime]!!.parseDateTime()
                val (file, thumbnailFile) = takeAllFilepath(it)
                val source = it[Illusts.sourceSite]
                val sourceId = it[Illusts.sourceId]
                val sourcePart = it[Illusts.sourcePart]
                FolderImageRes(itemId, ordinal, file, thumbnailFile, score, favorite, tagme, source, sourceId, sourcePart, orderTime)
            }
    }
}