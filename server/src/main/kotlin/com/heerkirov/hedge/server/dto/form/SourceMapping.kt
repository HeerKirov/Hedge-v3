package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.utils.types.Opt


data class SourceMappingBatchQueryForm(val site: String, val tagNames: List<String>)

data class SourceMappingMetaItemForm(val site: String, val code: String, val name: Opt<String>, val displayName: Opt<String?>, val type: Opt<String?>)