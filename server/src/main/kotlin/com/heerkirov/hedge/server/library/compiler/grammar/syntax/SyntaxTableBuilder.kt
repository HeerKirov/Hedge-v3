package com.heerkirov.hedge.server.library.compiler.grammar.syntax

import com.heerkirov.hedge.server.library.compiler.grammar.definintion.*
import org.slf4j.LoggerFactory
import java.util.*
import kotlin.collections.HashMap

/**
 * 执行将文法产生式编译为语法分析表的过程。
 */
object SyntaxTableBuilder {
    private val log = LoggerFactory.getLogger(SyntaxTableBuilder::class.java)

    /**
     * 给出一组文法产生式。构造一张语法分析表。
     */
    fun parse(syntaxExpressions: List<SyntaxExpression>): SyntaxTable {
        //创建增广文法G'
        val expandExpressions = expand(syntaxExpressions)
        //构建增广文法的LR(0)自动机
        val states = SyntaxFamilyBuilder(expandExpressions).parse()
        //使用自动机构造分析表
        return buildSyntaxTable(states, follow(syntaxExpressions))
    }

    /**
     * 将原始文法产生式扩展为增广文法，主要是添了一句根产生式。
     */
    private fun expand(syntaxExpressions: List<SyntaxExpression>): List<ExpandExpression> {
        val root = ExpandExpression(0, null, listOf(syntaxExpressions.first().key))
        return listOf(root) + syntaxExpressions.map { ExpandExpression(it.index, it.key, it.sequence) }
    }

    /**
     * 从自动机构建词法分析表。
     */
    private fun buildSyntaxTable(states: List<SyntaxItemState>, follows: Map<String, Set<TerminalNotation>>): SyntaxTable {
        val action = HashMap<Int, HashMap<TerminalNotation, Action>>()
        val goto = HashMap<Int, HashMap<String, Int>>()

        fun setAction(state: Int, key: TerminalNotation, value: Action) {
            val map = action.computeIfAbsent(state) { HashMap() }
            if(key in map) {
                //发生词法分析表冲突时，基本上是那个设计上的冲突点了。此时默认沿用更早的一项规约行为
                log.warn("Conflict command in ($state, ACTION[$key]), new command is [$value] but [${map[key]}] exists.")
            }else{
                map[key] = value
            }
        }
        fun setGoto(state: Int, nonTerminalSymbol: String, gotoState: Int) {
            goto.computeIfAbsent(state) { HashMap() }[nonTerminalSymbol] = gotoState
        }

        for (state in states) {
            //goto记录的状态转移信息进行代换
            for ((i, a) in state.goto) {
                if(i is TerminalNotation) {
                    //终结符转换为ACTION表的shift操作
                    setAction(state.index, i, Shift(a))
                }else{
                    //非终结符转换为GOTO表的状态值
                    setGoto(state.index, (i as KeyNotation).key, a)
                }
            }
            //如果状态包含A -> å·，那么将FOLLOW(A)中的所有a，设GOTO[i, a] = reduce A -> å
            state.set.asSequence().filter { it.expression.isNotRoot() && it.isAtEnd() }.forEach {
                for (terminalItem in follows[it.expression.key.key]!!) {
                    setAction(state.index, terminalItem, Reduce(it.expression.index))
                }
            }
            //如果状态包含S' -> S·，那么它可以由EOF accept
            if(state.set.any { it.expression.isRoot() && it.isAtEnd() }) setAction(state.index, EOFNotation, Accept)
        }

        return createSyntaxTable(states.size, action, goto)
    }

    /**
     * 使用各类计算结果导出。
     */
    private fun createSyntaxTable(statusCount: Int, action: Map<Int, Map<TerminalNotation, Action>>, goto: Map<Int, Map<String, Int>>): SyntaxTable {
        //提取action中所有的终结符，将它们排列一下，并给出编号
        val actionNotations = action.values.asSequence().map { it.keys }.flatten().toSet().sortedBy { if(it is SyntaxNotation) it.symbol else "∑" }.mapIndexed { i, item -> item to i }
        //提取goto中的所有非终结符
        val gotoNotations = goto.values.asSequence().map { it.keys }.flatten().toSet().sorted().mapIndexed { i, item -> item to i }
        val actionTable = (0 until statusCount).map { i ->
            actionNotations.map { (terminal, _) ->
                action[i]!![terminal]
            }.toTypedArray()
        }.toTypedArray()
        val gotoTable = (0 until statusCount).map { i ->
            gotoNotations.map { (nonTerminal, _) ->
                goto[i]?.get(nonTerminal)
            }.toTypedArray()
        }.toTypedArray()

        val actionNotationMap = actionNotations.map { (item, i) ->
            when (item) {
                is SyntaxNotation -> item.symbol
                is EOFNotation -> "∑"
                else -> throw NoSuchElementException()
            } to i
        }.toMap()

        return SyntaxTable(actionTable, gotoTable, actionNotationMap, gotoNotations.toMap())
    }

    /**
     * 根据文法产生式，推导每一个非终结符的FOLLOW集合。
     */
    private fun follow(expressions: List<SyntaxExpression>): Map<String, Set<TerminalNotation>> {
        val firstSets = first(expressions)
        val follows = HashMap<String, MutableSet<TerminalNotation>>()
        //获得开始符号
        val rootKey = expressions.minByOrNull { it.index }!!.key.key
        //把EOF放入开始符号的FOLLOW集合中
        follows[rootKey] = mutableSetOf(EOFNotation)

        while (true) {
            var changed = false
            fun addToSet(key: String, set: Collection<TerminalNotation>) {
                if(follows.computeIfAbsent(key) { mutableSetOf() }.addAll(set)) changed = true
            }
            for (expression in expressions) {
                expression.sequence.asSequence()
                    .windowed(2, 1, partialWindows = true)
                    .map { it[0] to it.getOrNull(1) }
                    .forEach { (item, nextItem) ->
                    if(item is KeyNotation) {
                        //对于产生式A -> å B N (B为非终结符)，FIRST(N) - {∑}都加入FOLLOW(B)
                        //而如果B是产生式的最后一个文法符号，或FIRST(N)包含{∑}，那么FOLLOW(A)都加入FOLLOW(B)
                        if(nextItem == null) {
                            follows[expression.key.key]?.let { addToSet(item.key, it) }
                        }else{
                            //非终结符的FIRST从集合取；终结符的FIRST只包含它自身
                            val firstN = if(nextItem is KeyNotation) firstSets[nextItem.key]!! else setOf(nextItem as TerminalNotation)
                            if(EmptyNotation in firstN) {
                                follows[expression.key.key]?.let { addToSet(item.key, it) }
                                addToSet(item.key, firstN - EmptyNotation)
                            }else{
                                addToSet(item.key, firstN)
                            }
                        }
                    }
                }
            }
            if(!changed) break
        }

        return follows
    }

    /**
     * 根据文法产生式，推导每一个非终结符的FIRST集合。
     */
    private fun first(expressions: List<SyntaxExpression>): Map<String, Set<TerminalNotation>> {
        val expressionKeyMap = expressions.groupBy { it.key }
        val sets = HashMap<String, MutableSet<TerminalNotation>>()

        while (true) {
            var changed = false
            fun addToSet(key: String, set: Collection<TerminalNotation>) {
                if(sets.computeIfAbsent(key) { mutableSetOf() }.addAll(set)) changed = true
            }
            //遍历所有的产生式
            for ((key, syntaxExpressions) in expressionKeyMap) {
                for (syntaxExpression in syntaxExpressions) {
                    //对于产生式 key -> syntaxExpression，依次取每个文法符号
                    var breaks = false
                    for (expressionItem in syntaxExpression.sequence) {
                        //从第一个文法符号Y1开始，将FIRST(Y1)的内容都加入FIRST(KEY)
                        val firstY = if(expressionItem is KeyNotation) {
                            //如果Y是终结符，那么从sets取FIRST集合。如果取不到，认为还没有遍历，因此暂时跳过当前产生式
                            val firstY = sets[expressionItem.key]
                            if(firstY == null) {
                                breaks = true
                                break
                            }else{
                                firstY
                            }
                        }else{
                            //如果Y是终结符，那么FIRST(Y)仅包含它自身
                            setOf(expressionItem as SyntaxNotation)
                        }
                        addToSet(key.key, firstY)
                        //如果FIRST(Y1)包含∑，则继续向后考虑Y2。否则终止这条产生式，不再继续考虑
                        if(EmptyNotation !in firstY) {
                            breaks = true
                            break
                        }
                    }
                    if(!breaks) {
                        //没有被break，代表产生式的每个文法符号的FIRST集都包含。这种情况下把∑加入FIRST(Y)
                        addToSet(key.key, setOf(EmptyNotation))
                    }
                }
            }
            if(!changed) break
        }

        return sets
    }

    object EmptyNotation : TerminalNotation
}