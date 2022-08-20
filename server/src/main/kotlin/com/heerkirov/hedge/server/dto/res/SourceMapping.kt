package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.enums.MetaType

data class SourceMappingBatchQueryResult(val tag: String, val mappings: List<SourceMappingTargetItemDetail>)

data class SourceMappingTargetItemDetail(val metaType: MetaType, val metaTag: Any /* simple meta tag*/)

data class SourceMappingTargetItem(val metaType: MetaType, val metaId: Int)

data class MappingSourceTagDto(val site: String, val code: String, val name: String, val otherName: String?, val type: String?)
