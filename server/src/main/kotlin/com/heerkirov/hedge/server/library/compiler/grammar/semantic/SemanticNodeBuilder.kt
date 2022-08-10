package com.heerkirov.hedge.server.library.compiler.grammar.semantic

import com.heerkirov.hedge.server.library.compiler.grammar.definintion.SyntaxExpression
import com.heerkirov.hedge.server.library.compiler.utils.ErrorCollector
import com.heerkirov.hedge.server.library.compiler.utils.GrammarError
import kotlin.collections.Collection
import kotlin.reflect.KClass
import kotlin.reflect.KFunction
import kotlin.reflect.full.createInstance
import kotlin.reflect.full.findAnnotation
import kotlin.reflect.full.functions
import kotlin.reflect.full.hasAnnotation

/**
 * 将translator规则结合产生式构成翻译器。
 */
fun buildTranslators(syntaxExpressions: Collection<SyntaxExpression>, ruleClass: KClass<out Any>): Map<SyntaxExpression, Translator> {
    val syntaxExpressionMap = syntaxExpressions.associateBy { "${it.key} -> ${it.sequence.joinToString(" ")}" }
    val ruleInstance = ruleClass.createInstance()

    fun processForExpression(forExpression: ForExpression, function: KFunction<SemanticNode>): Pair<SyntaxExpression, Translator> {
        val syntaxExpression = syntaxExpressionMap[forExpression.expression] ?: throw RuntimeException("Syntax expression ${forExpression.expression} is not exist in list.")
        val maps = sequenceOf(-2) + if(forExpression.args.isEmpty()) {
            if(forExpression.injectErrorCollector) {
                (0 until (function.parameters.size - 2)).asSequence() + sequenceOf(-1)
            }else{
                (0 until (function.parameters.size - 1)).asSequence()
            }
        }else{
            if(forExpression.injectErrorCollector) {
                forExpression.args.asSequence() + sequenceOf(-1)
            }else{
                forExpression.args.asSequence()
            }
        }
        return syntaxExpression to Translator(ruleInstance, function, maps.toList().toTypedArray(), )
    }

    return ruleClass.functions.flatMap { function ->
        when {
            function.hasAnnotation<ForExpression>() -> {
                val forExpression = function.findAnnotation<ForExpression>()!!
                @Suppress("UNCHECKED_CAST")
                sequenceOf(processForExpression(forExpression, function as KFunction<SemanticNode>))
            }
            function.hasAnnotation<ForExpressions>() -> {
                val forExpressions = function.findAnnotation<ForExpressions>()!!
                forExpressions.expressions.asSequence().map {
                    @Suppress("UNCHECKED_CAST")
                    processForExpression(it, function as KFunction<SemanticNode>)
                }
            }
            else -> emptySequence()
        }
    }.toMap()
}

class Translator internal constructor(private val ruleInstance: Any,
                                      private val function: KFunction<SemanticNode>,
                                      private val maps: Array<Int>) {
    fun translate(nodes: List<SemanticNode>, collector: ErrorCollector<GrammarError<*>>): SemanticNode {
        val args = Array<Any?>(maps.size) { i ->
            val index = maps[i]
            when {
                index >= 0 -> nodes[index]
                index == -1 -> collector
                index == -2 -> ruleInstance
                else -> throw RuntimeException("Unreached when case.")
            }
        }
        return function.call(*args)
    }
}

annotation class ForExpressions(val expressions: Array<ForExpression>)

annotation class ForExpression(val expression: String, val args: IntArray = [], val injectErrorCollector: Boolean = false)