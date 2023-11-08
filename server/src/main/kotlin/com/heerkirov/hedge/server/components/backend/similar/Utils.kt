package com.heerkirov.hedge.server.components.backend.similar

import com.heerkirov.hedge.server.model.FindSimilarResult

/**
 * 将一个新的edgeType添加到列表。它会处理与相同类型的edgeType的合并。
 */
fun MutableList<FindSimilarResult.RelationEdgeType>.addNewEdge(newEdge: FindSimilarResult.RelationEdgeType) {
    //根据relation的类型，需要处理同类relation的合并
    val relationList = this
    when (newEdge) {
        is FindSimilarResult.SourceIdentityEqual -> {
            val ext = relationList.filterIsInstance<FindSimilarResult.SourceIdentityEqual>().firstOrNull()
            if(ext == null) {
                relationList.add(newEdge)
            }
        }
        is FindSimilarResult.SourceRelated -> {
            val ext = relationList.filterIsInstance<FindSimilarResult.SourceRelated>().firstOrNull()
            if(ext == null) {
                relationList.add(newEdge)
            }
        }
        is FindSimilarResult.HighSimilarity -> {
            val ext = relationList.filterIsInstance<FindSimilarResult.HighSimilarity>().firstOrNull()
            if(ext == null) {
                relationList.add(newEdge)
            }
        }
        is FindSimilarResult.Associated -> {
            val ext = relationList.filterIsInstance<FindSimilarResult.Associated>().firstOrNull()
            if(ext == null) {
                relationList.add(newEdge)
            }
        }
        is FindSimilarResult.Ignored -> {
            val ext = relationList.filterIsInstance<FindSimilarResult.Ignored>().firstOrNull()
            if(ext == null) {
                relationList.add(newEdge)
            }
        }
    }
}

/**
 * 判断GraphEdge是否包含任意“已存在关系”。
 */
fun GraphEdge.isExistedRelation(): Boolean {
    return this.relations.any { it is FindSimilarResult.Associated || it is FindSimilarResult.Ignored }
}

/**
 * 判断GraphCoverage是否是“已存在关系”。
 */
fun GraphCoverage.isExistedRelation(): Boolean {
    return this.ignored || this.type is FindSimilarResult.SourceIdentitySimilarCoverage || this.type is FindSimilarResult.SourceBookCoverage
}

/**
 * 从relationType生成category。
 */
fun getSimilarityCategory(edgeTypes: Set<FindSimilarResult.RelationEdgeType>): FindSimilarResult.SimilarityCategory {
    return if(edgeTypes.any { it !is FindSimilarResult.SourceIdentityEqual }) FindSimilarResult.SimilarityCategory.GRAPH else FindSimilarResult.SimilarityCategory.EQUIVALENCE
}

/**
 * 从relationType生成summaryTypes。
 */
fun getSummaryType(edgeTypes: Set<FindSimilarResult.RelationEdgeType>): FindSimilarResult.SummaryTypes {
    var equivalence = false
    var similar = false
    var related = false
    for (it in edgeTypes) {
        if(equivalence && similar && related) break
        when (it) {
            is FindSimilarResult.SourceIdentityEqual -> {
                equivalence = true
            }
            is FindSimilarResult.SourceRelated -> {
                related = true
            }
            is FindSimilarResult.HighSimilarity -> {
                similar = true
            }
            is FindSimilarResult.Associated, FindSimilarResult.Ignored -> {}
        }
    }
    var ret: FindSimilarResult.SummaryTypes = FindSimilarResult.SummaryTypes.EMPTY
    if(equivalence) ret += FindSimilarResult.SummaryTypes.EQUIVALENCE
    if(similar) ret += FindSimilarResult.SummaryTypes.SIMILAR
    if(related) ret += FindSimilarResult.SummaryTypes.RELATED
    return ret
}

/**
 * 合并两组边。
 */
fun <T> mergeEdges(relations: Map<T, List<FindSimilarResult.RelationEdgeType>>, newRelations: Map<T, List<FindSimilarResult.RelationEdgeType>>): Map<T, List<FindSimilarResult.RelationEdgeType>> {
    val ret = mutableMapOf<T, List<FindSimilarResult.RelationEdgeType>>()
    for(key in (relations.keys + newRelations.keys)) {
        val r = relations[key]?.toMutableList() ?: mutableListOf()
        val nr = newRelations[key] ?: emptyList()
        for (newRelation in nr) {
            for (relationType in nr) {
                r.addNewEdge(relationType)
            }
        }
        if(r.isNotEmpty()) ret[key] = r
    }
    return ret
}

/**
 * 合并两组覆盖关系。
 */
fun mergeCoverages(coverages: List<FindSimilarResult.RelationCoverage>, newCoverages: List<FindSimilarResult.RelationCoverage>): List<FindSimilarResult.RelationCoverage> {
    val coveragesMap = coverages.associateBy { it.info }
    val newCoveragesMap = newCoverages.associateBy { it.info }
    return (coveragesMap.keys + newCoveragesMap.keys).map { key ->
        val c = coveragesMap[key]
        val nc = newCoveragesMap[key]
        if(nc == null) { c!! } else if(c == null) { nc } else { FindSimilarResult.RelationCoverage((c.imageIds + nc.imageIds).distinct(), key, nc.ignored) }
    }
}