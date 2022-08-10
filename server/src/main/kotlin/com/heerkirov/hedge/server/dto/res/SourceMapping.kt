package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.enums.MetaType
import com.heerkirov.hedge.server.utils.types.Opt

data class SourceMappingBatchQueryResult(val tagName: String, val mappings: List<SourceMappingTargetItemDetail>)

data class SourceMappingTargetItemDetail(val metaType: MetaType, val metaTag: Any /* simple meta tag*/)

data class SourceMappingTargetItem(val metaType: MetaType, val metaId: Int)

data class SourceMappingMetaItem(val site: String, val code: String, val name: String, val otherName: String?, val type: String?)
