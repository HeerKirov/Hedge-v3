package com.heerkirov.hedge.server.utils.ktorm

import org.ktorm.database.Database
import org.ktorm.expression.SqlExpression
import org.ktorm.expression.SqlFormatter
import org.ktorm.support.sqlite.SQLiteDialect
import org.ktorm.support.sqlite.SQLiteFormatter

class HedgeDialect : SQLiteDialect() {
    override fun createSqlFormatter(database: Database, beautifySql: Boolean, indentSize: Int): SqlFormatter {
        return HedgeSqlFormatter(database, beautifySql, indentSize)
    }
}

class HedgeSqlFormatter(database: Database, beautifySql: Boolean, indentSize: Int) : SQLiteFormatter(database, beautifySql, indentSize) {
    override fun visitUnknown(expr: SqlExpression): SqlExpression {
        return when (expr) {
            is CompositionEmptyExpression<*> -> {
                // (left) = 0
                write("(")
                if(expr.left.removeBrackets) {
                    visit(expr.left)
                }else{
                    write("( "); visit(expr.left); removeLastBlank(); write(") ")
                }
                write(")=0 ")

                expr
            }
            is CompositionContainExpression<*> -> {
                // (~left & right) = 0
                write("(")
                if(expr.left.removeBrackets) {
                    write("~ "); visit(expr.left)
                }else{
                    write("(~ "); visit(expr.left); removeLastBlank(); write(") ")
                }
                write("& ")

                if(expr.right.removeBrackets) {
                    visit(expr.right)
                }else{
                    write("("); visit(expr.right); removeLastBlank(); write(") ")
                }
                write(")=0 ")

                expr
            }
            is CompositionAnyExpression<*> -> {
                // (left & right) <> 0
                write("(")
                if(expr.left.removeBrackets) {
                    visit(expr.left)
                }else{
                    write("( "); visit(expr.left); removeLastBlank(); write(") ")
                }
                write("& ")

                if(expr.right.removeBrackets) {
                    visit(expr.right)
                }else{
                    write("("); visit(expr.right); removeLastBlank(); write(") ")
                }
                write(")<>0 ")

                expr
            }
            is EscapeExpression -> {
                if(expr.left.removeBrackets) {
                    visit(expr.left)
                }else{
                    write("("); visit(expr.left); removeLastBlank(); write(") ")
                }
                write("like ")
                if (expr.argument.removeBrackets) {
                    visit(expr.argument)
                } else {
                    write("("); visit(expr.argument); removeLastBlank(); write(") ")
                }
                write("escape ")
                if (expr.escape.removeBrackets) {
                    visit(expr.escape)
                } else {
                    write("("); visit(expr.escape); removeLastBlank(); write(") ")
                }

                expr
            }
            is RowNumberExpression -> {
                write("row_number() OVER (ORDER BY ")
                visitOrderByList(expr.orders)
                removeLastBlank()
                write(") ")

                expr
            }
            else -> {
                super.visitUnknown(expr)
            }
        }
    }
}