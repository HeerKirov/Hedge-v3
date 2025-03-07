package com.heerkirov.hedge.server.library.compiler.semantic

import com.heerkirov.hedge.server.library.compiler.grammar.semantic.*
import com.heerkirov.hedge.server.library.compiler.grammar.semantic.Bracket as SemanticBracket
import com.heerkirov.hedge.server.library.compiler.grammar.semantic.Element as SemanticElement
import com.heerkirov.hedge.server.library.compiler.semantic.dialect.*
import com.heerkirov.hedge.server.library.compiler.semantic.plan.Forecast
import com.heerkirov.hedge.server.library.compiler.semantic.framework.*
import com.heerkirov.hedge.server.library.compiler.semantic.plan.*
import com.heerkirov.hedge.server.library.compiler.semantic.utils.ThrowsSemanticError
import com.heerkirov.hedge.server.library.compiler.semantic.utils.aliasToString
import com.heerkirov.hedge.server.library.compiler.semantic.utils.semanticError
import com.heerkirov.hedge.server.library.compiler.utils.AnalysisResult
import com.heerkirov.hedge.server.library.compiler.utils.ErrorCollector
import com.heerkirov.hedge.server.library.compiler.utils.SemanticError
import kotlin.reflect.KClass
import kotlin.reflect.full.memberProperties

/**
 * 语义分析。执行语义树 -> 查询计划的步骤。
 */
object SemanticAnalyzer {
    private val dialects = arrayOf(IllustDialect, BookDialect, AuthorDialect, TopicDialect, SourceDataDialect).associate { it::class to DialectStructure(it) }

    /**
     * 执行语义分析。
     */
    fun parse(root: SemanticRoot, dialectClazz: KClass<out QueryDialect<*>>): AnalysisResult<QueryPlan, SemanticError<*>> {
        val dialect = dialects[dialectClazz] ?: throw RuntimeException("Unregister dialect ${dialectClazz.simpleName}.")
        val collector = ErrorCollector<SemanticError<*>>()
        val elements = mutableListOf<Element<*>>()
        val filters = mutableListOf<UnionFilters>()
        val sorts = mutableListOf<Sort<*>>()
        val sortKeySet = mutableSetOf<Enum<*>>()
        //遍历整个root
        for (sequenceItem in root.items) {
            //每个sequenceItem是一个合取项
            when (sequenceItem.body) {
                is SemanticElement -> {
                    //构造一个列表，列表的每一项标记对应索引的item是否是关键字项目
                    val whetherIsIdentifies = try {
                        sequenceItem.body.items.map { whetherIsIdentifyAndMapToAlias(dialect, it.subject, sequenceItem.body.prefix, sequenceItem.source) }
                    }catch (e: ThrowsSemanticError) {
                        e.errors.forEach { collector.error(it) }
                        continue
                    }
                    when {
                        whetherIsIdentifies.all { it != null } -> {
                            //所有的项都是关键字项目，进入关键字处理流程
                            if(dialect.sortGenerator != null && whetherIsIdentifies.any { it == "sort" }) {
                                //存在sort项，进入sort处理流程
                                //sort项不能标记为-, 或被or(|)连接
                                if(whetherIsIdentifies.size != 1 || sequenceItem.minus) {
                                    collector.error(SortIsIndependent(sequenceItem.beginIndex, sequenceItem.endIndex))
                                    continue
                                }
                                val (subject, family, predicative) = sequenceItem.body.items.first()
                                try {
                                    val result = dialect.sortGenerator.generate(subject as StrList, family, predicative)
                                    if(result != null) {
                                        for (sort in result) {
                                            if(sort.value in sortKeySet) {
                                                collector.warning(DuplicatedSortItem(sort.value.name, sequenceItem.body.beginIndex, sequenceItem.body.endIndex))
                                            }else{
                                                sorts.add(sort)
                                                sortKeySet.add(sort.value)
                                            }
                                        }
                                    }
                                }catch (e: ThrowsSemanticError) {
                                    e.errors.forEach { collector.error(it) }
                                }
                            }else{
                                //否则按普通关键字项目处理
                                val subFilters = mutableListOf<Filter<*>>()
                                whetherIsIdentifies.zip(sequenceItem.body.items).forEach { (alias, sfp) ->
                                    val generator = dialect.identifyGenerators[alias] ?: throw RuntimeException("Generator of $alias is not found in map.")
                                    val (subject, family, predicative) = sfp
                                    try {
                                        if(generator is GeneratedSequenceByIdentify<*>) {
                                            @Suppress("UNCHECKED_CAST")
                                            val results = (generator as GeneratedSequenceByIdentify<Filter<*>>).generateSeq(subject as StrList, family, predicative)
                                            subFilters.addAll(results)
                                        }else{
                                            val result = generator.generate(subject as StrList, family, predicative)
                                            if(result != null) subFilters.add(result)
                                        }
                                    }catch (e: ThrowsSemanticError) {
                                        e.errors.forEach { collector.error(it) }
                                    }
                                }
                                //因为filter结果数量不固定，因此有可能拿到空的subFilters。根据优化，此时应当忽略这个合取项
                                if(subFilters.isNotEmpty()) filters.add(UnionFilters(subFilters, sequenceItem.minus))
                            }
                        }
                        whetherIsIdentifies.all { it == null } -> {
                            //所有的项都不是关键字项目，进入元素处理流程
                            val generator = if(sequenceItem.source) dialect.sourceElementGenerator else dialect.elementGenerator
                            try {
                                val result = generator.generate(sequenceItem.body, sequenceItem.minus)
                                elements.add(result)
                            }catch (e: ThrowsSemanticError) {
                                e.errors.forEach { collector.error(it) }
                            }
                        }
                        else -> collector.error(IdentifiesAndElementsCannotBeMixed(sequenceItem.body.beginIndex, sequenceItem.body.endIndex))
                    }
                }
                is SemanticBracket -> {
                    //项是括号标记
                    if(sequenceItem.source) {
                        collector.error(BracketCannotHaveSourceFlag(sequenceItem.beginIndex, sequenceItem.endIndex))
                        continue
                    }
                    try {
                        val result = dialect.bracketElementGenerator.generate(sequenceItem.body, sequenceItem.minus)
                        elements.add(result)
                    }catch (e: ThrowsSemanticError) {
                        e.errors.forEach { collector.error(it) }
                    }
                }
            }
        }

        return AnalysisResult(if(collector.hasErrors) null else QueryPlan(sorts, filters, elements), warnings = collector.warnings, errors = collector.errors)
    }

    /**
     * 执行语义简要分析和光标处语义类型的识别，以用于分析预测。
     */
    fun forecast(root: SemanticRoot, cursorIndex: Int, dialectClazz: KClass<out QueryDialect<*>>): Forecast? {
        val dialect = dialects[dialectClazz] ?: throw RuntimeException("Unregister dialect ${dialectClazz.simpleName}.")

        val sequenceItem = root.items.firstOrNull { cursorIndex >= it.body.beginIndex && cursorIndex <= it.body.endIndex } ?: return null

        when(sequenceItem.body) {
            is SemanticElement -> {
                val whetherIsIdentifies = try {
                    sequenceItem.body.items.map { whetherIsIdentifyAndMapToAlias(dialect, it.subject, sequenceItem.body.prefix, sequenceItem.source) }
                }catch (e: ThrowsSemanticError) {
                    return null
                }

                if(whetherIsIdentifies.all { it != null }) {
                    if(dialect.sortGenerator != null && whetherIsIdentifies.any { it == "sort" }) {
                        if(whetherIsIdentifies.size != 1 || sequenceItem.minus) {
                            return null
                        }

                        val (subject, family, predicative) = sequenceItem.body.items.first()
                        return try {
                            dialect.sortGenerator.forecast(subject as StrList, family, predicative, cursorIndex)
                        }catch (e: ThrowsSemanticError) {
                            null
                        }
                    }else{
                        whetherIsIdentifies.zip(sequenceItem.body.items).forEach { (alias, sfp) ->
                            val generator = dialect.identifyGenerators[alias] ?: throw RuntimeException("Generator of $alias is not found in map.")
                            val (subject, family, predicative) = sfp
                            return try {
                                generator.forecast(subject as StrList, family, predicative, cursorIndex)
                            }catch (e: ThrowsSemanticError) {
                                null
                            }
                        }
                        return null
                    }
                }else if(whetherIsIdentifies.all { it == null }) {
                    //所有的项都不是关键字项目，进入元素处理流程
                    val generator = if(sequenceItem.source) dialect.sourceElementGenerator else dialect.elementGenerator
                    return try {
                        generator.forecast(sequenceItem.body, sequenceItem.minus, cursorIndex)
                    }catch (e: ThrowsSemanticError) {
                        null
                    }
                }else{
                    return null
                }
            }
            is SemanticBracket -> {
                return try {
                    dialect.bracketElementGenerator.forecast(sequenceItem.body, sequenceItem.minus, cursorIndex)
                }catch (e: ThrowsSemanticError) {
                    null
                }
            }
            else -> return null
        }
    }

    /**
     * 根据目标Subject判断目标SFP是否符合一个关键字项目的定义。如果是，返回这个关键字的alias，否则返回null。
     * 如果一个项没有类型前缀(@#$)，地址长度为1，使用受限字符串书写，且位于关键字列表，就初步将其判定为关键字项目。
     * 随后校对此项的source(^)符号。
     */
    private fun whetherIsIdentifyAndMapToAlias(dialect: DialectStructure<*>, subject: Subject, prefix: Symbol?, sourceFlag: Boolean): String? {
        if(subject !is StrList) throw RuntimeException("Unsupported subject type ${subject::class.simpleName}.")
        if(prefix == null && subject.items.size == 1 && subject.items.first().type == Str.Type.RESTRICTED) {
            val aliasName = subject.items.first().value.lowercase()
            if (dialect.sortGenerator != null && aliasName in dialect.sortGenerator.alias) {
                //发现sort项
                if(sourceFlag) semanticError(ThisIdentifyCannotHaveSourceFlag(aliasName, subject.beginIndex, subject.endIndex))
                return "sort"
            }else if(aliasName in dialect.identifies) {
                //在关键字列表中发现此项，就判定为关键字。
                val alias = aliasToString(aliasName, sourceFlag)
                if(alias !in dialect.identifyGenerators.keys) {
                    if(sourceFlag) semanticError(ThisIdentifyCannotHaveSourceFlag(aliasName, subject.beginIndex, subject.endIndex))
                    else semanticError(ThisIdentifyMustHaveSourceFlag(aliasName, subject.beginIndex, subject.endIndex))
                }
                return alias
            }
        }
        return null
    }

    /**
     * 方言构造。build一种方言的快速查询器。
     */
    private class DialectStructure<O : Enum<O>>(dialect: QueryDialect<O>) {
        /**
         * 此方言对元素的生成方案。
         */
        val elementGenerator: ElementFieldByElement = dialect.elements.asSequence().filterIsInstance<ElementFieldByElement>().filterNot { it.forSourceFlag }.firstOrNull() ?: DefaultElementField

        /**
         * 此方言对source标记的元素的生成方案。
         */
        val sourceElementGenerator: ElementFieldByElement = dialect.elements.asSequence().filterIsInstance<ElementFieldByElement>().filter { it.forSourceFlag }.firstOrNull() ?: DefaultSourceElementField

        /**
         * 此方言对bracket类型元素的生成方案。
         */
        val bracketElementGenerator: ElementFieldByBracket = dialect.elements.asSequence().filterIsInstance<ElementFieldByBracket>().firstOrNull() ?: DefaultBracketElementField

        /**
         * 此方言对identify的生成方案。key是toString后的alias，value是生成器。
         */
        val identifyGenerators: Map<String, FilterFieldByIdentify<*>> = dialect::class.memberProperties.asSequence()
            .filter { it.name != "sort" && it.name != "elements" }
            .filter { !it.returnType.isMarkedNullable && it.returnType.classifier == FilterFieldDefinition::class }
            .map { it.call(dialect) as FilterFieldDefinition<*> }
            .map { it.cast<FilterFieldDefinition<*>, FilterFieldByIdentify<*>>() }
            .flatMap { it.alias.asSequence().map { alias -> alias.lowercase() to it } }
            .toMap()

        /**
         * 此方言的基本关键字，是alias不包括sourceFlag的name部分。
         */
        val identifies = identifyGenerators.keys.asSequence().map { if(it.startsWith("^")) it.substring(1) else it }.toSet()

        /**
         * 此方言对sort的生成方案。
         */
        val sortGenerator: SortFieldByIdentify<O>? = dialect.sort?.cast()

        private inline fun <T : Any, reified R : T> T.cast(): R {
            return if(this is R) this else throw ClassCastException("${this::class.simpleName} cannot be cast to ${R::class.simpleName}.")
        }
    }

    /**
     * 如果方言没有定义对元素的生成方案的默认值。
     */
    object DefaultElementField : ElementFieldByElement() {
        override val itemName = "unknown"
        override val forSourceFlag = false
        override fun generate(element: SemanticElement, minus: Boolean) = semanticError(UnsupportedSemanticStructure(UnsupportedSemanticStructure.SemanticType.ELEMENT, element.beginIndex, element.endIndex))

        override fun forecast(element: SemanticElement, minus: Boolean, cursorIndex: Int) = null
    }

    /**
     * 如果方言没有定义对source元素的生成方案的默认值。
     */
    object DefaultSourceElementField : ElementFieldByElement() {
        override val itemName = "unknown"
        override val forSourceFlag = false
        override fun generate(element: SemanticElement, minus: Boolean) = semanticError(UnsupportedSemanticStructure(UnsupportedSemanticStructure.SemanticType.ELEMENT_WITH_SOURCE, element.beginIndex, element.endIndex))

        override fun forecast(element: SemanticElement, minus: Boolean, cursorIndex: Int) = null
    }

    /**
     * 如果方言没有定义对bracket元素的生成方案的默认值。
     */
    object DefaultBracketElementField : ElementFieldByBracket() {
        override val itemName = "unknown"
        override fun generate(bracket: SemanticBracket, minus: Boolean) = semanticError(UnsupportedSemanticStructure(UnsupportedSemanticStructure.SemanticType.BRACKET, bracket.beginIndex, bracket.endIndex))

        override fun forecast(bracket: SemanticBracket, minus: Boolean, cursorIndex: Int) = null
    }
}