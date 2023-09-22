package com.heerkirov.hedge.server.components.backend.similar

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.res.SourceTagPath
import com.heerkirov.hedge.server.enums.FindSimilarEntityType
import com.heerkirov.hedge.server.enums.SourceMarkType
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.utils.NewSimilarity
import com.heerkirov.hedge.server.utils.ktorm.asSequence
import com.heerkirov.hedge.server.utils.mapEachTwo
import com.heerkirov.hedge.server.utils.types.FindSimilarEntityKey
import com.heerkirov.hedge.server.utils.types.toEntityKey
import com.heerkirov.hedge.server.utils.types.toEntityKeyString
import org.ktorm.dsl.*

class GraphBuilder(private val data: DataRepository, private val entityLoader: EntityLoader, private val config: FindSimilarTask.TaskConfig) {
    private val nodes: MutableMap<FindSimilarEntityKey, GraphNode> = mutableMapOf()

    /**
     * 开始处理selector。
     */
    fun process(selector: FindSimilarTask.TaskSelector): Map<FindSimilarEntityKey, GraphNode> {
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
                        .map { SourceTagPath(it.site, it.type, it.code) }
                        .let { yieldAll(entityLoader.loadBySourceTag(it)) }
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
                        .map { SourceTagPath(it.site, it.type, it.code) }
                        .let { yieldAll(entityLoader.loadBySourceTag(it)) }
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
        //similarity检测。
        //FUTURE: 后面的检测要注意利用已有的node graph剪枝，已存在高位关系(如source relation same)的就跳过其他检测。
        if(targetItem.fingerprint != null) {
            val adds = mutableListOf<Triple<FindSimilarEntityKey, FindSimilarEntityKey, RelationType>>()
            for (matched in matchedItems) {
                if(matched.fingerprint != null) {
                    //计算simple得分。任意一方有极低的得分，就立刻跳过
                    val pHashSimpleRating = NewSimilarity.hammingDistance(targetItem.fingerprint!!.pHashSimple, matched.fingerprint!!.pHashSimple)
                    if(pHashSimpleRating <= 0.55) continue
                    val dHashSimpleRating = NewSimilarity.hammingDistance(targetItem.fingerprint!!.dHashSimple, matched.fingerprint!!.dHashSimple)
                    if(dHashSimpleRating <= 0.55) continue
                    //否则，检测是否任意一方有极高的得分，或者加权平均分过线
                    if(pHashSimpleRating >= 0.98 || dHashSimpleRating >= 0.95 || pHashSimpleRating * 0.4 + dHashSimpleRating * 0.6 >= 0.8) {
                        //计算长hash得分，比较原理同上
                        val pHashRating = NewSimilarity.hammingDistance(targetItem.fingerprint!!.pHash, matched.fingerprint!!.pHash)
                        if(pHashRating <= 0.55) continue
                        val dHashRating = NewSimilarity.hammingDistance(targetItem.fingerprint!!.dHash, matched.fingerprint!!.dHash)
                        if(dHashRating <= 0.55) continue

                        val similarity = if(pHashRating >= 0.95) pHashRating
                            else if(dHashRating >= 0.92) dHashRating
                            else if(pHashRating * 0.6 + dHashRating * 0.4 >= 0.76) pHashRating * 0.6 + dHashRating * 0.4
                            else continue
                        val level = if(similarity >= 0.98) 2 else 1

                        adds.add(Triple(targetItem.toEntityKey(), matched.toEntityKey(), SimilarityRelationType(similarity, level)))
                    }
                }
            }
            addInGraph(adds)
        }
    }

    /**
     * 执行source relation:relations类的匹配检测。
     * 此项检测包括：检查targetItem和matched的source relations是否包含对方(任一即可)。
     */
    private fun matchForSourceRelations(targetItem: EntityInfo, matchedItems: Sequence<EntityInfo>) {
        val adds = mutableListOf<Triple<FindSimilarEntityKey, FindSimilarEntityKey, RelationType>>()
        for (matched in matchedItems) {
            val hasRelations = targetItem.sourceIdentity != null && matched.sourceIdentity != null
                    && targetItem.sourceIdentity!!.f1 == matched.sourceIdentity!!.f1
                    && (!targetItem.sourceRelations.isNullOrEmpty() || !matched.sourceRelations.isNullOrEmpty())
                    && (
                        (!targetItem.sourceRelations.isNullOrEmpty() && matched.sourceIdentity!!.f2 in targetItem.sourceRelations!!)
                        || (!matched.sourceRelations.isNullOrEmpty() && targetItem.sourceIdentity!!.f2 in matched.sourceRelations!!)
                        || (!targetItem.sourceRelations.isNullOrEmpty() && !matched.sourceRelations.isNullOrEmpty() && targetItem.sourceRelations!!.any { it in matched.sourceRelations!! })
                    )
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
            val adds = mutableListOf<Triple<FindSimilarEntityKey, FindSimilarEntityKey, RelationType>>()
            val entityKey = targetItem.toEntityKey()
            val markTypes = targetItem.sourceMarks!!.toMap()

            data.db.from(Illusts)
                .select(Illusts.id, Illusts.sourceDataId)
                .where { Illusts.sourceDataId inList markTypes.keys }
                .map { Triple(entityKey, FindSimilarEntityKey(FindSimilarEntityType.ILLUST, it[Illusts.id]!!), SourceMarkRelationType(markTypes[it[Illusts.sourceDataId]!!] ?: SourceMarkType.UNKNOWN)) }
                .let { adds.addAll(it) }

            data.db.from(ImportImages)
                .innerJoin(SourceDatas, (ImportImages.sourceSite eq SourceDatas.sourceSite) and (ImportImages.sourceId eq SourceDatas.sourceId))
                .select(ImportImages.id, SourceDatas.id)
                .where { SourceDatas.id inList markTypes.keys }
                .map { Triple(entityKey, FindSimilarEntityKey(FindSimilarEntityType.IMPORT_IMAGE, it[ImportImages.id]!!), SourceMarkRelationType(markTypes[it[SourceDatas.id]!!] ?: SourceMarkType.UNKNOWN)) }
                .let { adds.addAll(it) }
        }
    }

    /**
     * 执行source relation:book类的匹配检测。
     */
    private fun matchForSourceBooks(targetItem: EntityInfo) {
        if(!targetItem.sourceBooks.isNullOrEmpty()) {
            val adds = mutableListOf<Triple<FindSimilarEntityKey, FindSimilarEntityKey, RelationType>>()
            val entityKey = targetItem.toEntityKey()

            data.db.from(Illusts)
                .innerJoin(SourceBookRelations, SourceBookRelations.sourceDataId eq Illusts.sourceDataId)
                .select(Illusts.id, SourceBookRelations.sourceBookId)
                .where { SourceBookRelations.sourceBookId inList targetItem.sourceBooks!! }
                .map { Triple(entityKey, FindSimilarEntityKey(FindSimilarEntityType.ILLUST, it[Illusts.id]!!), SourceRelatedRelationType(false, mutableSetOf(it[SourceBookRelations.sourceBookId]!!))) }
                .let { adds.addAll(it) }

            data.db.from(ImportImages)
                .innerJoin(SourceDatas, (SourceDatas.sourceSite eq ImportImages.sourceSite) and (SourceDatas.sourceId eq ImportImages.sourceId))
                .innerJoin(SourceBookRelations, SourceBookRelations.sourceDataId eq SourceDatas.id)
                .select(ImportImages.id, SourceBookRelations.sourceBookId)
                .where { SourceBookRelations.sourceBookId inList targetItem.sourceBooks!! }
                .map { Triple(entityKey, FindSimilarEntityKey(FindSimilarEntityType.IMPORT_IMAGE, it[ImportImages.id]!!), SourceRelatedRelationType(false, mutableSetOf(it[SourceBookRelations.sourceBookId]!!))) }
                .let { adds.addAll(it) }

            addInGraph(adds)
        }
    }

    /**
     * 执行source identity类的匹配检测。
     */
    private fun matchForSourceIdentity(targetItem: EntityInfo) {
        if(targetItem.sourceIdentity != null) {
            val adds = mutableListOf<Triple<FindSimilarEntityKey, FindSimilarEntityKey, RelationType>>()
            val (site, sid, part, partName) = targetItem.sourceIdentity!!
            val entityKey = targetItem.toEntityKey()

            //从Illust、ImportImage中筛选出所有与当前项的sourceIdentity等价的项。
            //等价的判定条件：site相等；id相等；有partName时partName相等，无时part相等，否则part/name均为null
            data.db.from(Illusts)
                .select(Illusts.id)
                .whereWithConditions {
                    if(targetItem is IllustEntityInfo) it += Illusts.id notEq targetItem.id
                    it += (Illusts.sourceSite eq site) and (Illusts.sourceId eq sid)
                    it += if(partName != null) (Illusts.sourcePartName eq partName) else if(part != null) (Illusts.sourcePart eq part) else (Illusts.sourcePart.isNull() and Illusts.sourcePartName.isNull())
                }
                .map { it[Illusts.id]!! }
                .map { Triple(entityKey, FindSimilarEntityKey(FindSimilarEntityType.ILLUST, it), SourceIdentityRelationType(site, sid, part, partName, true)) }
                .let { adds.addAll(it) }
            data.db.from(ImportImages)
                .select(ImportImages.id)
                .whereWithConditions {
                    if(targetItem is ImportImageEntityInfo) it += ImportImages.id notEq targetItem.id
                    it += (ImportImages.sourceSite eq site) and (ImportImages.sourceId eq sid)
                    it += if(partName != null) (ImportImages.sourcePartName eq partName) else if(part != null) (ImportImages.sourcePart eq part) else (ImportImages.sourcePart.isNull() and ImportImages.sourcePartName.isNull())
                }
                .map { it[ImportImages.id]!! }
                .map { Triple(entityKey, FindSimilarEntityKey(FindSimilarEntityType.IMPORT_IMAGE, it), SourceIdentityRelationType(site, sid, part, partName, true)) }
                .let { adds.addAll(it) }

            if(partName != null || part != null) {
                data.db.from(Illusts)
                    .select(Illusts.id)
                    .whereWithConditions {
                        if(targetItem is IllustEntityInfo) it += Illusts.id notEq targetItem.id
                        it += (Illusts.sourceSite eq site) and (Illusts.sourceId eq sid)
                        it += if(partName != null) (Illusts.sourcePartName notEq partName) else if(part != null) (Illusts.sourcePart notEq part) else (Illusts.sourcePart.isNotNull() or Illusts.sourcePartName.isNotNull())
                    }
                    .map { it[Illusts.id]!! }
                    .map { Triple(entityKey, FindSimilarEntityKey(FindSimilarEntityType.ILLUST, it), SourceIdentityRelationType(site, sid, null, null, false)) }
                    .let { adds.addAll(it) }
                data.db.from(ImportImages)
                    .select(ImportImages.id)
                    .whereWithConditions {
                        if(targetItem is ImportImageEntityInfo) it += ImportImages.id notEq targetItem.id
                        it += (ImportImages.sourceSite eq site) and (ImportImages.sourceId eq sid)
                        it += if(partName != null) (ImportImages.sourcePartName notEq partName) else if(part != null) (ImportImages.sourcePart notEq part) else (ImportImages.sourcePart.isNotNull() or ImportImages.sourcePartName.isNotNull())
                    }
                    .map { it[ImportImages.id]!! }
                    .map { Triple(entityKey, FindSimilarEntityKey(FindSimilarEntityType.IMPORT_IMAGE, it), SourceIdentityRelationType(site, sid, null, null, false)) }
                    .let { adds.addAll(it) }
            }

            addInGraph(adds)
        }
    }

    /**
     * 完成全部匹配检测之后，增补已存在的关系。
     */
    private fun supplyExistRelations() {
        //增补来自preference.cloneImage.delete的信息，删除deleteFrom对应的节点
        val cloneImageDeleteFromIds = nodes.values.asSequence()
            .map { it.info }
            .filterIsInstance<ImportImageEntityInfo>()
            .mapNotNull { it.cloneImage }
            .filter { it.deleteFrom }
            .map { it.fromImageId }
            .toSet()
        nodes.entries.filter { (k, _) -> k.type == FindSimilarEntityType.ILLUST && k.id in cloneImageDeleteFromIds }
            .forEach { (k, _) -> nodes.remove(k) }
        nodes.entries.map { (_, v) -> v.relations }
            .forEach { relations ->
                relations.removeIf { relation ->
                    relation.another.key.type == FindSimilarEntityType.ILLUST && relation.another.key.id in cloneImageDeleteFromIds
                }
            }

        //增补collection关系
        val sameCollections = nodes.asSequence()
            .mapNotNull { (k, v) ->
                if(v.info is IllustEntityInfo && v.info.collectionId != null) {
                    v.info.collectionId to k
                }else if(v.info is ImportImageEntityInfo && v.info.collectionId != null) {
                    v.info.collectionId to k
                }else{
                    null
                }
            }
            .groupBy({ (k, _) -> k }) { (_, v) -> v }
            .filterValues { it.size > 1 }
        for ((collectionId, keys) in sameCollections) {
            when (collectionId) {
                is String -> addInGraph(keys.mapEachTwo { a, b -> Triple(a, b, ExistedRelationType(samePreCollection = collectionId)) })
                is Int -> addInGraph(keys.mapEachTwo { a, b -> Triple(a, b, ExistedRelationType(sameCollectionId = collectionId)) })
                else -> throw RuntimeException("collectionId must be string or int.")
            }
        }

        //增补book关系
        val allIllustIds = nodes.keys.asSequence().filter { it.type == FindSimilarEntityType.ILLUST }.map { it.id }.toList()
        val bookToIllusts = data.db.from(Illusts)
            .innerJoin(BookImageRelations, BookImageRelations.imageId eq Illusts.id)
            .select(BookImageRelations.bookId, Illusts.id)
            .where { Illusts.id inList allIllustIds }
            .asSequence()
            .map { it[BookImageRelations.bookId]!! to FindSimilarEntityKey(FindSimilarEntityType.ILLUST, it[Illusts.id]!!) }
        val bookToImports = nodes.values.asSequence().map { it.info }.filterIsInstance<ImportImageEntityInfo>().flatMap { it.bookIds.map { b -> b to FindSimilarEntityKey(FindSimilarEntityType.IMPORT_IMAGE, it.id) } }
        val sameBooks = (bookToIllusts + bookToImports).groupBy({ it.first }) { it.second }.filterValues { it.size > 1 }
        for ((bookId, keys) in sameBooks) {
            addInGraph(keys.mapEachTwo { a, b -> Triple(a, b, ExistedRelationType(sameBooks = mutableSetOf(bookId))) })
        }

        //增补associate关系
        //添加了illustId < relatedIllustId的条件，节省查找结果
        data.db.from(AssociateRelations)
            .select()
            .where { AssociateRelations.illustId inList allIllustIds and (AssociateRelations.illustId less AssociateRelations.relatedIllustId) }
            .map { Triple(FindSimilarEntityKey(FindSimilarEntityType.ILLUST, it[AssociateRelations.illustId]!!), FindSimilarEntityKey(FindSimilarEntityType.ILLUST, it[AssociateRelations.relatedIllustId]!!), ExistedRelationType(sameAssociate = true)) }
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
    private fun addInGraph(adds: Iterable<Triple<FindSimilarEntityKey, FindSimilarEntityKey, RelationType>>) {
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
                relationList.addNewRelation(newRelation)
            }
        }
    }
}