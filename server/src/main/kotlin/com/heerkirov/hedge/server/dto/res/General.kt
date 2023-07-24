package com.heerkirov.hedge.server.dto.res

import com.heerkirov.hedge.server.exceptions.BaseException
import com.heerkirov.hedge.server.exceptions.BusinessException
import org.ktorm.dsl.Query
import org.ktorm.dsl.QueryRowSet
import org.ktorm.dsl.map

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
 * 进行查询的API返回所用的数据结构，附带了警告信息。
 */
data class QueryResult<T, E>(val total: Int, val result: List<T>, val warnings: List<E>)

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


inline fun <T, R> ListResult<T>.map(transform: (T) -> R): ListResult<R> {
    return ListResult(this.total, this.result.map(transform))
}

inline fun <T> Query.toListResult(transform: (QueryRowSet) -> T): ListResult<T> {
    return ListResult(this.totalRecords, this.map(transform))
}

inline fun <T, E> Query.toQueryResult(warnings: List<E>, transform: (QueryRowSet) -> T): QueryResult<T, E> {
    return QueryResult(this.totalRecords, this.map(transform), warnings)
}

inline fun <T, I> Iterable<T>.collectBulkResult(getIdentity: (T) -> I, execution: (T) -> Unit): BulkResult<I> {
    var success = 0
    val errors = mutableListOf<BulkResult.Error<I>>()
    for (item in this) {
        try {
            execution(item)

            success += 1
        }catch (e: Exception) {
            if(e is BusinessException) {
                errors.add(BulkResult.Error(getIdentity(item), ErrorResult(e.exception)))
            }else{
                errors.add(BulkResult.Error(getIdentity(item), ErrorResult("INTERNAL_ERROR", e.message, null)))
            }
        }
    }

    return BulkResult(success, errors.size, errors)
}

inline fun <T, I> collectBulkResult(noinline getIdentity: (T) -> I, execution: BulkResultCollector<T, I>.() -> Unit): BulkResult<I> {
    val collector = BulkResultCollector(getIdentity)
    collector.execution()
    return BulkResult(collector.success, collector.failed, collector.errors)
}

class BulkResultCollector<T, I>(val getIdentity: (T) -> I) {
    var success = 0
    var failed = 0
    val errors = mutableListOf<BulkResult.Error<I>>()
    inline fun <R> item(item: T, calc: Boolean = true, execution: () -> R): R? {
        return try {
            execution().also { if(calc) { success += 1 } }
        }catch (e: Exception) {
            if(calc) { failed += 1 }
            if(e is BusinessException) {
                errors.add(BulkResult.Error(getIdentity(item), ErrorResult(e.exception)))
            }else{
                errors.add(BulkResult.Error(getIdentity(item), ErrorResult("INTERNAL_ERROR", e.message, null)))
            }
            null
        }
    }
}