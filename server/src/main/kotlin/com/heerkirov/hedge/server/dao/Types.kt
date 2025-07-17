package com.heerkirov.hedge.server.dao

import org.ktorm.schema.BaseTable
import org.ktorm.schema.Column
import java.time.Instant

/**
 * 实体和标签关系表的抽象表。
 */
abstract class EntityMetaRelationTable<T : Any>(tableName: String, schema: String? = null, alias: String? = null) : BaseTable<T>(tableName = tableName, schema = schema, alias = alias) {
    abstract fun entityId(): Column<Int>
    abstract fun metaId(): Column<Int>
    abstract fun exported(): Column<Boolean>
}

/**
 * 标签表。
 */
abstract class MetaTagTable<T : Any>(tableName: String, schema: String? = null, alias: String? = null) : BaseTable<T>(tableName = tableName, schema = schema, alias = alias) {
    abstract val id: Column<Int>
    abstract val name: Column<String>
    abstract val otherNames: Column<List<String>>
    abstract val implicitNames: Column<List<String>>
    abstract val cachedCount: Column<Int>
    abstract val updateTime: Column<Instant>
}
