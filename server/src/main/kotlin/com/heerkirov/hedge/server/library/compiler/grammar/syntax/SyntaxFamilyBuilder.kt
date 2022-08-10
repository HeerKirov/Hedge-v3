package com.heerkirov.hedge.server.library.compiler.grammar.syntax

import com.heerkirov.hedge.server.library.compiler.grammar.definintion.KeyNotation
import com.heerkirov.hedge.server.library.compiler.grammar.definintion.Notation
import java.lang.RuntimeException

/**
 * 项集族的分析构造器。
 */
class SyntaxFamilyBuilder(private val expressions: List<ExpandExpression>) {
    /**
     * 将产生式按照左侧的非终结符分类，方便后续查找。根产生式不在其中。
     */
    private val expressionKeyMap = expressions.filter { it.isNotRoot() }.groupBy { it.key.key }

    /**
     * 取得构造结果。
     */
    fun parse(): List<SyntaxItemState> {
        //初始项
        val rootExpression = expressions.first { it.isRoot() }
        //初始项集
        val rootState = setOf(SyntaxItem(rootExpression, 0))
        //项集族。将初始项集的闭包加入
        val states = mutableListOf(closure(rootState))
        //记录goto信息
        val gotoMap = mutableListOf<MutableMap<Notation, Int>>(mutableMapOf())
        //依次向后处理每一个项集。因为每个新项都会追加到项集族，这相当于BFS
        var i = 0
        while (i < states.size) {
            val state = states[i]
            state.asSequence().filter { it.isNotAtEnd() }.map { it.nextExpressionItem }.forEach { x ->
                //对于每个项集，取出所有的next文法符号，求出GOTO(I, X)
                val gotoItemSet = goto(state, x)
                val indexOfGotoSet = states.indexOf(gotoItemSet)
                if(gotoItemSet.isNotEmpty() && indexOfGotoSet == -1) {
                    //在goto非空且不存在时，将goto作为新的项集加入集合
                    states.add(gotoItemSet)
                    gotoMap.add(mutableMapOf())
                    //标记goto信息
                    gotoMap[i][x] = states.size - 1
                }else{
                    //否则只是标记goto信息
                    gotoMap[i][x] = indexOfGotoSet
                }
            }
            i += 1
        }

        return states.asSequence().zip(gotoMap.asSequence()).mapIndexed { index, (state, goto) -> SyntaxItemState(index, state, goto) }.toList()
    }

    /**
     * 项集的闭包：执行自动机构造过程中的CLOSURE函数，扩展指定的项集。
     */
    fun closure(itemSet: Set<SyntaxItem>): Set<SyntaxItem> {
        val closureItemSet = itemSet.toMutableSet()
        while (true) {
            //取出项集中，所有在·后的非终结符
            val keys = closureItemSet.asSequence()
                .filter { it.isNotAtEnd() }
                .map { it.nextExpressionItem }
                .filterIsInstance<KeyNotation>()
                .map { it.key }
            //根据这些非终结符，从产生式列表取出对应的所有产生式。过滤出所有在闭包中还不存在的项
            val expandedExpressions = keys
                .map { expressionKeyMap[it] ?: throw NullPointerException("$it is not exist in expression definitions.") }
                .flatten()
                .map { SyntaxItem(it, 0) }
                .filter { it !in closureItemSet }
                .toSet()
            //如果扩展列表为空，表示闭包的迭代结束。否则加入闭包
            if(expandedExpressions.isEmpty()) {
                return closureItemSet
            }
            closureItemSet.addAll(expandedExpressions)
        }
    }

    /**
     * 项集的状态转换目标：执行自动机构造过程中的GOTO函数，导出项集根据指定文法符号转换到的目标状态。
     */
    fun goto(itemSet: Set<SyntaxItem>, key: Notation): Set<SyntaxItem> {
        //在原项集中，查找·后的下一个文法符号是key的项，将它们的·推到下一位，得到一个项集，然后对这个项集做闭包
        return itemSet.asSequence()
            .filter { it.isNotAtEnd() && it.nextExpressionItem == key }
            .map { SyntaxItem(it.expression, it.next + 1) }
            .toSet()
            .let { closure(it) }
    }
}

/**
 * 项集族(状态机)中的一个项集(状态)。它包括项集，除此之外还包括了状态编号、状态所代表的非终结符、goto目标等信息。
 */
class SyntaxItemState(val index: Int, val set: Set<SyntaxItem>, val goto: Map<Notation, Int>) {
    val item: Notation? = set.asSequence().filter { it.next > 0 }.map { it.expression.sequence[it.next - 1] }.toSet().also {
        if(it.size > 1) throw RuntimeException("State $index has ${it.size} keys: $it.")
    }.firstOrNull()

    override fun equals(other: Any?): Boolean = other === this || other is SyntaxItemState && other.index == index && other.set == set && other.goto == goto

    override fun hashCode(): Int {
        var result = index
        result = 31 * result + set.hashCode()
        result = 31 * result + goto.hashCode()
        return result
    }
}

/**
 * 语法分析器中的项。记录值为产生式的下标和next的点的下标。
 */
class SyntaxItem(val expression: ExpandExpression, val next: Int) {
    /**
     * 判断这个项的·是否位于最末尾。
     */
    fun isAtEnd(): Boolean = next >= expression.sequence.size

    /**
     * 判断这个项的·是否不是位于末尾的。
     */
    fun isNotAtEnd(): Boolean = !isAtEnd()

    /**
     * 获得·所指的产生式中的下一个文法符号。
     * @throws IndexOutOfBoundsException 不会做存在性判断，因此如果·位于末尾会抛出此异常。
     */
    val nextExpressionItem: Notation get() = expression.sequence[next]

    override fun equals(other: Any?): Boolean = other === this || (other is SyntaxItem && other.expression == this.expression && other.next == this.next)

    override fun hashCode(): Int = expression.hashCode() * 31 + next

    override fun toString(): String = "SI(${expression.index}, $next)"
}