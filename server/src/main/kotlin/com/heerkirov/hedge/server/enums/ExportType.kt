package com.heerkirov.hedge.server.enums

/**
 * 用于标记MetaTag的导出类型。
 */
enum class ExportType {
    /**
     * 非导出的、用户编辑的元数据标签。
     */
    NO,

    /**
     * 从用户编辑的标签导出的标签。
     */
    YES,

    /**
     * 从当前实体的关联实体获得的标签。
     */
    FROM_RELATED
}