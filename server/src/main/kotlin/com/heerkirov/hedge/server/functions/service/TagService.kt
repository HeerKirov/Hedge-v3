package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.constants.Ui
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.exceptions.*
import com.heerkirov.hedge.server.functions.kit.TagKit
import com.heerkirov.hedge.server.functions.manager.SourceMappingManager
import com.heerkirov.hedge.server.dto.filter.TagFilter
import com.heerkirov.hedge.server.dto.filter.TagTreeFilter
import com.heerkirov.hedge.server.dto.form.*
import com.heerkirov.hedge.server.dto.res.*
import com.heerkirov.hedge.server.enums.MetaType
import com.heerkirov.hedge.server.enums.TagAddressType
import com.heerkirov.hedge.server.enums.TagGroupType
import com.heerkirov.hedge.server.events.MetaTagCreated
import com.heerkirov.hedge.server.events.MetaTagDeleted
import com.heerkirov.hedge.server.events.MetaTagUpdated
import com.heerkirov.hedge.server.utils.business.takeThumbnailFilepath
import com.heerkirov.hedge.server.utils.*
import com.heerkirov.hedge.server.utils.ktorm.OrderTranslator
import com.heerkirov.hedge.server.utils.ktorm.orderBy
import com.heerkirov.hedge.server.utils.types.*
import org.ktorm.dsl.*
import org.ktorm.entity.*

class TagService(private val data: DataRepository,
                 private val bus: EventBus,
                 private val kit: TagKit,
                 private val sourceMappingManager: SourceMappingManager) {
    private val orderTranslator = OrderTranslator {
        "id" to Tags.id
        "name" to Tags.name
        "ordinal" to Tags.ordinal
        "createTime" to Tags.createTime
        "updateTime" to Tags.updateTime
    }

    fun list(filter: TagFilter): ListResult<TagRes> {
        return data.db.from(Tags).select()
            .whereWithConditions {
                if(filter.parent != null) { it += Tags.parentId eq filter.parent }
                if(filter.type != null) { it += Tags.type eq filter.type }
                if(filter.group != null) { it += if(filter.group) Tags.isGroup notEq TagGroupType.NO else Tags.isGroup eq TagGroupType.NO }
                if(filter.search != null) { it += (Tags.name like "%${filter.search}%") or (Tags.otherNames like "%${filter.search}%") }
            }
            .orderBy(orderTranslator, filter.order, default = ascendingOrderItem("ordinal"))
            .limit(filter.offset, filter.limit)
            .toListResult {
                newTagRes(Tags.createEntity(it))
            }
    }

    fun tree(filter: TagTreeFilter): List<TagTreeNode> {
        val records = data.db.sequenceOf(Tags).asKotlinSequence().groupBy { it.parentId }

        fun generateNodeList(key: Int?): List<TagTreeNode>? = records[key]
            ?.sortedBy { it.ordinal }
            ?.map { newTagTreeNode(it, generateNodeList(it.id)) }

        return generateNodeList(filter.parent) ?: emptyList()
    }

    /**
     * @throws AlreadyExists ("Tag", "name", string) 在相同的影响范围内，此名称的标签已存在
     * @throws CannotGiveColorError 不是根节点，不能修改颜色
     * @throws InvalidColorError 错误的颜色
     * @throws ResourceNotExist ("parentId", number) 给出的parent id不存在
     * @throws ResourceNotExist ("links", number[]) links中给出的tag不存在。给出不存在的link id列表
     * @throws ResourceNotExist ("examples", number[]) examples中给出的image不存在。给出不存在的image id列表
     * @throws ResourceNotExist ("annotations", number[]) 有annotation不存在时，抛出此异常。给出不存在的annotation id列表
     * @throws ResourceNotSuitable ("links", number[]) links中给出的部分资源不适用，虚拟地址段是不能被link的。给出不适用的link id列表
     * @throws ResourceNotSuitable ("examples", number[]) examples中给出的部分资源不适用，collection不能用作example。给出不适用的link id列表
     * @throws ResourceNotSuitable ("annotations", number[]) 指定target类型且有元素不满足此类型时，抛出此异常。给出不适用的annotation id列表
     * @throws ResourceNotExist ("site", string) 更新source mapping tags时给出的site不存在
     */
    fun create(form: TagCreateForm): Int {
        val name = kit.validateName(form.name)
        val otherNames = kit.validateOtherNames(form.otherNames)

        data.db.transaction {
            //检查parent是否存在
            val parent = form.parentId?.let { parentId -> data.db.sequenceOf(Tags).firstOrNull { it.id eq parentId } ?: throw be(ResourceNotExist("parentId", form.parentId)) }

            //检查颜色，只有顶层tag允许指定颜色
            if(form.color != null && parent != null) throw be(CannotGiveColorError())
            if(form.color != null && !Ui.USEFUL_COLORS.contains(form.color)) throw be(InvalidColorError(form.color))

            //检查标签重名
            //addr类型的标签在相同的parent下重名
            //tag类型的标签除上一条外，还禁止与全局的其他tag类型标签重名
            if(form.type == TagAddressType.TAG) {
                if(data.db.sequenceOf(Tags).any { (if(form.parentId != null) { Tags.parentId eq form.parentId }else{ Tags.parentId.isNull() } or (it.type eq TagAddressType.TAG)) and (it.name eq name) }) throw be(AlreadyExists("Tag", "name", name))
            }else{
                if(data.db.sequenceOf(Tags).any { if(form.parentId != null) { Tags.parentId eq form.parentId }else{ Tags.parentId.isNull() } and (it.name eq name) }) throw be(AlreadyExists("Tag", "name", name))
            }

            //存在link时，检查link的目标是否存在
            val links = kit.validateLinks(form.links)

            //存在example时，检查example的目标是否存在，以及限制illust不能是collection
            val examples = kit.validateExamples(form.examples)

            val tagCountInGlobal = data.db.sequenceOf(Tags).count()

            val tagCountInParent by lazy {
                data.db.sequenceOf(Tags)
                    .filter { if(form.parentId != null) { Tags.parentId eq form.parentId }else{ Tags.parentId.isNull() } }
                    .count()
            }

            //未指定ordinal时，将其排在序列的末尾，相当于当前的序列长度
            //已指定ordinal时，按照指定的ordinal排序，并且不能超出[0, count]的范围
            val ordinal = if(form.ordinal == null) {
                tagCountInParent
            }else when {
                form.ordinal <= 0 -> 0
                form.ordinal >= tagCountInParent -> tagCountInParent
                else -> form.ordinal
            }.also { ordinal ->
                data.db.update(Tags) {
                    //同parent下，ordinal>=newOrdinal的那些tag，向后顺延一位
                    where { if(form.parentId != null) { Tags.parentId eq form.parentId }else{ Tags.parentId.isNull() } and (it.ordinal greaterEq ordinal)  }
                    set(it.ordinal, it.ordinal + 1)
                }
            }

            val createTime = DateTime.now()

            val id = data.db.insertAndGenerateKey(Tags) {
                set(it.name, name)
                set(it.otherNames, otherNames)
                set(it.globalOrdinal, tagCountInGlobal)
                set(it.ordinal, ordinal)
                set(it.parentId, form.parentId)
                set(it.type, form.type)
                set(it.isGroup, form.group)
                set(it.description, form.description)
                set(it.color, parent?.color ?: form.color)
                set(it.links, links)
                set(it.examples, examples)
                set(it.exportedScore, null)
                set(it.cachedCount, 0)
                set(it.createTime, createTime)
                set(it.updateTime, createTime)
            } as Int

            form.mappingSourceTags?.also { sourceMappingManager.update(MetaType.TAG, id, it) }

            kit.processAnnotations(id, form.annotations, creating = true)

            bus.emit(MetaTagCreated(id, MetaType.TAG))

            return id
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun get(id: Int): TagDetailRes {
        val tag = data.db.sequenceOf(Tags).firstOrNull { it.id eq id } ?: throw be(NotFound())

        val annotations = data.db.from(TagAnnotationRelations)
            .innerJoin(Annotations, TagAnnotationRelations.annotationId eq Annotations.id)
            .select(Annotations.id, Annotations.name, Annotations.canBeExported)
            .where { TagAnnotationRelations.tagId eq id }
            .map { TagDetailRes.Annotation(it[Annotations.id]!!, it[Annotations.name]!!, it[Annotations.canBeExported]!!) }

        val examples = if(tag.examples.isNullOrEmpty()) emptyList() else data.db.from(Illusts)
            .innerJoin(FileRecords, FileRecords.id eq Illusts.fileId)
            .select(Illusts.id, FileRecords.id, FileRecords.block, FileRecords.extension, FileRecords.status)
            .where { Illusts.id inList tag.examples }
            .map { IllustSimpleRes(it[Illusts.id]!!, takeThumbnailFilepath(it)) }

        val links = if(tag.links.isNullOrEmpty()) emptyList() else data.db.sequenceOf(Tags).filter { it.id inList tag.links }.map { TagDetailRes.Link(it.id, it.name, it.type, it.isGroup, it.color) }

        val parents = kit.getAllParents(tag).map { TagDetailRes.Parent(it.id, it.name, it.type, it.isGroup) }

        val mappingSourceTags = sourceMappingManager.query(MetaType.TAG, id)

        return newTagDetailRes(tag, parents, links, annotations, examples, mappingSourceTags)
    }

    /**
     * @throws NotFound 请求对象不存在
     * @throws RecursiveParentError parentId出现闭环
     * @throws CannotGiveColorError 不是根节点，不能修改颜色
     * @throws InvalidColorError 错误的颜色
     * @throws ResourceNotExist ("parentId", number) 给出的parent id不存在
     * @throws ResourceNotExist ("links", number[]) links中给出的tag不存在。给出不存在的link id列表
     * @throws ResourceNotExist ("examples", number[]) examples中给出的image不存在。给出不存在的image id列表
     * @throws ResourceNotExist ("annotations", number[]) 有annotation不存在时，抛出此异常。给出不存在的annotation id列表
     * @throws ResourceNotSuitable ("links", number[]) links中给出的部分资源不适用，虚拟地址段是不能被link的。给出不适用的link id列表
     * @throws ResourceNotSuitable ("examples", number[]) examples中给出的部分资源不适用，collection不能用作example。给出不适用的link id列表
     * @throws ResourceNotSuitable ("annotations", number[]) 指定target类型且有元素不满足此类型时，抛出此异常。给出不适用的annotation id列表
     * @throws ResourceNotExist ("site", string) 更新source mapping tags时给出的site不存在
     */
    fun update(id: Int, form: TagUpdateForm) {
        data.db.transaction {
            val record = data.db.sequenceOf(Tags).firstOrNull { it.id eq id } ?: throw be(NotFound())

            val newName = form.name.letOpt { kit.validateName(it) }
            val newOtherNames = form.otherNames.letOpt { kit.validateOtherNames(it) }
            val newLinks = form.links.runOpt { kit.validateLinks(this) }
            val newExamples = form.examples.runOpt { kit.validateExamples(this) }

            val (newParentId, newOrdinal) = if(form.parentId.isPresent && form.parentId.value != record.parentId) {
                //parentId发生了变化
                val newParentId = form.parentId.value

                if(newParentId != null) {
                    tailrec fun recursiveCheckParent(id: Int) {
                        if(id == record.id) {
                            //在过去经历过的parent中发现了重复的id，判定存在闭环
                            throw be(RecursiveParentError())
                        }
                        val parent = data.db.from(Tags)
                            .select(Tags.parentId)
                            .where { Tags.id eq id }
                            .limit(0, 1)
                            .map { optOf(it[Tags.parentId]) }
                            .firstOrNull()
                            //检查parent是否存在
                            ?: throw be(ResourceNotExist("parentId", newParentId))
                        val parentId = parent.value
                        if(parentId != null) recursiveCheckParent(parentId)
                    }

                    recursiveCheckParent(newParentId)
                }

                //调整旧的parent下的元素顺序
                data.db.update(Tags) {
                    where { if(record.parentId != null) { Tags.parentId eq record.parentId }else{ Tags.parentId.isNull() } and (it.ordinal greater record.ordinal) }
                    set(it.ordinal, it.ordinal - 1)
                }

                val tagsInNewParent = data.db.sequenceOf(Tags)
                    .filter { if(newParentId != null) { Tags.parentId eq newParentId }else{ Tags.parentId.isNull() } }
                    .toList()

                Pair(optOf(newParentId), if(form.ordinal.isPresent) {
                    //指定了新的ordinal
                    val max = tagsInNewParent.size
                    val newOrdinal = if(form.ordinal.value > max) max else form.ordinal.value

                    data.db.update(Tags) {
                        where { if(newParentId != null) { Tags.parentId eq newParentId }else{ Tags.parentId.isNull() } and (it.ordinal greaterEq newOrdinal) }
                        set(it.ordinal, it.ordinal + 1)
                    }
                    optOf(newOrdinal)
                }else{
                    //没有指定新ordinal，追加到末尾
                    optOf(tagsInNewParent.size)
                })
            }else{
                //parentId没有变化，只在当前范围内变动
                Pair(undefined(), if(form.ordinal.isUndefined || form.ordinal.value == record.ordinal) undefined() else {
                    //ordinal发生了变化，为此需要确定新的ordinal、移动前后的其他tag
                    val tagsInParent = data.db.sequenceOf(Tags)
                        .filter { if(record.parentId != null) { Tags.parentId eq record.parentId }else{ Tags.parentId.isNull() } }
                        .toList()
                    val max = tagsInParent.size
                    val newOrdinal = if(form.ordinal.value > max) max else form.ordinal.value
                    if(newOrdinal > record.ordinal) {
                        //插入位置在原位置之后时，实际上会使夹在中间的项前移，为了保证插入顺位与想要的顺位保持不变，因此final ordinal位置是要-1的。
                        data.db.update(Tags) {
                            where { if(record.parentId != null) { Tags.parentId eq record.parentId }else{ Tags.parentId.isNull() } and (it.ordinal greater record.ordinal) and (it.ordinal lessEq (newOrdinal - 1)) }
                            set(it.ordinal, it.ordinal - 1)
                        }
                        optOf(newOrdinal - 1)
                    }else{
                        //插入位置在原位置之前，则不需要final ordinal变更
                        data.db.update(Tags) {
                            where { if(record.parentId != null) { Tags.parentId eq record.parentId }else{ Tags.parentId.isNull() } and (it.ordinal greaterEq newOrdinal) and (it.ordinal less record.ordinal) }
                            set(it.ordinal, it.ordinal + 1)
                        }
                        optOf(newOrdinal)
                    }
                })
            }

            val newColor = if(form.color.isPresent) {
                //指定新color。此时如果parent为null，新color为指定的color，否则抛异常
                if(!Ui.USEFUL_COLORS.contains(form.color.value)) throw be(InvalidColorError(form.color.value))
                newParentId.unwrapOr { record.parentId }?.let { throw be(CannotGiveColorError()) } ?: optOf(form.color.value)
            }else{
                //没有指定新color
                if(newParentId.isPresent && newParentId.value != null) {
                    //指定的parent且不是null，此时new color为新parent的color
                    data.db.from(Tags).select(Tags.color).where { Tags.id eq newParentId.value!! }.map { optOf(it[Tags.color]!!) }.first()
                }else{
                    //color和parent都没有变化，不修改color的值
                    //指定新parent为null，策略是继承之前的颜色，因此也不修改color的值
                    undefined()
                }
            }

            applyIf(form.type.isPresent || form.name.isPresent || form.parentId.isPresent) {
                //type/name/parentId的变化会触发重名检查
                val name = newName.unwrapOr { record.name }
                val type = form.type.unwrapOr { record.type }
                val parentId = newParentId.unwrapOr { record.parentId }
                //检查标签重名
                //addr类型的标签在相同的parent下重名
                //tag类型的标签除上一条外，还禁止与全局的其他tag类型标签重名
                //更新动作还要排除自己，防止与自己重名的检查
                if(type == TagAddressType.TAG) {
                    if(data.db.sequenceOf(Tags).any {
                            (if(parentId != null) { Tags.parentId eq parentId }else{ Tags.parentId.isNull() } or (it.type eq TagAddressType.TAG)) and (it.name eq name) and (it.id notEq record.id)
                    }) throw be(AlreadyExists("Tag", "name", name))
                }else{
                    if(data.db.sequenceOf(Tags).any {
                            if(parentId != null) { Tags.parentId eq parentId }else{ Tags.parentId.isNull() } and (it.name eq name) and (it.id notEq record.id)
                    }) throw be(AlreadyExists("Tag", "name", name))
                }
            }

            form.annotations.letOpt { newAnnotations -> kit.processAnnotations(id, newAnnotations) }

            form.mappingSourceTags.letOpt { sourceMappingManager.update(MetaType.TAG, id, it ?: emptyList()) }

            newColor.letOpt { color ->
                fun recursionUpdateColor(parentId: Int) {
                    data.db.update(Tags) {
                        where { it.parentId eq parentId }
                        set(it.color, color)
                    }
                    data.db.from(Tags).select(Tags.id).where { Tags.parentId eq parentId }.map { it[Tags.id]!! }.forEach(::recursionUpdateColor)
                }
                recursionUpdateColor(id)
            }

            if(anyOpt(newName, newOtherNames, form.type, form.description, form.group, newLinks, newExamples, newParentId, newOrdinal, newColor)) {
                data.db.update(Tags) {
                    where { it.id eq id }

                    newName.applyOpt { set(it.name, this) }
                    newOtherNames.applyOpt { set(it.otherNames, this) }
                    form.type.applyOpt { set(it.type, this) }
                    form.description.applyOpt { set(it.description, this) }
                    form.group.applyOpt { set(it.isGroup, this) }
                    newLinks.applyOpt { set(it.links, this) }
                    newExamples.applyOpt { set(it.examples, this) }
                    newParentId.applyOpt { set(it.parentId, this) }
                    newOrdinal.applyOpt { set(it.ordinal, this) }
                    newColor.applyOpt { set(it.color, this) }
                }
            }

            val parentSot = anyOpt(newParentId, newOrdinal)
            val annotationSot = form.annotations.isPresent
            val sourceTagMappingSot = form.mappingSourceTags.isPresent
            val listUpdated = anyOpt(newName, newColor, form.type, form.group)
            val detailUpdated = listUpdated || parentSot || annotationSot || sourceTagMappingSot || anyOpt(newOtherNames, form.description, newLinks, newExamples)
            if(listUpdated || detailUpdated) {
                bus.emit(MetaTagUpdated(id, MetaType.TAG, listUpdated = listUpdated, detailUpdated = true, annotationSot = annotationSot, parentSot = parentSot, sourceTagMappingSot = sourceTagMappingSot))
            }
        }
    }

    /**
     * @throws NotFound 请求对象不存在
     */
    fun delete(id: Int) {
        fun recursionDelete(id: Int) {
            data.db.delete(Tags) { it.id eq id }
            data.db.delete(IllustTagRelations) { it.tagId eq id }
            data.db.delete(BookTagRelations) { it.tagId eq id }
            data.db.delete(TagAnnotationRelations) { it.tagId eq id }
            val children = data.db.from(Tags).select(Tags.id).where { Tags.parentId eq id }.map { it[Tags.id]!! }
            for (child in children) {
                recursionDelete(child)
            }
        }
        data.db.transaction {
            val tag = data.db.sequenceOf(Tags).firstOrNull { it.id eq id } ?: throw be(NotFound())
            //删除标签时，处理后面邻近记录ordinal
            data.db.update(Tags) {
                where { if(tag.parentId != null) { it.parentId eq tag.parentId }else{ it.parentId.isNull() } and (it.ordinal greater tag.ordinal) }
                set(it.ordinal, it.ordinal - 1)
            }
            recursionDelete(id)

            bus.emit(MetaTagDeleted(id, MetaType.TAG))
        }
    }

    /**
     * 对tag进行声明式的批量操作。link的设置是单独进行的，不会影响到其他配置项的更新。
     */
    fun bulk(bulks: List<TagBulkForm>): BulkResult<String> {
        return collectBulkResult({ it.name }) {
            val addressRecords = mutableMapOf<String, Int>()
            val linkRecords = mutableMapOf<Int, TagBulkForm>()

            fun recursive(bulks: List<TagBulkForm>, parentId: Int?, parentAddress: String?) {
                bulks.forEachIndexed { index, form ->
                    val id = item(form) {
                        //在定位目标时，采取的方案是唯一地址定位，即只有name逐级符合的项会被确认为目标项，其他重名或任何因素都不予理睬
                        val record = data.db.sequenceOf(Tags).firstOrNull { (it.name eq form.name) and if(parentId != null) it.parentId eq parentId else it.parentId.isNull() }
                        if(record == null) {
                            //当给出rename字段时，此操作被强制为更新操作，因此当走到这里时要报NotFound
                            if(form.rename.isPresent) throw be(NotFound()) else create(TagCreateForm(
                                form.name, form.otherNames.unwrapOrNull(), index, parentId,
                                form.type.unwrapOr { TagAddressType.VIRTUAL_ADDR },
                                form.group.unwrapOr { TagGroupType.NO },
                                null,
                                form.annotations.unwrapOrNull(), form.description.unwrapOr { "" },
                                form.color.unwrapOrNull(), null,
                                form.mappingSourceTags.unwrapOrNull()
                            ))
                        }else{
                            val formOrdinal = if(record.ordinal != index) optOf(index) else undefined()
                            update(record.id, TagUpdateForm(form.rename, form.otherNames, formOrdinal, undefined(), form.type, form.group, undefined(), form.annotations, form.description, form.color, undefined(), form.mappingSourceTags))
                            record.id
                        }
                    }
                    if(id != null) {
                        val address = if(parentAddress != null) "$parentAddress.${form.rename.unwrapOr { form.name }}" else form.rename.unwrapOr { form.name }
                        addressRecords[address] = id
                        if(form.links.isPresent && !form.links.value.isNullOrEmpty()) {
                            linkRecords[id] = form
                        }
                        if(!form.children.isNullOrEmpty()) {
                            recursive(form.children, id, address)
                        }
                    }
                }
            }

            recursive(bulks, null, null)

            fun getIdByAddress(address: String): Int {
                //查询address，将其转换为id。
                //从后往前查询。先查询末尾找出所有符合的列表，然后逐级向上，不断查询列表中tags的parent，验证name是否符合，排除name不符的项以及提前没有了parent的项。
                //address走完后，仍在列表中的项符合匹配。此时优先挑选type=TAG的项。
                val split = address.split('.').map(String::trim).asReversed()
                val tagName = split.first()

                var tags = data.db.from(Tags).select(Tags.id, Tags.type, Tags.parentId).where { Tags.name eq tagName }.map { Triple(it[Tags.id]!!, it[Tags.type]!!, it[Tags.parentId]) }.toList()

                if(split.size > 1) {
                    for(i in 1 until split.size) {
                        if(tags.isEmpty()) break
                        val addr = split[i]
                        val parentIds = tags.mapNotNull { (_, _, parentId) -> parentId }
                        val parents = if(parentIds.isEmpty()) emptyMap() else data.db.from(Tags).select(Tags.id, Tags.name, Tags.parentId).where { Tags.id inList parentIds }.associateBy({ it[Tags.id]!! }) { Pair(it[Tags.name]!!, it[Tags.parentId]) }

                        tags = tags.mapNotNull { (tagId, tagType, parentId) ->
                            parentId?.let { parents[it] }?.let { (pName, ppId) ->
                                if(pName == addr) {
                                    Triple(tagId, tagType, ppId)
                                }else{
                                    null
                                }
                            }
                        }
                    }
                }

                //没有结果时，抛出ResourceNotExist错误
                if(tags.isEmpty()) {
                    throw be(ResourceNotExist("links", address))
                }else if(tags.size == 1) {
                    //结果为1时，直接选取
                    val (tagId, _, _) = tags.first()
                    return tagId
                }else{
                    //结果超过1时，优先选取TAG；没有TAG则抛出混淆错误
                    val tag = tags.firstOrNull { (_, type, _) -> type == TagAddressType.TAG }
                    if(tag != null) {
                        val (tagId, _, _) = tags.first()
                        return tagId
                    }else{
                        throw be(ResourceNotUnique("links", address, tags.map { (tagId, _, _) -> tagId }))
                    }
                }
            }

            for ((id, form) in linkRecords) {
                item(form, calc = false) {
                    val links = form.links.value!!.map { addressRecords.computeIfAbsent(it, ::getIdByAddress) }
                    update(id, TagUpdateForm(undefined(), undefined(), undefined(), undefined(), undefined(), undefined(), optOf(links), undefined(), undefined(), undefined(), undefined(), undefined()))
                }
            }
        }
    }
}