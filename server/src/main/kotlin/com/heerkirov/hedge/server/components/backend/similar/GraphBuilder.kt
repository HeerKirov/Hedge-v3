package com.heerkirov.hedge.server.components.backend.similar

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.dao.*
import com.heerkirov.hedge.server.dto.res.SourceTagPath
import com.heerkirov.hedge.server.model.FindSimilarTask
import com.heerkirov.hedge.server.utils.Similarity
import com.heerkirov.hedge.server.utils.forEachTwo
import com.heerkirov.hedge.server.utils.ktorm.asSequence
import com.heerkirov.hedge.server.utils.mapEachTwo
import org.ktorm.dsl.*

class GraphBuilder(private val data: DataRepository, private val entityLoader: EntityLoader, private val config: FindSimilarTask.TaskConfig) {
    private val nodes: MutableMap<Int, GraphNode> = mutableMapOf()

    /**
     * 开始处理selector。
     */
    fun process(selector: FindSimilarTask.TaskSelector): Map<Int, GraphNode> {
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
        if(config.findBySourceIdentity) {
            //find by source identity不需要筛选条件，直接全表查询
            matchForAllSourceIdentity()
        }
        if(config.findBySourcePart) {
            for (targetItem in targetItems) {
                //find by source part需要走筛选
                matchForSourcePart(targetItem)
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
        return sequence {
            if(config.filterInCurrentScope) {
                yieldAll(entityLoader.loadImage(nodes.keys))
            }
            if(config.filterBySourceBook && !targetItem.sourceBooks.isNullOrEmpty()) {
                yieldAll(entityLoader.loadByBook(targetItem.sourceBooks))
            }
            if(config.filterBySourceRelation && targetItem.sourceIdentity != null && !targetItem.sourceRelations.isNullOrEmpty()) {
                yieldAll(entityLoader.loadBySourceId(targetItem.sourceIdentity.f1, targetItem.sourceRelations))
            }
            if(config.filterBySourcePart && targetItem.sourceIdentity != null && targetItem.sourceIdentity.f3 != null) {
                yieldAll(entityLoader.loadBySourceId(targetItem.sourceIdentity.f1, listOf(targetItem.sourceIdentity.f2)))
            }
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
        }.distinctBy { it.id }
    }

    /**
     * 执行similarity类的匹配检测。
     */
    private fun matchForSimilarity(targetItem: EntityInfo, matchedItems: Sequence<EntityInfo>) {
        //similarity检测。
        //FUTURE: 后面的检测要注意利用已有的node graph剪枝，已存在高位关系(如source relation same)的就跳过其他检测。
        if(targetItem.fingerprint != null) {
            val adds = mutableListOf<Triple<Int, Int, RelationType>>()
            for (matched in matchedItems) {
                if(matched.fingerprint != null) {
                    //计算simple得分。任意一方有极低的得分，就立刻跳过
                    val pHashSimpleRating = Similarity.hammingDistance(targetItem.fingerprint.pHashSimple, matched.fingerprint.pHashSimple)
                    if(pHashSimpleRating <= 0.55) continue
                    val dHashSimpleRating = Similarity.hammingDistance(targetItem.fingerprint.dHashSimple, matched.fingerprint.dHashSimple)
                    if(dHashSimpleRating <= 0.55) continue
                    //否则，检测是否任意一方有极高的得分，或者加权平均分过线
                    if(pHashSimpleRating >= 0.98 || dHashSimpleRating >= 0.95 || pHashSimpleRating * 0.4 + dHashSimpleRating * 0.6 >= 0.8) {
                        //计算长hash得分，比较原理同上
                        val pHashRating = Similarity.hammingDistance(targetItem.fingerprint.pHash, matched.fingerprint.pHash)
                        if(pHashRating <= 0.55) continue
                        val dHashRating = Similarity.hammingDistance(targetItem.fingerprint.dHash, matched.fingerprint.dHash)
                        if(dHashRating <= 0.55) continue

                        val similarity = if(pHashRating >= 0.95) pHashRating
                            else if(dHashRating >= 0.92) dHashRating
                            else if(pHashRating * 0.6 + dHashRating * 0.4 >= 0.76) pHashRating * 0.6 + dHashRating * 0.4
                            else continue
                        val level = if(similarity >= 0.98) 2 else 1

                        adds.add(Triple(targetItem.id, matched.id, SimilarityRelationType(similarity, level)))
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
        val adds = mutableListOf<Triple<Int, Int, RelationType>>()
        for (matched in matchedItems) {
            val hasRelations = targetItem.sourceIdentity != null && matched.sourceIdentity != null
                    && targetItem.sourceIdentity.f1 == matched.sourceIdentity.f1
                    && (!targetItem.sourceRelations.isNullOrEmpty() || !matched.sourceRelations.isNullOrEmpty())
                    && (
                        (!targetItem.sourceRelations.isNullOrEmpty() && matched.sourceIdentity.f2 in targetItem.sourceRelations)
                        || (!matched.sourceRelations.isNullOrEmpty() && targetItem.sourceIdentity.f2 in matched.sourceRelations)
                        || (!targetItem.sourceRelations.isNullOrEmpty() && !matched.sourceRelations.isNullOrEmpty() && targetItem.sourceRelations.any { it in matched.sourceRelations })
                    )
            if(hasRelations) {
                adds.add(Triple(targetItem.id, matched.id, SourceRelatedRelationType(true, null)))
            }
        }
        addInGraph(adds)
    }

    /**
     * 执行source relation:book类的匹配检测。
     */
    private fun matchForSourceBooks(targetItem: EntityInfo) {
        if(!targetItem.sourceBooks.isNullOrEmpty()) {
            val adds = mutableListOf<Triple<Int, Int, RelationType>>()

            data.db.from(Illusts)
                .innerJoin(SourceBookRelations, SourceBookRelations.sourceDataId eq Illusts.sourceDataId)
                .select(Illusts.id, SourceBookRelations.sourceBookId)
                .where { SourceBookRelations.sourceBookId inList targetItem.sourceBooks }
                .map { Triple(targetItem.id, it[Illusts.id]!!, SourceRelatedRelationType(false, mutableSetOf(it[SourceBookRelations.sourceBookId]!!))) }
                .let { adds.addAll(it) }

            addInGraph(adds)
        }
    }

    /**
     * 执行source part类的匹配检测。检测的对象是id相同而part不同的对象。
     */
    private fun matchForSourcePart(targetItem: EntityInfo) {
        if(targetItem.sourceIdentity != null) {
            val adds = mutableListOf<Triple<Int, Int, RelationType>>()
            val (site, sid, part, partName) = targetItem.sourceIdentity

            //相似的要求是：id相同，part/partName不同
            if(partName != null || part != null) {
                data.db.from(Illusts)
                    .select(Illusts.id)
                    .whereWithConditions {
                        it += Illusts.id notEq targetItem.id
                        it += (Illusts.sourceSite eq site) and (Illusts.sourceId eq sid)
                        it += if(partName != null && part != null) {
                            (Illusts.sourcePartName notEq partName) and (Illusts.sourcePart notEq part)
                        }else if(partName != null) {
                            (Illusts.sourcePartName notEq partName)
                        }else{
                            (Illusts.sourcePart notEq part!!)
                        }
                    }
                    .map { it[Illusts.id]!! }
                    .map { Triple(targetItem.id, it, SourceIdentityRelationType(site, sid, null, null, false)) }
                    .let { adds.addAll(it) }
            }

            addInGraph(adds)
        }
    }

    /**
     * 执行source identity类的匹配检测。检测的对象是id+part相同或partName相同的对象。
     * 由于这部分的独立性质，可以拆出来单独执行，以提高执行效率。在旧算法中，优化了缓存问题后，最慢的就是这一块了。
     */
    private fun matchForAllSourceIdentity() {
        val adds = mutableListOf<Triple<Int, Int, RelationType>>()
        //从Illust中筛选出所有sourceIdentity重复的项。
        //等价判断的要求是：id相同，part相同；或者存在partName时，partName相同
        val sameSourceIds = data.db.from(Illusts)
            .select(Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart, count(Illusts.id).aliased("cnt"))
            .where { Illusts.sourceSite.isNotNull() }
            .groupBy(Illusts.sourceSite, Illusts.sourceId, Illusts.sourcePart)
            .having { count(Illusts.id).aliased("cnt") greater 1 }
            .map { Triple(it[Illusts.sourceSite]!!, it[Illusts.sourceId]!!, it[Illusts.sourcePart]) }

        val sameSourcePartNames = data.db.from(Illusts)
            .select(Illusts.sourceSite, Illusts.sourcePartName, count(Illusts.id).aliased("cnt"))
            .where { Illusts.sourceSite.isNotNull() and Illusts.sourcePartName.isNotNull() }
            .groupBy(Illusts.sourceSite, Illusts.sourcePartName)
            .having { count(Illusts.id).aliased("cnt") greater 1 }
            .map { Pair(it[Illusts.sourceSite]!!, it[Illusts.sourcePartName]!!) }

        for ((site, id, part) in sameSourceIds) {
            val illusts = data.db.from(Illusts)
                .select(Illusts.id)
                .where { (Illusts.sourceSite eq site) and (Illusts.sourceId eq id) and if(part != null) Illusts.sourcePart eq part else Illusts.sourcePart.isNull() }
                .map { it[Illusts.id]!! }
            illusts.forEachTwo { a, b -> adds.add(Triple(a, b, SourceIdentityRelationType(site, id, part, null, true))) }
        }

        for ((site, pn) in sameSourcePartNames) {
            val illusts = data.db.from(Illusts)
                .select(Illusts.id)
                .where { (Illusts.sourceSite eq site) and (Illusts.sourcePartName eq pn) }
                .map { it[Illusts.id]!! }
            illusts.forEachTwo { a, b -> adds.add(Triple(a, b, SourceIdentityRelationType(site, null, null, pn, true))) }
        }
    }

    /**
     * 完成全部匹配检测之后，增补已存在的关系。
     */
    private fun supplyExistRelations() {
        //增补collection关系
        val sameCollections = nodes.asSequence()
            .mapNotNull { (k, v) ->
                if(v.info.collectionId != null) {
                    v.info.collectionId to k
                }else{
                    null
                }
            }
            .groupBy({ (k, _) -> k }) { (_, v) -> v }
            .filterValues { it.size > 1 }
        for ((collectionId, keys) in sameCollections) {
            addInGraph(keys.mapEachTwo { a, b -> Triple(a, b, ExistedRelationType(sameCollectionId = collectionId)) })
        }

        //增补book关系
        val sameBooks = data.db.from(Illusts)
            .innerJoin(BookImageRelations, BookImageRelations.imageId eq Illusts.id)
            .select(BookImageRelations.bookId, Illusts.id)
            .where { Illusts.id inList nodes.keys }
            .asSequence()
            .map { it[BookImageRelations.bookId]!! to it[Illusts.id]!! }
            .groupBy({ it.first }) { it.second }
            .filterValues { it.size > 1 }
        for ((bookId, keys) in sameBooks) {
            addInGraph(keys.mapEachTwo { a, b -> Triple(a, b, ExistedRelationType(sameBooks = mutableSetOf(bookId))) })
        }

        //增补associate关系
        //添加了illustId < relatedIllustId的条件，节省查找结果
        data.db.from(AssociateRelations)
            .select()
            .where { AssociateRelations.illustId inList nodes.keys and (AssociateRelations.illustId less AssociateRelations.relatedIllustId) }
            .map { Triple(it[AssociateRelations.illustId]!!, it[AssociateRelations.relatedIllustId]!!, ExistedRelationType(sameAssociate = true)) }
            .let { addInGraph(it) }

        //增补ignored关系
        data.db.from(FindSimilarIgnores)
            .select(FindSimilarIgnores.secondTarget, FindSimilarIgnores.firstTarget)
            .where { FindSimilarIgnores.firstTarget inList nodes.keys.map { it.toString() } and (FindSimilarIgnores.firstTarget less FindSimilarIgnores.secondTarget) }
            .map { Triple(it[FindSimilarIgnores.firstTarget]!!.toInt(), it[FindSimilarIgnores.secondTarget]!!.toInt(), ExistedRelationType(ignored = true)) }
            .let { addInGraph(it) }
    }

    /**
     * 将添加一组图关系。
     */
    private fun addInGraph(adds: Iterable<Triple<Int, Int, RelationType>>) {
        val allEntityKeys = adds.asSequence().flatMap { sequenceOf(it.first, it.second) }.toSet()
        val allEntityInfo = entityLoader.loadImage(allEntityKeys, enableFilterBy = false).associateBy { it.id }
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