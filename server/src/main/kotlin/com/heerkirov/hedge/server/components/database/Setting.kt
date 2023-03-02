package com.heerkirov.hedge.server.components.database

import com.heerkirov.hedge.server.enums.TagAuthorType
import com.heerkirov.hedge.server.enums.TagTopicType
import com.heerkirov.hedge.server.model.FindSimilarTask

data class Setting(
    val meta: MetaOption,
    val query: QueryOption,
    val source: SourceOption,
    val import: ImportOption,
    val findSimilar: FindSimilarOption
)

data class MetaOption(
    /**
     * score值的描述。[数组下标+1]表示要描述的分数。可以不写表示空出。范围是[0, 10)。
     */
    var scoreDescriptions: List<ScoreDescription?>,
    /**
     * 当编辑了对应的成份时，自动对illust的tagme做清理。
     */
    var autoCleanTagme: Boolean,
    /**
     * topic根据其type的不同配色。
     */
    var topicColors: Map<TagTopicType, String>,
    /**
     * author根据其type的不同配色。
     */
    var authorColors: Map<TagAuthorType, String>
) {
    data class ScoreDescription(val word: String, val content: String)
}

data class QueryOption(
    /**
     * 识别并转换HQL中的中文字符。
     */
    var chineseSymbolReflect: Boolean,
    /**
     * 将有限字符串中的下划线转义为空格。
     */
    var translateUnderscoreToSpace: Boolean,
    /**
     * 在元素向实体转换的查询过程中，每一个元素查询的结果的数量上限。此参数防止一个值在预查询中匹配了过多数量的结果。
     */
    var queryLimitOfQueryItems: Int,
    /**
     * 每一个元素合取项中，结果数量的警告阈值。此参数对过多的连接查询子项提出警告。
     */
    var warningLimitOfUnionItems: Int,
    /**
     * 合取项的总数的警告阈值。此参数对过多的连接查询层数提出警告。
     */
    var warningLimitOfIntersectItems: Int,
)

/**
 * 与原始数据相关的选项。
 */
data class SourceOption(
    /**
     * 注册在系统中的原始数据的site列表。此列表与SourceImage的source列值关联。
     */
    val sites: MutableList<Site>
) {
    data class Site(val name: String, var title: String, val hasSecondaryId: Boolean)
}

/**
 * 与导入相关的选项。
 */
data class ImportOption(
    /**
     * 在文件导入时，自动执行对sourceData的分析操作。
     */
    var autoAnalyseSourceData: Boolean,
    /**
     * 在文件导入时，自动设置tag、topic、author的tagme。
     */
    var setTagmeOfTag: Boolean,
    /**
     * 在文件导入时如果没有解析source或无source，自动设置source的tagme；analyseMeta时如果分析出了值，自动取消source的tagme。
     */
    var setTagmeOfSource: Boolean,
    /**
     * 导入的新文件的orderTime属性从什么属性派生。给出的可选项是几类文件的物理属性。
     * 其中有的属性是有可能不存在的。如果选用了这些不存在的属性，那么会去选用必定存在的属性，即IMPORT_TIME。
     */
    var setOrderTimeBy: TimeType,
    /**
     * 默认的分区时间从createTime截取。但是此属性将影响日期的范围，使延后一定时间的时间范围仍然算作昨天。单位ms。
     */
    var setPartitionTimeDelay: Long?,
    /**
     * 解析来源时，使用的规则列表。
     */
    var sourceAnalyseRules: List<SourceAnalyseRule>,
    /**
     * 监听目录导入功能所存储的默认目录列表。
     */
    var watchPaths: List<String>,
    /**
     * 程序启动时，自动开启监听目录功能。
     */
    var autoWatchPath: Boolean,
    /**
     * 监听目录功能将移动所监听到的文件。
     */
    var watchPathMoveFile: Boolean,
    /**
     * 监听目录功能会在开启时首先扫描一遍目录内已有的文件。
     * 一般来说建议开启此功能时也开启移动文件功能。
     */
    var watchPathInitialize: Boolean
) {
    enum class TimeType {
        IMPORT_TIME,
        CREATE_TIME,
        UPDATE_TIME
    }

    data class SourceAnalyseRule(val site: String, val regex: String, val idIndex: Int, val secondaryIdIndex: Int?)
}

/**
 * 与相似项查找相关的选项。
 */
data class FindSimilarOption(
    /**
     * 在导入项目时，自动触发相似项查找。
     */
    var autoFindSimilar: Boolean,
    /**
     * 自动出发查找时使用的配置。
     */
    var autoTaskConf: FindSimilarTask.TaskConfig?,
    /**
     * 提交手动查找时的默认配置。
     */
    var defaultTaskConf: FindSimilarTask.TaskConfig
)