package com.heerkirov.hedge.server.library.compiler.translator.visual


data class VisualForecast(
    val type: String,
    val context: String,
    val suggestions: List<VisualForecastSuggestion>,
    val beginIndex: Int,
    val endIndex: Int,
    val fieldName: String? = null,
)

data class VisualForecastSuggestion(val name: String, val aliases: List<String>)
