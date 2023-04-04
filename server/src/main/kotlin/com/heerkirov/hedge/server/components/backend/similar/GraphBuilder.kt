package com.heerkirov.hedge.server.components.backend.similar

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.enums.FindSimilarEntityType
import com.heerkirov.hedge.server.enums.SourceMarkType
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.utils.ktorm.asSequence
import com.heerkirov.hedge.server.utils.mapEachTwo
import org.ktorm.dsl.*

class GraphBuilder(private val data: DataRepository, private val entityLoader: EntityLoader, private val config: FindSimilarTask.TaskConfig) {
    private val nodes: MutableMap<EntityKey, GraphNode> = mutableMapOf()

    /**
     * 开始处理selector。
     */
    fun process(selector: FindSimilarTask.TaskSelector): Map<EntityKey, GraphNode> {
        val targetItems = entityLoader.loadBySelector(selector)
        if(config.findBySourceRelation) {
            for (targetItem in targetItems) {
                val matchedItems = getFilteredItems(targetItem)
                //find by source relation需要走筛选
                matchForSourceRelations(targetItem, matchedItems)
                //find by source relation:book部分不需要筛选条件，直接全表查询
                matchForSourceBooks(targetItem)
            }
        }
        if(config.findBySourceMark) {
            //find by source mark不需要筛选条件，直接全表查询
            for (targetItem in targetItems) {
                matchForSourceMark(targetItem)
            }
        }
        if(config.findBySourceIdentity) {
            //find by source identity不需要筛选条件，直接全表查询
            for (targetItem in targetItems) {
                matchForSourceIdentity(targetItem)
            }
        }
        if(config.findBySimilarity) {
            for (targetItem in targetItems) {
                //find by similarity需要走筛选
                val matchedItems = getFilteredItems(targetItem)
                matchForSimilarity(targetItem, matchedItems)
            }
        }

        supplyExistRelations()

        return nodes
    }

    private fun print() {
        for ((key, node) in nodes) {
            println("${key.type}.${key.id}:")
            for (relation in node.relations) {
                println(" - ${relation.another.key.type}.${relation.another.key.id}")
                for (param in relation.relations) {
                    println("   by $param")
                }
            }
        }
    }

    /**
     * 根据filter by条件，为指定的targetItem生成它的目标项匹配序列，用于那些剪枝选项。
     */
    private fun getFilteredItems(targetItem: EntityInfo): Sequence<EntityInfo> {
        return when (targetItem) {
            is IllustEntityInfo -> sequence {
                if(config.filterByPartition) {
                    yieldAll(entityLoader.loadByPartition(targetItem.partitionTime))
                }
                if(config.filterByTopic) {
                    yieldAll(entityLoader.loadByTopic(targetItem.topics))
                }
                if(config.filterByAuthor) {
                    yieldAll(entityLoader.loadByAuthor(targetItem.authors))
                }
                if(config.filterBySourceTagType.isNotEmpty()) {
                    targetItem.sourceTags
                        .groupBy({ it.site }) { it.code }
                        .forEach { (site, tags) ->
                            yieldAll(entityLoader.loadBySourceTag(site, tags))
                        }
                }
                if(config.filterByOtherImport) {
                    yieldAll(entityLoader.loadByImportImage())
                }
            }
            is ImportImageEntityInfo -> sequence {
                if(config.filterByPartition) {
                    yieldAll(entityLoader.loadByPartition(targetItem.partitionTime))
                }
                if(config.filterBySourceTagType.isNotEmpty()) {
                    targetItem.sourceTags
                        .groupBy({ it.site }) { it.code }
                        .forEach { (site, tags) ->
                            yieldAll(entityLoader.loadBySourceTag(site, tags))
                        }
                }
                if(config.filterByOtherImport) {
                    yieldAll(entityLoader.loadByImportImage())
                }
            }
        }
    }

    /**
     * 执行similarity类的匹配检测。
     */
    private fun matchForSimilarity(targetItem: EntityInfo, matchedItems: Sequence<EntityInfo>) {
        //TODO similarity检测。后面的检测要注意利用已有的node graph剪枝，已存在高位关系(如source relation same)的就跳过其他检测。
    }

    /**
     * 执行source relation:relations类的匹配检测。
     * 此项检测包括：检查targetItem和matched的source relations是否包含对方(任一即可)。
     */
    private fun matchForSourceRelations(targetItem: EntityInfo, matchedItems: Sequence<EntityInfo>) {
        val adds = mutableListOf<Triple<EntityKey, EntityKey, RelationType>>()
        for (matched in matchedItems) {
            val hasRelations = targetItem.sourceIdentity != null && matched.sourceIdentity != null
                    && targetItem.sourceIdentity!!.first == matched.sourceIdentity!!.first
                    && (!targetItem.sourceRelations.isNullOrEmpty() || !matched.sourceRelations.isNullOrEmpty())
                    && (matched.sourceIdentity!!.second in targetItem.sourceRelations!! || targetItem.sourceIdentity!!.second in matched.sourceRelations!!)
            if(hasRelations) {
                adds.add(Triple(targetItem.toEntityKey(), matched.toEntityKey(), SourceRelatedRelationType(true, null)))
            }
        }
        addInGraph(adds)
    }

    /**
     * 执行source mark类的匹配检测。
     */
    private fun matchForSourceMark(targetItem: EntityInfo) {
        if(!targetItem.sourceMarks.isNullOrEmpty()) {
            val adds = mutableListOf<Triple<EntityKey, EntityKey, RelationType>>()
            val entityKey = targetItem.toEntityKey()
            val markTypes = targetItem.sourceMarks!!.toMap()

            data.db.from(Illusts)
                .select(Illusts.id, Illusts.sourceDataId)
                .where { Illusts.sourceDataId inList markTypes.keys }
                .map { Triple(entityKey, EntityKey(FindSimilarEntityType.ILLUST, it[Illusts.id]!!), SourceMarkRelationType(markTypes[it[Illusts.sourceDataId]!!] ?: SourceMarkType.UNKNOWN)) }
                .let { adds.addAll(it) }

            data.db.from(ImportImages)
                .innerJoin(SourceDatas, (ImportImages.sourceSite eq SourceDatas.sourceSite) and (ImportImages.sourceId eq SourceDatas.sourceId))
                .select(ImportImages.id, SourceDatas.id)
                .where { SourceDatas.id inList markTypes.keys }
                .map { Triple(entityKey, EntityKey(FindSimilarEntityType.IMPORT_IMAGE, it[ImportImages.id]!!), SourceMarkRelationType(markTypes[it[SourceDatas.id]!!] ?: SourceMarkType.UNKNOWN)) }
                .let { adds.addAll(it) }
        }
    }

    /**
     * 执行source relation:book类的匹配检测。
     */
    private fun matchForSourceBooks(targetItem: EntityInfo) {
        if(!targetItem.sourceBooks.isNullOrEmpty()) {
            val adds = mutableListOf<Triple<EntityKey, EntityKey, RelationType>>()
            val entityKey = targetItem.toEntityKey()

            data.db.from(Illusts)
                .innerJoin(SourceBookRelations, SourceBookRelations.sourceDataId eq Illusts.sourceDataId)
                .select(Illusts.id, SourceBookRelations.sourceBookId)
                .where { SourceBookRelations.sourceBookId inList targetItem.sourceBooks!! }
                .map { Triple(entityKey, EntityKey(FindSimilarEntityType.ILLUST, it[Illusts.id]!!), SourceRelatedRelationType(false, mutableSetOf(it[SourceBookRelations.sourceBookId]!!))) }
                .let { adds.addAll(it) }

            data.db.from(ImportImages)
                .innerJoin(SourceDatas, (SourceDatas.sourceSite eq ImportImages.sourceSite) and (SourceDatas.sourceId eq ImportImages.sourceId))
                .innerJoin(SourceBookRelations, SourceBookRelations.sourceDataId eq SourceDatas.id)
                .select(ImportImages.id, SourceBookRelations.sourceBookId)
                .where { SourceBookRelations.sourceBookId inList targetItem.sourceBooks!! }
                .map { Triple(entityKey, EntityKey(FindSimilarEntityType.IMPORT_IMAGE, it[ImportImages.id]!!), SourceRelatedRelationType(false, mutableSetOf(it[SourceBookRelations.sourceBookId]!!))) }
                .let { adds.addAll(it) }

            addInGraph(adds)
        }
    }

    /**
     * 执行source identity类的匹配检测。
     */
    private fun matchForSourceIdentity(targetItem: EntityInfo) {
        if(targetItem.sourceIdentity != null) {
            val adds = mutableListOf<Triple<EntityKey, EntityKey, RelationType>>()
            val (site, sid, part) = targetItem.sourceIdentity!!
            val entityKey = targetItem.toEntityKey()

            data.db.from(Illusts)
                .select(Illusts.id)
                .whereWithConditions {
                    if(targetItem is IllustEntityInfo) it += Illusts.id notEq targetItem.id
                    it += (Illusts.sourceSite eq site) and (Illusts.sourceId eq sid)
                    it += if(part != null) (Illusts.sourcePart eq part) else (Illusts.sourcePart.isNull())
                }
                .map { it[Illusts.id]!! }
                .map { Triple(entityKey, EntityKey(FindSimilarEntityType.ILLUST, it), SourceIdentityRelationType(site, sid, part, true)) }
                .let { adds.addAll(it) }
            data.db.from(ImportImages)
                .select(ImportImages.id)
                .whereWithConditions {
                    if(targetItem is ImportImageEntityInfo) it += Illusts.id notEq targetItem.id
                    it += (ImportImages.sourceSite eq site) and (ImportImages.sourceId eq sid)
                    it += if(part != null) (ImportImages.sourcePart eq part) else (ImportImages.sourcePart.isNull()) }
                .map { it[ImportImages.id]!! }
                .map { Triple(entityKey, EntityKey(FindSimilarEntityType.IMPORT_IMAGE, it), SourceIdentityRelationType(site, sid, part, true)) }
                .let { adds.addAll(it) }

            if(part != null) {
                data.db.from(Illusts)
                    .select(Illusts.id)
                    .where { (Illusts.sourceSite eq site) and (Illusts.sourceId eq sid) and (Illusts.sourcePart notEq part) }
                    .map { it[Illusts.id]!! }
                    .map { Triple(entityKey, EntityKey(FindSimilarEntityType.ILLUST, it), SourceIdentityRelationType(site, sid, null, false)) }
                    .let { adds.addAll(it) }
                data.db.from(ImportImages)
                    .select(ImportImages.id)
                    .where { (ImportImages.sourceSite eq site) and (ImportImages.sourceId eq sid) and (ImportImages.sourcePart notEq part) }
                    .map { it[ImportImages.id]!! }
                    .map { Triple(entityKey, EntityKey(FindSimilarEntityType.IMPORT_IMAGE, it), SourceIdentityRelationType(site, sid, null, false)) }
                    .let { adds.addAll(it) }
            }

            addInGraph(adds)
        }
    }

    /**
     * 完成全部匹配检测之后，增补已存在的关系。
     */
    private fun supplyExistRelations() {
        //增补collection关系
        val sameCollections = nodes.asSequence()
            .filter { (_, v) -> v.info is IllustEntityInfo && v.info.collectionId != null }
            .map { (k, v) -> (v.info as IllustEntityInfo).collectionId!! to k }
            .groupBy({ (k, _) -> k }) { (_, v) -> v }
            .filterValues { it.size > 1 }
        for ((collectionId, units) in sameCollections) {
            addInGraph(units.mapEachTwo { a, b -> Triple(a, b, ExistedRelationType(sameCollectionId = collectionId)) })
        }

        //增补book关系
        val allIllustIds = nodes.keys.asSequence().filter { it.type == FindSimilarEntityType.ILLUST }.map { it.id }.toList()
        val sameBooks = data.db.from(Illusts)
            .innerJoin(BookImageRelations, BookImageRelations.imageId eq Illusts.id)
            .select(BookImageRelations.bookId, Illusts.id)
            .where { Illusts.id inList allIllustIds }
            .asSequence()
            .groupBy({ it[BookImageRelations.bookId]!! }) { it[Illusts.id]!! }
        for ((bookId, illusts) in sameBooks) {
            addInGraph(illusts.mapEachTwo { a, b -> Triple(EntityKey(FindSimilarEntityType.ILLUST, a), EntityKey(FindSimilarEntityType.ILLUST, b), ExistedRelationType(sameBooks = mutableSetOf(bookId))) })
        }

        //增补associate关系
        //添加了illustId < relatedIllustId的条件，节省查找结果
        data.db.from(AssociateRelations)
            .select()
            .where { AssociateRelations.illustId inList allIllustIds and (AssociateRelations.illustId less AssociateRelations.relatedIllustId) }
            .map { Triple(EntityKey(FindSimilarEntityType.ILLUST, it[AssociateRelations.illustId]!!), EntityKey(FindSimilarEntityType.ILLUST, it[AssociateRelations.relatedIllustId]!!), ExistedRelationType(sameAssociate = true)) }
            .let { addInGraph(it) }

        //增补ignored关系
        data.db.from(FindSimilarIgnores)
            .select(FindSimilarIgnores.secondTarget, FindSimilarIgnores.firstTarget)
            .where { FindSimilarIgnores.firstTarget inList nodes.keys.map { it.toEntityKeyString() } and (FindSimilarIgnores.firstTarget less FindSimilarIgnores.secondTarget) }
            .map { Triple(it[FindSimilarIgnores.firstTarget]!!.toEntityKey(), it[FindSimilarIgnores.secondTarget]!!.toEntityKey(), ExistedRelationType(ignored = true)) }
            .let { addInGraph(it) }
    }

    /**
     * 将添加一组图关系。
     */
    private fun addInGraph(adds: Iterable<Triple<EntityKey, EntityKey, RelationType>>) {
        val allEntityKeys = adds.asSequence().flatMap { sequenceOf(it.first, it.second) }.toSet()
        val allEntityInfo = entityLoader.loadByEntityKeys(allEntityKeys)
        val allNodes = allEntityInfo.mapValues { (entityKey, entityInfo) -> nodes.computeIfAbsent(entityKey) { GraphNode(entityKey, entityInfo, mutableSetOf()) } }
        for ((keyA, keyB, newRelation) in adds) {
            val nodeA = allNodes[keyA]
            val nodeB = allNodes[keyB]
            if(nodeA != null && nodeB != null && keyA != keyB) {
                //首先尝试从nodeA中获取与nodeB关联的relation。如果不存在则创建新的relation，且两个relation共用一个relation list
                val relationList = nodeA.relations.firstOrNull { it.another.key == nodeB.key }?.relations ?: run {
                    val list = mutableListOf<RelationType>()
                    nodeA.relations.add(GraphRelation(nodeB, list))
                    nodeB.relations.add(GraphRelation(nodeA, list))
                    list
                }
                //根据relation的类型，需要处理同类relation的合并
                when (newRelation) {
                    is SourceIdentityRelationType -> {
                        val ext = relationList.filterIsInstance<SourceIdentityRelationType>().firstOrNull()
                        if(ext != null) {
                            if(newRelation.equal && !ext.equal) ext.equal = true
                        }else{
                            relationList.add(newRelation)
                        }
                    }
                    is SourceRelatedRelationType -> {
                        val ext = relationList.filterIsInstance<SourceRelatedRelationType>().firstOrNull()
                        if(ext != null) {
                            if(newRelation.hasRelations && !ext.hasRelations) ext.hasRelations = true
                            if(!newRelation.sameBooks.isNullOrEmpty()) {
                                if(ext.sameBooks == null) {
                                    ext.sameBooks = newRelation.sameBooks
                                }else{
                                    ext.sameBooks!!.addAll(newRelation.sameBooks!!)
                                }
                            }
                        }else{
                            relationList.add(newRelation)
                        }
                    }
                    is SourceMarkRelationType -> {
                        val ext = relationList.filterIsInstance<SourceMarkRelationType>().firstOrNull()
                        if(ext != null) {
                            ext.markType = newRelation.markType
                        }else{
                            relationList.add(newRelation)
                        }
                    }
                    is SimilarityRelationType -> {
                        val ext = relationList.filterIsInstance<SimilarityRelationType>().firstOrNull()
                        if(ext != null) {
                            ext.similarity = newRelation.similarity
                            ext.level = newRelation.level
                        }else{
                            relationList.add(newRelation)
                        }
                    }
                    is ExistedRelationType -> {
                        val ext = relationList.filterIsInstance<ExistedRelationType>().firstOrNull()
                        if(ext != null) {
                            if(newRelation.ignored && !ext.ignored) ext.ignored = true
                            if(newRelation.sameAssociate && !ext.sameAssociate) ext.sameAssociate = true
                            if(newRelation.sameCollectionId != null) ext.sameCollectionId = newRelation.sameCollectionId
                            if(!newRelation.sameBooks.isNullOrEmpty()) {
                                if(ext.sameBooks == null) {
                                    ext.sameBooks = newRelation.sameBooks
                                }else{
                                    ext.sameBooks!!.addAll(newRelation.sameBooks!!)
                                }
                            }
                        }else{
                            relationList.add(newRelation)
                        }
                    }
                }
            }

        }
    }
}