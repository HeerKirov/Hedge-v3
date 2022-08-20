package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.utils.types.Opt


data class SourceMappingBatchQueryForm(val site: String, val tags: List<String>)

data class MappingSourceTagForm(val site: String, val code: String, val name: Opt<String>, val otherName: Opt<String?>, val type: Opt<String?>)