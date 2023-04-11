package com.heerkirov.hedge.server.components.backend.similar

import com.heerkirov.hedge.server.enums.SimilarityType
import com.heerkirov.hedge.server.enums.SourceMarkType
import com.heerkirov.hedge.server.model.FindSimilarResult

/**
 * 将一个新的relationType添加到列表。它会处理与相同类型的relation的合并。
 */
fun MutableList<RelationType>.addNewRelation(newRelation: RelationType) {
    //根据relation的类型，需要处理同类relation的合并
    val relationList = this
    when (newRelation) {
        is SourceIdentityRelationType -> {
            val ext = relationList.filterIsInstance<SourceIdentityRelationType>().firstOrNull()
            if(ext != null) {
                if(newRelation.equal && !ext.equal) ext.equal = true
                ext.site = newRelation.site
                ext.sourceId = newRelation.sourceId
                ext.sourcePart = newRelation.sourcePart
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
                if(newRelation.samePreCollection != null) ext.samePreCollection = newRelation.samePreCollection
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

/**
 * 从relationType生成summaryTypes。
 */
fun getSummaryTypes(relationTypes: Set<RelationType>): FindSimilarResult.SummaryTypes {
    var same = false
    var similar = false
    var related = false
    for (it in relationTypes) {
        if(!same || !similar || !related) {
            when (it) {
                is SourceIdentityRelationType -> {
                    if(it.equal) {
                        same = true
                    }else{
                        related = true
                    }
                }
                is SourceRelatedRelationType -> {
                    related = true
                }
                is SourceMarkRelationType -> {
                    when(it.markType) {
                        SourceMarkType.SAME -> same = true
                        SourceMarkType.SIMILAR -> similar = true
                        else -> related = true
                    }
                }
                is SimilarityRelationType -> {
                    if(it.level >= 2) {
                        same = true
                    }else{
                        similar = true
                    }
                }
                is ExistedRelationType -> {}
            }
        }
    }
    var ret: FindSimilarResult.SummaryTypes = FindSimilarResult.SummaryTypes.EMPTY
    if(same) ret += FindSimilarResult.SummaryTypes.SAME
    if(similar) ret += FindSimilarResult.SummaryTypes.SIMILAR
    if(related) ret += FindSimilarResult.SummaryTypes.RELATED
    return ret
}

/**
 * 从summaryTypes生成sortPriority。
 */
fun getSortPriority(summaryTypes: FindSimilarResult.SummaryTypes): Int {
    return if(FindSimilarResult.SummaryTypes.SAME in summaryTypes) {
        3
    }else if(FindSimilarResult.SummaryTypes.RELATED in summaryTypes) {
        2
    }else{
        1
    }
}

/**
 * 将relationType转换至similarityType。
 */
fun RelationType.toRelationType(): SimilarityType {
    return when (this) {
        is SourceIdentityRelationType -> if(equal) {
            SimilarityType.SOURCE_IDENTITY_EQUAL
        }else{
            SimilarityType.SOURCE_IDENTITY_SIMILAR
        }
        is SourceRelatedRelationType -> {
            SimilarityType.SOURCE_RELATED
        }
        is SourceMarkRelationType -> when(markType) {
            SourceMarkType.SAME -> SimilarityType.RELATION_MARK_SAME
            SourceMarkType.SIMILAR -> SimilarityType.RELATION_MARK_SIMILAR
            else -> SimilarityType.RELATION_MARK_RELATED
        }
        is SimilarityRelationType -> if(level >= 2) {
            SimilarityType.TOO_HIGH_SIMILARITY
        }else{
            SimilarityType.HIGH_SIMILARITY
        }
        is ExistedRelationType -> SimilarityType.EXISTED
    }
}

/**
 * 将relationType转换至db存储的relationInfo。
 */
fun RelationType.toRecordInfo(): FindSimilarResult.RelationInfo {
    return when (this) {
        is SourceIdentityRelationType -> FindSimilarResult.SourceIdentityRelationInfo(site, sourceId, sourcePart)
        is SourceRelatedRelationType -> FindSimilarResult.SourceRelatedRelationInfo(hasRelations, sameBooks?.toList() ?: emptyList())
        is SourceMarkRelationType -> FindSimilarResult.SourceMarkRelationInfo(markType)
        is SimilarityRelationType -> FindSimilarResult.SimilarityRelationInfo(similarity)
        is ExistedRelationType -> FindSimilarResult.ExistedRelationInfo(sameCollectionId, samePreCollection, sameBooks?.toList() ?: emptyList(), sameAssociate, ignored)
    }
}

/**
 * 从db生成relationType。
 */
fun getRelationType(type: SimilarityType, params: FindSimilarResult.RelationInfo?): RelationType {
    return when(type) {
        SimilarityType.SOURCE_IDENTITY_EQUAL,
        SimilarityType.SOURCE_IDENTITY_SIMILAR -> {
            val info = params as FindSimilarResult.SourceIdentityRelationInfo
            SourceIdentityRelationType(info.site, info.sourceId, info.sourcePart, type == SimilarityType.SOURCE_IDENTITY_EQUAL)
        }
        SimilarityType.SOURCE_RELATED -> {
            val info = params as FindSimilarResult.SourceRelatedRelationInfo
            SourceRelatedRelationType(info.hasRelations, info.sameBooks.toMutableSet())
        }
        SimilarityType.RELATION_MARK_SAME,
        SimilarityType.RELATION_MARK_RELATED,
        SimilarityType.RELATION_MARK_SIMILAR -> {
            val info = params as FindSimilarResult.SourceMarkRelationInfo
            SourceMarkRelationType(info.markType)
        }
        SimilarityType.TOO_HIGH_SIMILARITY,
        SimilarityType.HIGH_SIMILARITY -> {
            val info = params as FindSimilarResult.SimilarityRelationInfo
            SimilarityRelationType(info.similarity, if(type == SimilarityType.TOO_HIGH_SIMILARITY) 2 else 1)
        }
        SimilarityType.EXISTED -> {
            val info = params as FindSimilarResult.ExistedRelationInfo
            ExistedRelationType(info.sameCollectionId, info.samePreCollection, info.sameBooks.toMutableSet(), info.sameAssociate, info.ignored)
        }
    }
}

/**
 * 合并两个关系群组。
 */
fun <T> mergeRelations(relations: Map<T, List<RelationType>>, newRelations: Map<T, List<RelationType>>): Map<T, List<RelationType>> {
    val ret = mutableMapOf<T, List<RelationType>>()
    for(key in (relations.keys + newRelations.keys)) {
        val r = relations[key]?.toMutableList() ?: mutableListOf()
        val nr = newRelations[key] ?: emptyList()
        for (newRelation in nr) {
            for (relationType in nr) {
                r.addNewRelation(relationType)
            }
        }
        if(r.isNotEmpty()) ret[key] = r
    }
    return ret
}