package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.library.compiler.translator.visual.VisualForecast
import com.heerkirov.hedge.server.library.compiler.translator.visual.VisualQueryPlan
import com.heerkirov.hedge.server.library.compiler.utils.CompileError

data class QueryRes(val queryPlan: VisualQueryPlan?, val warnings: List<CompileError<*>>, val errors: List<CompileError<*>>)

data class QueryForecastRes(val succeed: Boolean, val forecast: VisualForecast?)