package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.exceptions.BaseException

/**
 * 当发生错误时，API返回所使用的通用数据结构。
 */
data class ErrorResult(val code: String, val message: String?, val info: Any?) {
    constructor(e: BaseException<*>): this(e.code, e.message, e.info)
}

/**
 * 列表API返回所用的通用数据结构。
 */
data class ListResult<T>(val total: Int, val result: List<T>)

/**
 * 返回ID的简单结构。
 */
data class IdRes(val id: Int)

/**
 * 返回id与警告信息的简单结构。
 */
data class IdResWithWarnings(val id: Int, val warnings: List<ErrorResult>)

/**
 * 批量操作返回的数据结构。
 */
data class BulkResult<I>(val success: Int, val failed: Int, val errors: List<Error<I>>) {
    data class Error<I>(val target: I, val error: ErrorResult)
}

/**
 * Ws接口使用的顶层通用结构。
 */
data class WsResult(val type: String, val data: Any?)

/**
 * 包含三种文件路径的通用结构。
 */
data class FilePath(val original: String, val thumbnail: String, val sample: String, val extension: String)

/**
 * 包含三种文件路径，但缩略图可空。
 */
data class NullableFilePath(val original: String, val thumbnail: String?, val sample: String?, val extension: String)
