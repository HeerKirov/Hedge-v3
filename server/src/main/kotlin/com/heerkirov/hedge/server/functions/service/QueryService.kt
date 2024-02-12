package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.dto.res.QueryForecastRes
import com.heerkirov.hedge.server.dto.res.QueryRes
import com.heerkirov.hedge.server.functions.manager.query.QueryManager

class QueryService(private val queryManager: QueryManager) {
    /**
     * 对HQL进行schema查询，获得schema信息和错误列表。
     * 这个API用于任务HQL查询执行之前，构建查询信息和报错。
     */
    fun querySchema(text: String, dialect: QueryManager.Dialect): QueryRes {
        val querySchema = queryManager.querySchema(text, dialect)
        return QueryRes(querySchema.visualQueryPlan, querySchema.warnings, querySchema.errors)
    }

    /**
     * 对HQL进行语法和语义分析，获得语义分段和当前输入预测。
     * 这个API用于HQL查询输入时，对当前输入内容进行高亮显示和提出建议。
     */
    fun queryForecast(text: String, cursorIndex: Int?, dialect: QueryManager.Dialect): QueryForecastRes {
        val analysis = queryManager.forecast(text, cursorIndex, dialect)
        return QueryForecastRes(analysis != null, analysis)
    }
}