package com.heerkirov.hedge.server.library.compiler.grammar

import com.heerkirov.hedge.server.library.compiler.grammar.definintion.*
import com.heerkirov.hedge.server.library.compiler.grammar.runtime.SLRParser
import com.heerkirov.hedge.server.library.compiler.grammar.semantic.*
import com.heerkirov.hedge.server.library.compiler.lexical.LexicalItem
import com.heerkirov.hedge.server.library.compiler.lexical.Symbol as LexicalSymbol
import com.heerkirov.hedge.server.library.compiler.lexical.CharSequence as LexicalCharSequence
import com.heerkirov.hedge.server.library.compiler.lexical.CharSequenceType
import com.heerkirov.hedge.server.library.compiler.utils.AnalysisResult
import com.heerkirov.hedge.server.library.compiler.utils.ErrorCollector
import com.heerkirov.hedge.server.library.compiler.utils.GrammarError
import com.heerkirov.hedge.server.utils.Resources
import java.util.*
import kotlin.collections.ArrayList

/**
 * 系统标准语法分析器，执行从词素列表分析构造语义树的过程。
 */
object GrammarAnalyzer {
    private val syntaxExpressions = readSyntaxExpression(Resources.getResourceAsText("syntax/syntax.txt")).associateBy { it.index }
    private val syntaxTable = readSyntaxTable(Resources.getResourceAsText("syntax/syntax-table.txt"))
    private val semanticTranslators = buildTranslators(syntaxExpressions.values, SemanticNodeRules::class)

    /**
     * 执行语法分析。
     * @return 语法分析结果。结果是一棵树。如果分析内容为空，那么没有error返回内容也是null。
     */
    fun parse(lexicalList: List<LexicalItem>): AnalysisResult<SemanticRoot, GrammarError<*>> {
        val parser = Parser()
        parser.parse(lexicalList)
        return if(parser.collector.errors.isEmpty()) {
            AnalysisResult(parser.getResult(), parser.collector.warnings)
        }else{
            AnalysisResult(null, parser.collector.warnings, parser.collector.errors)
        }
    }

    private class Parser : SLRParser(syntaxExpressions, syntaxTable) {
        val collector = ErrorCollector<GrammarError<*>>()
        val stack = LinkedList<SemanticNode>()

        override fun shift(lexical: LexicalItem) {
            val node = when (lexical.morpheme) {
                is LexicalCharSequence -> Str(lexical.morpheme.value, when (lexical.morpheme.type) {
                    CharSequenceType.RESTRICTED -> Str.Type.RESTRICTED
                    CharSequenceType.APOSTROPHE -> Str.Type.APOSTROPHE
                    CharSequenceType.DOUBLE_QUOTES -> Str.Type.DOUBLE_QUOTES
                    CharSequenceType.BACKTICKS -> Str.Type.BACKTICKS
                }, lexical.beginIndex, lexical.endIndex)
                is LexicalSymbol -> Symbol(lexical.morpheme.symbol, lexical.beginIndex, lexical.endIndex)
                else -> throw RuntimeException("Unexpected lexical ${lexical.morpheme::class.java}.")
            }
            stack.push(node)
        }

        override fun reduce(reduceException: SyntaxExpression) {
            val arrayList = ArrayList<SemanticNode>(reduceException.sequence.size)
            reduceException.sequence.indices.forEach { _ -> arrayList.add(stack.pop()) }
            val result = semanticTranslators[reduceException]?.translate(arrayList.asReversed(), collector) ?: throw RuntimeException("Translator for expression ${reduceException.index} is not exist.")
            stack.push(result)
        }

        override fun error(actualLexical: LexicalItem, expected: List<String>) {
            val error = if(actualLexical.morpheme is LexicalSymbol && actualLexical.morpheme.symbol == "∑") {
                UnexpectedEOF(expected, actualLexical.beginIndex)
            }else{
                UnexpectedToken(morphemeToNotation(actualLexical.morpheme), expected, actualLexical.beginIndex)
            }
            collector.error(error)
            //发生错误时，与SLR分析器行为保持一致，清空栈区
            stack.clear()
        }

        fun getResult(): SemanticRoot {
            @Suppress("UNCHECKED_CAST")
            val mutList = stack.pop() as MutList<SequenceItem>
            return SemanticRoot(mutList.items.toList(), mutList.beginIndex, mutList.endIndex)
        }
    }
}