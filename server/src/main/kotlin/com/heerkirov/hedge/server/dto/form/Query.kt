package com.heerkirov.hedge.server.dto.form

import com.heerkirov.hedge.server.functions.manager.query.QueryManager

data class QueryForm(val text: String, val dialect: QueryManager.Dialect)