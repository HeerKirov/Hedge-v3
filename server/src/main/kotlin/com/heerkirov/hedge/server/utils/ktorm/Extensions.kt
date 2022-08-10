package com.heerkirov.hedge.server.utils.ktorm

import org.ktorm.dsl.*
import org.ktorm.expression.BinaryExpression
import org.ktorm.expression.ScalarExpression
import org.ktorm.schema.Column


fun Query.first(): QueryRowSet = this.asIterable().first()

fun Query.firstOrNull(): QueryRowSet? = this.asIterable().firstOrNull()

fun Query.asSequence(): Sequence<QueryRowSet> = this.asIterable().asSequence()

infix fun <T : Any> Column<T>.eqOrIsNull(value: T?): ScalarExpression<Boolean> =
    if(value == null) this.isNull() else this.eq(value)