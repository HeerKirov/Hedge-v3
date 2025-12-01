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
import com.heerkirov.hedge.server.enums.IllustType
import com.heerkirov.hedge.server.events.*
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.kit.FolderKit
import com.heerkirov.hedge.server.functions.manager.FolderManager
import com.heerkirov.hedge.server.functions.manager.IllustManager
import com.heerkirov.hedge.server.utils.business.filePathFrom
import com.heerkirov.hedge.server.utils.DateTime.toInstant
import com.heerkirov.hedge.server.utils.applyIf
import com.heerkirov.hedge.server.utils.business.sourcePathOf
import com.heerkirov.hedge.server.utils.business.toListResult
import com.heerkirov.hedge.server.utils.duplicateCount
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.first
import com.heerkirov.hedge.server.utils.ktorm.firstOrNull
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.tuples.Tuple3
import com.heerkirov.hedge.server.utils.types.*
import org.ktorm.dsl.*
import org.ktorm.entity.*
import java.time.Instant

class FolderService(private val data: DataRepository,
                    private val bus: EventBus,
                    private val kit: FolderKit,
                    private val folderManager: FolderManager,
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

            val createTime = Instant.now()

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

            val verifyId = data.db.from(Folders).select(max(Folders.id).aliased("id")).first().getInt("id")
            if(verifyId != id) {
                throw RuntimeException("Folder insert failed. generatedKey is $id but queried verify id is $verifyId.")
            }

            if(images != null) kit.updateSubImages(id, images.map { it.id })

            bus.emit(FolderCreated(id, form.type))
            images?.forEach { bus.emit(IllustRelatedItemsUpdated(it.id, IllustType.IMAGE, folderUpdated = true)) }

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
     * @throws AlreadyExists ("Folder", "name", string) 此名称的folder已存在
     * @throws ResourceNotExist ("target", number[]) folderId不存在
     * @throws ResourceNotSuitable ("parentId", number) parentId适用，它不是NODE类型
     * @throws RecursiveParentError parent存在闭环
     */
    fun batchUpdate(form: FolderBatchUpdateForm) {
        data.db.transaction {
            val target = data.db.sequenceOf(Folders).filter { it.id inList form.target }.toList().also { records ->
                if(records.size < form.target.size) {
                    throw be(ResourceNotExist("target", form.target.toSet() - records.map { it.id }.toSet()))
                }
            }

            if(form.parentId.isPresent) {
                val newParentId = form.parentId.value
                val newParent = if(newParentId != null) data.db.sequenceOf(Folders).filter { it.id eq newParentId }.firstOrNull() ?: throw be(ResourceNotExist("parentId", newParentId)) else null
                if(newParent != null) {
                    //可用性检查
                    if(newParent.type != FolderType.NODE) throw be(ResourceNotSuitable("parentId", newParentId))
                    //闭环检查，从parentId开始上溯，只要发现target中的节点，则判定存在闭环
                    //需要注意的是，闭环检查是从parentId的parent开始的，因此允许parentID本身存在于选择项之中
                    if(newParent.parentId != null) {
                        tailrec fun recursiveCheckParent(id: Int) {
                            if(id in form.target) {
                                //发现了重复的id，判定存在闭环
                                throw be(RecursiveParentError())
                            }
                            val parent = data.db.from(Folders)
                                .select(Folders.parentId)
                                .where { Folders.id eq id }
                                .limit(0, 1)
                                .map { it[Folders.parentId] }
                                .firstOrNull() //检查parent是否存在
                            if(parent != null) recursiveCheckParent(parent)
                        }

                        recursiveCheckParent(newParent.parentId)
                    }
                }

                //冗余项检查。target项中，为其他target项的子项的，或者就是parentId本身的，从列表中排除
                val filteredTarget = target.filter {
                    tailrec fun recursiveCheckParent(id: Int): Boolean {
                        val parent = data.db.from(Folders)
                            .select(Folders.parentId)
                            .where { Folders.id eq id }
                            .limit(0, 1)
                            .map { row -> row[Folders.parentId] }
                            .firstOrNull() //检查parent是否存在
                        return if (parent == null) true
                        else if(target.any { t -> t.id == parent }) false
                        else recursiveCheckParent(parent)
                    }

                    if(it.id == newParentId) false else recursiveCheckParent(it.id)
                }

                //重名检查。过滤后的target项与现存于parent下的项不能有任何名称相同
                val currentChildren = data.db.sequenceOf(Folders).filter { if(newParentId != null) { it.parentId eq newParentId }else{ it.parentId.isNull() } }.sortedBy { it.ordinal }.toList()
                val existingItems = currentChildren.filter { it.id in filteredTarget.map { t -> t.id } }
                val notExistingItems = filteredTarget.filter { it.id !in existingItems.map { e -> e.id } }
                val duplicateCount = (notExistingItems + currentChildren).map { it.title }.duplicateCount().filterValues { it > 1 }
                if(duplicateCount.isNotEmpty()) throw be(AlreadyExists("Folder", "title", duplicateCount.keys.first()))

                //开始迁移项的位置
                //第一步:将原本就在当前parent节点下的节点抽离出来,将其他子项的ordinal向前递推

                if(existingItems.isNotEmpty()) {
                    //对于每个要移除的项,将其后面的ordinal都减1
                    for (item in existingItems) {
                        data.db.update(Folders) {
                            where { if(newParentId != null) { it.parentId eq newParentId }else{ it.parentId.isNull() } and (it.ordinal greater item.ordinal) }
                            set(it.ordinal, it.ordinal - 1)
                        }
                    }
                }

                //第二步:将插入位置之后的子项向后推。计算在插入位置之前被移除的项的数量,这些项会导致插入位置前移
                val insertOrdinal = if(form.ordinal.isPresent) form.ordinal.value - existingItems.count { it.ordinal < form.ordinal.value } else currentChildren.size - existingItems.size
                data.db.update(Folders) {
                    where { if(newParentId != null) { it.parentId eq newParentId }else{ it.parentId.isNull() } and (it.ordinal greaterEq insertOrdinal) }
                    set(it.ordinal, it.ordinal + filteredTarget.size)
                }

                //第三步:将所有要插入的项按照target的顺序插入
                val parentAddress = if(newParent != null) (newParent.parentAddress ?: emptyList()) + newParent.title else emptyList()
                for ((index, item) in filteredTarget.withIndex()) {
                    data.db.update(Folders) {
                        where { it.id eq item.id }
                        set(it.parentId, newParentId)
                        set(it.ordinal, insertOrdinal + index)
                        set(it.parentAddress, parentAddress)
                    }
                }

                //第四步:处理所有原本不属于当前parent的节点的原位置

                for (item in notExistingItems) {
                    //对于每个要移除的项的原位置,将其后面的ordinal都减1
                    data.db.update(Folders) {
                        where { if(item.parentId != null) { it.parentId eq item.parentId }else{ it.parentId.isNull() } and (it.ordinal greater item.ordinal) }
                        set(it.ordinal, it.ordinal - 1)
                    }
                }

                //发送事件通知
                bus.emit(filteredTarget.map { FolderUpdated(it.id, it.type) })
            }else if(form.ordinal.isPresent) {
                throw be(ParamNotRequired("ordinal"))
            }
        }
    }

    /**
     * @throws ResourceNotExist ("target", number[]) folderId不存在
     */
    fun batchDelete(target: List<Int>) {
        data.db.transaction {
            //验证目标folder是否存在
            val folders = data.db.sequenceOf(Folders).filter { it.id inList target }.toList()
            if(folders.size < target.size) {
                val exists = folders.map { it.id }.toSet()
                throw be(ResourceNotExist("target", target.filter { it !in exists }))
            }

            //对每个folder，处理其后面邻近记录的ordinal，然后递归删除
            for (folder in folders) {
                data.db.update(Folders) {
                    where { if(folder.parentId != null) { it.parentId eq folder.parentId }else{ it.parentId.isNull() } and (it.ordinal greater folder.ordinal) }
                    set(it.ordinal, it.ordinal - 1)
                }
                folderManager.recursiveDelete(folder)
            }
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun delete(id: Int) {
        data.db.transaction {
            val folder = data.db.sequenceOf(Folders).firstOrNull { it.id eq id } ?: throw be(NotFound())
            //删除folder时，处理后面邻近记录ordinal
            data.db.update(Folders) {
                where { if(folder.parentId != null) { it.parentId eq folder.parentId }else{ it.parentId.isNull() } and (it.ordinal greater folder.ordinal) }
                set(it.ordinal, it.ordinal - 1)
            }
            folderManager.recursiveDelete(folder)
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

            val images = illustManager.unfoldImages(items)
            val imageIds = images.map { it.id }

            data.db.update(Folders) {
                where { it.id eq id }
                set(it.cachedCount, images.size)
                set(it.updateTime, Instant.now())
            }

            val oldIdSet = kit.updateSubImages(id, imageIds).toSet()
            val imageIdSet = imageIds.toSet()

            val added = (imageIdSet - oldIdSet).toList()
            val deleted = (oldIdSet - imageIdSet).toList()
            bus.emit(FolderImagesChanged(id, added, emptyList(), deleted))
            added.forEach { bus.emit(IllustRelatedItemsUpdated(it, IllustType.IMAGE, folderUpdated = true)) }
            deleted.forEach { bus.emit(IllustRelatedItemsUpdated(it, IllustType.IMAGE, folderUpdated = true)) }
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
                        folderManager.addImagesInFolder(id, imageIds, form.ordinal)
                    }
                }
                BatchAction.MOVE -> {
                    //移动现存的项目。被移动的项目之间仍保持ordinal的顺序挪到新位置。
                    //不能用来添加新项目，会被忽略。
                    val formImages = form.images ?: throw be(ParamRequired("images"))
                    if(formImages.isNotEmpty()) {
                        folderManager.moveImagesInFolder(id, formImages, form.ordinal)
                    }
                }
                BatchAction.DELETE -> {
                    val formImages = form.images ?: throw be(ParamRequired("images"))
                    if(formImages.isNotEmpty()) {
                        folderManager.removeImagesFromFolder(id, formImages)
                    }
                }
                BatchAction.REVERSE -> {
                    val formImages = form.images ?: throw be(ParamRequired("images"))
                    if(formImages.isNotEmpty()) {
                        folderManager.sortImagesInFolder(id, formImages, "REVERSE")
                    }
                }
                BatchAction.SORT_BY_ORDER_TIME -> {
                    val formImages = form.images ?: throw be(ParamRequired("images"))
                    if(formImages.isNotEmpty()) {
                        folderManager.sortImagesInFolder(id, formImages, "ORDER_TIME")
                    }
                }
                BatchAction.SORT_BY_SOURCE_ID -> {
                    val formImages = form.images ?: throw be(ParamRequired("images"))
                    if(formImages.isNotEmpty()) {
                        folderManager.sortImagesInFolder(id, formImages, "SOURCE_ID")
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
                Illusts.exportedScore, Illusts.favorite, Illusts.tagme, Illusts.partitionTime, Illusts.orderTime,
                Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, Illusts.sourcePartName,
                FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { FolderImageRelations.folderId eq id }
            .limit(filter.offset, filter.limit)
            .orderBy(imagesOrderTranslator, filter.order)
            .toListResult {
                val ordinal = it[FolderImageRelations.ordinal]!!
                val itemId = it[Illusts.id]!!
                val score = it[Illusts.exportedScore]
                val favorite = it[Illusts.favorite]!!
                val tagme = it[Illusts.tagme]!!
                val partitionTime = it[Illusts.partitionTime]!!
                val orderTime = it[Illusts.orderTime]!!.toInstant()
                val filePath = filePathFrom(it)
                val source = sourcePathOf(it)
                FolderImageRes(itemId, ordinal, filePath, score, favorite, tagme, source, partitionTime, orderTime)
            }
    }
}