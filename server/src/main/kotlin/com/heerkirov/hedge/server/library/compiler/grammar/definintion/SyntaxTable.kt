package com.heerkirov.hedge.server.library.compiler.grammar.definintion

import kotlin.math.max

//语法分析表的定义，作用是和syntax-table.txt中的定义对应。

class SyntaxTable(internal val actionTable: Array<Array<Action?>>,
                  internal val gotoTable: Array<Array<Int?>>,
                  private val actionMap: Map<String, Int>,
                  private val gotoMap: Map<String, Int>) {
    private val reflectActionMap by lazy { actionMap.asSequence().map { (k, v) -> v to k }.toMap() }

    val statusCount: Int get() = actionTable.size

    val actionNotations: Set<String> get() = actionMap.keys

    val gotoNotations: Set<String> get() = gotoMap.keys

    fun getAction(status: Int, terminalNotation: String): Action? {
        val i = actionMap[terminalNotation] ?: throw RuntimeException("Action $terminalNotation is not exist.")
        return actionTable[status][i]
    }

    fun getGoto(status: Int, nonTerminalNotation: String): Int? {
        val i = gotoMap[nonTerminalNotation] ?: throw RuntimeException("Goto $nonTerminalNotation is not exist.")
        return gotoTable[status][i]
    }

    fun getExpected(status: Int): List<String> {
        return actionTable[status].asSequence()
            .mapIndexed { i, action -> i to action }
            .filter { (_, action) -> action != null }
            .map { (i, _) -> reflectActionMap[i]!! }
            .toList()
    }
}

/**
 * ACTION的指令。
 */
sealed class Action

data class Shift(val status: Int) : Action() {
    override fun toString() = "Shift($status)"
}

data class Reduce(val syntaxExpressionIndex: Int) : Action() {
    override fun toString() = "Reduce($syntaxExpressionIndex)"
}

object Accept : Action() {
    override fun toString() = "Accept"
}

/**
 * 读取并生成语法分析表的定义。
 */
fun readSyntaxTable(text: String): SyntaxTable {
    val lines = text.split("\n")
        .filter { it.isNotBlank() }
        .apply { if(isEmpty()) throw RuntimeException("Text of syntax table is empty.") }
        .map { it.split(Regex("\\s+")).filter { i -> i.isNotBlank() } }

    val head = lines.first().apply { if(isEmpty()) throw RuntimeException("Table head is empty.") }
    val terminalNum = head.first().toInt()
    val actionMap = head.subList(1, terminalNum + 1).asSequence().mapIndexed { i, s -> s to i }.toMap()
    val gotoMap = head.subList(terminalNum + 1, head.size).asSequence().mapIndexed { i, s -> s to i }.toMap()

    val (action, goto) = lines.subList(1, lines.size).asSequence().map { row ->
        val action = row.subList(1, terminalNum + 1).map {
            when {
                it == "_" -> null
                it == "acc" -> Accept
                it.startsWith("s") -> Shift(it.substring(1).toInt())
                it.startsWith("r") -> Reduce(it.substring(1).toInt())
                else -> throw RuntimeException("Unknown action '$it'.")
            }
        }.toTypedArray()
        val goto = row.subList(terminalNum + 1, row.size).map { if(it == "_") null else it.toInt() }.toTypedArray()
        Pair(action, goto)
    }.unzip()

    val actionTable = action.toTypedArray()
    val gotoTable = goto.toTypedArray()

    return SyntaxTable(actionTable, gotoTable, actionMap, gotoMap)
}

/**
 * 将语法分析表打印为文本定义。
 */
fun printSyntaxTable(table: SyntaxTable): String {
    //将action和goto表to string
    val actionTable = table.actionTable.map { row ->
        row.map { action ->
            if(action == null) "_" else when (action) {
                is Shift -> "s${action.status}"
                is Reduce -> "r${action.syntaxExpressionIndex}"
                is Accept -> "acc"
            }
        }
    }
    val gotoTable = table.gotoTable.map { row -> row.map { goto -> goto?.toString() ?: "_" } }
    //取得首列、action列、goto列的宽度
    val statusColWidth = max(table.statusCount.toString().length, table.actionNotations.size.toString().length)
    val actionColWidth = max(table.actionNotations.maxOf { it.length }, actionTable.flatten().maxOf { it.length })
    val gotoColWidth = max(table.gotoNotations.maxOf { it.length }, gotoTable.flatten().maxOf { it.length })

    val head = String.format("%-${statusColWidth}s %s %s",
        table.actionNotations.size,
        table.actionNotations.joinToString(" ") { String.format("%-${actionColWidth}s", it) },
        table.gotoNotations.joinToString(" ") { String.format("%-${gotoColWidth}s", it) }
    )
    val body = actionTable.zip(gotoTable).mapIndexed { i, (actionRow, gotoRow) ->
        String.format("%-${statusColWidth}s %s %s", i,
            actionRow.joinToString(" ") { String.format("%-${actionColWidth}s", it) },
            gotoRow.joinToString(" ") { String.format("%-${gotoColWidth}s", it) }
        )
    }.joinToString("\n")

    return "$head\n$body"
}