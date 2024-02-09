package com.heerkirov.hedge.server.library.compiler.semantic.plan

sealed interface Forecast {
    val type: String
    val beginIndex: Int
    val endIndex: Int
}

data class ForecastAnnotationElement(val item: MetaString, val metaType: MetaType?, val isForMeta: Boolean, override val beginIndex: Int, override val endIndex: Int) : Forecast {
    override val type get() = "annotation"
}

data class ForecastMetaTagElement(val address: MetaAddress, override val type: String, override val beginIndex: Int, override val endIndex: Int) : Forecast {
    init {
        if(type != "tag" && type != "topic" && type != "author") throw RuntimeException("Unsupported type $type.")
    }
}

data class ForecastSourceTagElement(val items: MetaAddress, override val beginIndex: Int, override val endIndex: Int) : Forecast {
    override val type get() = "source-tag"
}

data class ForecastOrder(val item: String, val enums: Collection<List<String>>, override val beginIndex: Int, override val endIndex: Int) : Forecast {
    override val type get() = "order"
}

data class ForecastFilter(val item: String, val fieldName: String, val enums: Collection<List<String>>, override val beginIndex: Int, override val endIndex: Int) : Forecast {
    override val type get() = "filter"
}