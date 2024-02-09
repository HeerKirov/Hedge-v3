package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.functions.manager.query.QueryManager

data class QueryForm(val text: String, val dialect: QueryManager.Dialect)

data class TextAnalyseForm(val text: String, val cursorIndex: Int? = null, val dialect: QueryManager.Dialect)