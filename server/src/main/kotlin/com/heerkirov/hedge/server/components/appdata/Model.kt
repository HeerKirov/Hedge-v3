package com.heerkirov.hedge.server.components.appdata

import com.heerkirov.hedge.server.enums.TagAuthorType
import com.heerkirov.hedge.server.enums.TagTopicType
import com.heerkirov.hedge.server.model.FindSimilarTask

data class AppData(
    val server: ServerOption,
    val storage: StorageOption,
    val meta: MetaOption,
    val query: QueryOption,
    val source: SourceOption,
    val import: ImportOption,
    val findSimilar: FindSimilarOption
)

/**
 * 后端服务本身的选项。
 */
data class ServerOption(
    /**
     * 后端服务建议使用的端口。
     */
    var port: String?,
    /**
     * 后端服务固定可用的token。
     */
    var token: String?,
    /**
     * 在各处有关日期的判定中，每天的日期范围的推迟时间量。
     */
    var timeOffsetHour: Int?
)

/**
 * 与存储相关的选项。
 */
data class StorageOption(
    /**
     * 数据存储目录。
     */
    var storagePath: String?,
    /**
     * 自动清理已删除的项。
     */
    var autoCleanTrashes: Boolean,
    /**
     * 自动清理已删除项的间隔天数。
     */
    var autoCleanTrashesIntervalDay: Int,
    /**
     * 自动清理长期未访问的缓存。
     */
    var autoCleanCaches: Boolean,
    /**
     * 自动清理缓存的间隔天数。
     */
    var autoCleanCachesIntervalDay: Int,
    /**
     * 区块最大可储存的容量。
     */
    var blockMaxSizeMB: Long,
    /**
     * 区块最大可储存的数量。
     */
    var blockMaxCount: Int
)

/**
 * 与元数据有关的选项。
 */
data class MetaOption(
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
)

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
 * 与来源数据相关的选项。
 */
data class SourceOption(
    /**
     * 注册在系统中的原始数据的site列表。此列表与SourceImage的source列值关联。
     */
    val sites: MutableList<Site>
) {
    data class Site(val name: String,
                    var title: String,
                    val partMode: SitePartMode,
                    var availableAdditionalInfo: List<AvailableAdditionalInfo>,
                    var sourceLinkGenerateRules: List<String>,
                    var availableTypes: List<String>)

    data class AvailableAdditionalInfo(val field: String, val label: String)

    enum class SitePartMode {
        /**
         * 禁用分页。
         */
        NO,
        /**
         * 仅允许页码。
         */
        PAGE,
        /**
         * 允许页码，且允许可选的页名。
         */
        PAGE_WITH_NAME
    }
}

/**
 * 与导入相关的选项。
 */
data class ImportOption(
    /**
     * 启用来源分析规则来解析文件的来源信息。
     */
    var autoAnalyseSourceData: Boolean,
    /**
     * 阻止没有来源信息的项被导入。这有利于保证所有导入项都有来源。
     */
    var preventNoneSourceData: Boolean,
    /**
     * 在文件导入时，自动设置tag、topic、author、source的tagme。
     */
    var setTagmeOfTag: Boolean,
    /**
     * 导入的新文件的orderTime属性从什么属性派生。给出的可选项是几类文件的物理属性。
     * 其中有的属性是有可能不存在的。如果选用了这些不存在的属性，那么会去选用必定存在的属性，即IMPORT_TIME。
     */
    var setOrderTimeBy: TimeType,
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

    data class SourceAnalyseRule(val site: String, val regex: String, val idGroup: String, val partGroup: String?, val partNameGroup: String?, val extras: List<SourceAnalyseRuleExtra>?)

    data class SourceAnalyseRuleExtra(val group: String, val target: SourceAnalyseRuleExtraTarget, val optional: Boolean, val tagType: String? = null, val additionalInfoField: String? = null, val translateUnderscoreToSpace: Boolean)

    enum class SourceAnalyseRuleExtraTarget {
        TITLE,
        DESCRIPTION,
        ADDITIONAL_INFO,
        TAG,
        BOOK,
        RELATION
    }
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
