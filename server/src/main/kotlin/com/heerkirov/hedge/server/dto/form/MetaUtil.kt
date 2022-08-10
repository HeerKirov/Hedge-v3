package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.enums.IdentityType
import com.heerkirov.hedge.server.enums.MetaType

data class MetaUtilValidateForm(val topics: List<Int>?, val authors: List<Int>?, val tags: List<Int>?)

data class MetaUtilIdentityForm(val type: IdentityType, val id: Int)

data class MetaUtilMetaForm(val metas: List<MetaItem>) {
    data class MetaItem(val type: MetaType, val id: Int)
}