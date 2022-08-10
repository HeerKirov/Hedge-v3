package com.heerkirov.hedge.server.library.compiler.grammar.runtime

import com.heerkirov.hedge.server.library.compiler.grammar.definintion.*
import com.heerkirov.hedge.server.library.compiler.lexical.CharSequence
import com.heerkirov.hedge.server.library.compiler.lexical.LexicalItem
import com.heerkirov.hedge.server.library.compiler.lexical.Morpheme
import com.heerkirov.hedge.server.library.compiler.lexical.Space
import com.heerkirov.hedge.server.library.compiler.lexical.Symbol
import java.util.*

/**
 * SLR语法分析状态机。
 * 负责原生的SLR语法分析的部分，也就是仅验证AST的正确性。衍生需求由派生类完成。
 */
abstract class SLRParser(private val syntaxExpressions: Map<Int, SyntaxExpression>,
                         private val syntaxTable: SyntaxTable) {

    /**
     * 执行语法分析。
     */
    fun parse(lexicalItems: List<LexicalItem>) {
        //预处理
        val lexicalList = preProcess(lexicalItems)
        if(lexicalList.size <= 1) {
            //这意味着有效词素排除∑后数量为0，不必执行语法分析。
            return
        }
        run(lexicalList)
    }

    /**
     * 语法分析过程。
     */
    private fun run(lexicalList: List<LexicalItem>) {
        //状态栈。将0压栈作为初始状态
        val stack = LinkedList<Int>().also { it.add(0) }
        //读词素的索引
        var readIndex = 0

        while (true) {
            //从input取下一个词素。末尾词素∑也包含在内，所以不必处理
            val lexical = lexicalList[readIndex]
            val a = morphemeToNotation(lexical.morpheme)
            val s = stack.peek()
            //查ACTION[stack.peek(), 下一个输入]，根据动作做决定
            val action = syntaxTable.getAction(s, a)
            before(stack, readIndex, lexicalList, action)
            if(action == null) {
                //错误：调用错误例程
                error(lexical, syntaxTable.getExpected(s))
                //接下来将清空状态栈，不断丢弃符号，直到检索到一个符号可以被移入，或者直到EOF
                stack.apply { clear() }.apply { add(0) }
                var resumed = false
                while (true) {
                    readIndex += 1
                    if(readIndex >= lexicalList.size) {
                        break
                    }
                    val resumeAction = syntaxTable.getAction(0, morphemeToNotation(lexicalList[readIndex].morpheme))
                    if(resumeAction != null && resumeAction is Shift) {
                        resumed = true
                        break
                    }
                }
                if(!resumed) break
            }else when (action) {
                is Shift -> {
                    //移入：将SHIFT(status)的状态移入栈中，并使读取的符号后推1
                    stack.push(action.status)
                    //∑结束符是不可能被移入的
                    shift(lexical)
                    readIndex += 1
                }
                is Reduce -> {
                    //规约：从栈中弹出|expression|个状态，将GOTO[stack.peek(), expression.key]压栈
                    val reduceExpression = syntaxExpressions[action.syntaxExpressionIndex]!!
                    reduceExpression.sequence.indices.forEach { _ -> stack.pop() }
                    stack.push(syntaxTable.getGoto(stack.peek(), reduceExpression.key.key))
                    reduce(reduceExpression)
                }
                is Accept -> {
                    //接受：语法分析完成
                    break
                }
            }
        }
    }

    /**
     * 对词素序列做预处理，去掉空格词素，添加EOF词素。
     */
    private fun preProcess(lexicalList: List<LexicalItem>): List<LexicalItem> {
        val eofIndex = lexicalList.lastOrNull()?.endIndex ?: 0
        return lexicalList.filter { it.morpheme !is Space } + LexicalItem(Symbol.of("∑"), eofIndex, eofIndex + 1)
    }

    /**
     * 把词素转换为语法表中的文法符号。
     */
    protected fun morphemeToNotation(morpheme: Morpheme): String {
        return when (morpheme) {
            is Symbol -> morpheme.symbol
            is CharSequence -> "str"
            else -> throw UnsupportedOperationException("Unsupported morpheme $morpheme.")
        }
    }

    /**
     * 每一轮循环的处理开始前调用。
     */
    protected open fun before(stack: List<Int>, readIndex: Int, input: List<LexicalItem>, action: Action?) {}

    /**
     * 发生移入动作。
     * @param lexical 移入的词素。根据词法表的规则，移入的符号不可能是结束符∑
     */
    protected open fun shift(lexical: LexicalItem) {}

    /**
     * 发生规约动作。
     * @param reduceException 用于规约的产生式
     */
    protected open fun reduce(reduceException: SyntaxExpression) {}

    /**
     * 发生语法错误，遭遇了不可能遇到的文法符号。
     * @param actualLexical 实际遇到的词素。当遇到结束符∑时，传入null。
     * @param expected 当前状态下期望遇到的词素
     */
    protected open fun error(actualLexical: LexicalItem, expected: List<String>) {}
}