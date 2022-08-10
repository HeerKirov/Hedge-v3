package com.heerkirov.hedge.server.library.compiler.cli.grammar

import com.heerkirov.hedge.server.library.compiler.grammar.definintion.*
import com.heerkirov.hedge.server.library.compiler.grammar.runtime.SLRParser
import com.heerkirov.hedge.server.library.compiler.lexical.LexicalAnalyzer
import com.heerkirov.hedge.server.library.compiler.lexical.LexicalItem
import com.heerkirov.hedge.server.utils.Resources
import org.slf4j.LoggerFactory
import java.util.*

/**
 * 调用语法分析器处理一段语句，并打印处理全过程。
 */
fun main(args: Array<String>) {
    val text = args[0]

    val log = LoggerFactory.getLogger(AnalyzePrinter::class.java)
    val syntaxExpressions = readSyntaxExpression(Resources.getResourceAsText("syntax/syntax.txt"))
    val syntaxTable = readSyntaxTable(Resources.getResourceAsText("syntax/syntax-table.txt"))

    val lexicalResult = LexicalAnalyzer.parse(text)
    lexicalResult.warnings.forEach { log.warn(it.toString()) }
    lexicalResult.errors.forEach { log.error(it.toString()) }
    if(lexicalResult.result != null) {
        AnalyzePrinter(syntaxExpressions, syntaxTable).parse(lexicalResult.result)
    }
}

class AnalyzePrinter(syntaxExpressions: List<SyntaxExpression>, syntaxTable: SyntaxTable) : SLRParser(syntaxExpressions.associateBy { it.index }, syntaxTable) {
    private val symbolStack = LinkedList<String>()
    private var step = 0

    override fun before(stack: List<Int>, readIndex: Int, input: List<LexicalItem>, action: Action?) {
        println(String.format("%5s stack[%-30s] symbol[%-60s] input[%-25s] action: %s", "(${++step})",
            stack.reversed().joinToString(" "),
            symbolStack.reversed().joinToString(" "),
            input.subList(readIndex, input.size).joinToString(" ") { morphemeToNotation(it.morpheme) }.let { if(it.length > 25) it.substring(0, 25) else it },
            action ?: "ERROR"
        ))
    }

    override fun shift(lexical: LexicalItem) {
        symbolStack.push(morphemeToNotation(lexical.morpheme))
    }

    override fun reduce(reduceException: SyntaxExpression) {
        reduceException.sequence.indices.forEach { _ -> symbolStack.pop() }
        symbolStack.push(reduceException.key.key)
    }

    override fun error(actualLexical: LexicalItem, expected: List<String>) {
        //发生错误时，与SLR分析器行为保持一致，清空栈区
        symbolStack.clear()
    }
}