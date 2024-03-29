package com.heerkirov.hedge.server.functions.service

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.components.database.transaction
import com.heerkirov.hedge.server.dto.res.QueryForecastRes
import com.heerkirov.hedge.server.dto.res.QueryRes
import com.heerkirov.hedge.server.functions.manager.HistoryRecordManager
import com.heerkirov.hedge.server.functions.manager.query.QueryManager
import com.heerkirov.hedge.server.model.HistoryRecord

class QueryService(private val data: DataRepository, private val queryManager: QueryManager, private val historyRecordManager: HistoryRecordManager) {
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

    fun getQueryHistory(dialect: QueryManager.Dialect): List<String> {
        return historyRecordManager.getHistory(HistoryRecord.HistoryType.QUERY, dialect.name, 10)
    }

    fun pushQueryHistory(dialect: QueryManager.Dialect, query: String) {
        if(query.isNotBlank()) {
            data.db.transaction {
                historyRecordManager.push(HistoryRecord.HistoryType.QUERY, dialect.name, query)
            }
        }
    }

    fun clearQueryHistory(dialect: QueryManager.Dialect) {
        historyRecordManager.clear(HistoryRecord.HistoryType.QUERY, dialect.name)
    }
}