package com.heerkirov.hedge.server.library.compiler.utils

/**
 * 编译错误。
 */
abstract class CompileError<INFO : Any>(val code: Int, val message: String, val happenPosition: IndexRange?, val info: INFO? = null) {
    override fun equals(other: Any?): Boolean {
        return other === this || (other is CompileError<*> && other.code == this.code && other.message == this.message && other.happenPosition == this.happenPosition)
    }

    override fun hashCode(): Int {
        var result = code
        result = 31 * result + message.hashCode()
        result = 31 * result + happenPosition.hashCode()
        return result
    }

    override fun toString(): String {
        return "${this::class.simpleName}[$code](At $happenPosition)$message "
    }
}

/**
 * 词法分析错误。词法分析系列的code范围为1000~1999。
 */
abstract class LexicalError<INFO : Any>(code: Int, message: String, happenPositionIndex: IndexRange, info: INFO? = null) : CompileError<INFO>(code, message, happenPositionIndex, info)

/**
 * 语法分析错误。语法分析系列的code范围为2000~2999。
 */
abstract class GrammarError<INFO : Any>(code: Int, message: String, happenPositionIndex: IndexRange, info: INFO? = null) : CompileError<INFO>(code, message, happenPositionIndex, info)

/**
 * 语义分析错误。语义分析系列的code范围为3000~3999。
 */
abstract class SemanticError<INFO : Any>(code: Int, message: String, happenPositionIndex: IndexRange, info: INFO? = null) : CompileError<INFO>(code, message, happenPositionIndex, info)

/**
 * 执行计划翻译错误。制导翻译系列的code范围为4000~4999。
 */
abstract class TranslatorError<INFO : Any>(code: Int, message: String, info: INFO? = null) : CompileError<INFO>(code, message, null, info)
