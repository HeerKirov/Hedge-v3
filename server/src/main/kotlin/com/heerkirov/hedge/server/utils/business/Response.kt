package com.heerkirov.hedge.server.utils.business

import com.heerkirov.hedge.server.dao.Illusts
import com.heerkirov.hedge.server.dto.res.BulkResult
import com.heerkirov.hedge.server.dto.res.ErrorResult
import com.heerkirov.hedge.server.dto.res.ListResult
import com.heerkirov.hedge.server.dto.res.SourceDataPath
import com.heerkirov.hedge.server.exceptions.BusinessException
import org.ktorm.dsl.Query
import org.ktorm.dsl.QueryRowSet
import org.ktorm.dsl.map

fun sourcePathOfNullable(sourceSite: String?, sourceId: String?, sourcePart: Int?, sourcePartName: String?): SourceDataPath? {
    return if(sourceSite != null && sourceId != null) SourceDataPath(sourceSite, sourceId, sourcePart, sourcePartName) else null
}

fun sourcePathOf(sourceSite: String, sourceId: String, sourcePart: Int?, sourcePartName: String?): SourceDataPath {
    return SourceDataPath(sourceSite, sourceId, sourcePart, sourcePartName)
}

fun sourcePathOf(row: QueryRowSet): SourceDataPath? {
    val source = row[Illusts.sourceSite]
    val sourceId = row[Illusts.sourceId]
    val sourcePart = row[Illusts.sourcePart]
    val sourcePartName = row[Illusts.sourcePartName]
    return if(source != null && sourceId != null) SourceDataPath(source, sourceId, sourcePart, sourcePartName) else null
}

val sourcePathComparator = compareBy<SourceDataPath> { it.sourceSite }.thenBy { it.sourceId }.thenBy { it.sourcePart }

inline fun <T, R> ListResult<T>.map(transform: (T) -> R): ListResult<R> {
    return ListResult(this.total, this.result.map(transform))
}

inline fun <T> Query.toListResult(transform: (QueryRowSet) -> T): ListResult<T> {
    return ListResult(this.totalRecordsInAllPages, this.map(transform))
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