package com.heerkirov.hedge.server.utils.ktorm

import com.heerkirov.hedge.server.utils.composition.Composition
import com.heerkirov.hedge.server.utils.ktorm.type.CompositionType
import org.ktorm.expression.ArgumentExpression
import org.ktorm.expression.ScalarExpression
import org.ktorm.schema.BooleanSqlType
import org.ktorm.schema.ColumnDeclaring
import org.ktorm.schema.SqlType
import org.ktorm.schema.VarcharSqlType

data class CompositionEmptyExpression<T : Composition<T>>(
    val left: ScalarExpression<T>,
    override val sqlType: SqlType<Boolean> = BooleanSqlType,
    override val isLeafNode: Boolean = false,
    override val extraProperties: Map<String, Any> = emptyMap()
) : ScalarExpression<Boolean>()

data class CompositionContainExpression<T : Composition<T>>(
    val left: ScalarExpression<T>,
    val right: ScalarExpression<T>,
    override val sqlType: SqlType<Boolean> = BooleanSqlType,
    override val isLeafNode: Boolean = false,
    override val extraProperties: Map<String, Any> = emptyMap()
) : ScalarExpression<Boolean>()

/**
 * 面向composition类型的计算：判断是否为空值。
 */
inline fun <reified T : Composition<T>> ColumnDeclaring<T>.compositionEmpty(): CompositionEmptyExpression<T> {
    return CompositionEmptyExpression(asExpression())
}

/**
 * 面向composition类型的计算：判断left是否完全包含right的值。
 */
inline infix fun <reified T : Composition<T>> ColumnDeclaring<T>.compositionContains(argument: T): CompositionContainExpression<T> {
    return CompositionContainExpression(asExpression(), ArgumentExpression(argument, CompositionType(T::class)))
}

data class CompositionAnyExpression<T : Composition<T>>(
    val left: ScalarExpression<T>,
    val right: ScalarExpression<T>,
    override val sqlType: SqlType<Boolean> = BooleanSqlType,
    override val isLeafNode: Boolean = false,
    override val extraProperties: Map<String, Any> = emptyMap()
) : ScalarExpression<Boolean>()

/**
 * 面向composition类型的计算：判断left是否包含right的任一原子值。
 */
inline infix fun <reified T : Composition<T>> ColumnDeclaring<T>.compositionAny(argument: T): CompositionAnyExpression<T> {
    return CompositionAnyExpression(asExpression(), ArgumentExpression(argument, CompositionType(T::class)))
}

data class EscapeExpression(
    val left: ScalarExpression<*>,
    val argument: ArgumentExpression<String>,
    val escape: ArgumentExpression<String>,
    override val sqlType: SqlType<Boolean> = BooleanSqlType,
    override val isLeafNode: Boolean = false,
    override val extraProperties: Map<String, Any> = emptyMap()
) : ScalarExpression<Boolean>()

/**
 * like运算，并使用escape转义。转义符号固定为'\'。
 */
infix fun ColumnDeclaring<*>.escapeLike(argument: String): ScalarExpression<Boolean> {
    return EscapeExpression(asExpression(), ArgumentExpression(argument, VarcharSqlType), ArgumentExpression("\\", VarcharSqlType))
}