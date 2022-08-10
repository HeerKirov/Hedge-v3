package com.heerkirov.hedge.server.library.compiler.semantic

import com.heerkirov.hedge.server.library.compiler.grammar.semantic.*
import com.heerkirov.hedge.server.library.compiler.grammar.semantic.Annotation as SemanticAnnotation
import com.heerkirov.hedge.server.library.compiler.grammar.semantic.Element as SemanticElement
import com.heerkirov.hedge.server.library.compiler.semantic.dialect.*
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
    private val dialects = arrayOf(IllustDialect, BookDialect, AuthorAndTopicDialect, AnnotationDialect, SourceDataDialect).associate { it::class to DialectStructure(it) }

    /**
     * 执行语义分析。
     */
    fun parse(root: SemanticRoot, dialectClazz: KClass<out QueryDialect<*>>): AnalysisResult<QueryPlan, SemanticError<*>> {
        val dialect = dialects[dialectClazz] ?: throw RuntimeException("Unregister dialect ${dialectClazz.simpleName}.")
        val collector = ErrorCollector<SemanticError<*>>()
        val elements = mutableListOf<Element<*>>()
        val filters = mutableListOf<UnionFilters>()
        val orders = mutableListOf<Order<*>>()
        val orderKeySet = mutableSetOf<Enum<*>>()
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
                            if(dialect.orderGenerator != null && whetherIsIdentifies.any { it == "order" }) {
                                //存在order项，进入order处理流程
                                //order项不能标记为-, 或被or(|)连接
                                if(whetherIsIdentifies.size != 1 || sequenceItem.minus) {
                                    collector.error(OrderIsIndependent(sequenceItem.beginIndex, sequenceItem.endIndex))
                                    continue
                                }
                                val (subject, family, predicative) = sequenceItem.body.items.first()
                                try {
                                    val result = dialect.orderGenerator.generate(subject as StrList, family, predicative)
                                    if(result != null) {
                                        for (order in result) {
                                            if(order.value in orderKeySet) {
                                                collector.warning(DuplicatedOrderItem(order.value.name, sequenceItem.body.beginIndex, sequenceItem.body.endIndex))
                                            }else{
                                                orders.add(order)
                                                orderKeySet.add(order.value)
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
                is SemanticAnnotation -> {
                    //项是注解元素
                    if(sequenceItem.source) {
                        collector.error(AnnotationCannotHaveSourceFlag(sequenceItem.beginIndex, sequenceItem.endIndex))
                        continue
                    }
                    try {
                        val result = dialect.annotationElementGenerator.generate(sequenceItem.body, sequenceItem.minus)
                        elements.add(result)
                    }catch (e: ThrowsSemanticError) {
                        e.errors.forEach { collector.error(it) }
                    }
                }
            }
        }

        return AnalysisResult(if(collector.hasErrors) null else QueryPlan(orders, filters, elements), warnings = collector.warnings, errors = collector.errors)
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
            if (aliasName == "order") {
                //发现order项
                if(sourceFlag) semanticError(ThisIdentifyCannotHaveSourceFlag(aliasName, subject.beginIndex, subject.endIndex))
                return "order"
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
         * 此方言对annotation类型元素的生成方案。
         */
        val annotationElementGenerator: ElementFieldByAnnotation = dialect.elements.asSequence().filterIsInstance<ElementFieldByAnnotation>().firstOrNull() ?: DefaultAnnotationElementField

        /**
         * 此方言对identify的生成方案。key是toString后的alias，value是生成器。
         */
        val identifyGenerators: Map<String, FilterFieldByIdentify<*>> = dialect::class.memberProperties.asSequence()
            .filter { it.name != "order" && it.name != "elements" }
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
         * 此方言对order的生成方案。
         */
        val orderGenerator: OrderFieldByIdentify<O>? = dialect.order?.cast()

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
    }

    /**
     * 如果方言没有定义对source元素的生成方案的默认值。
     */
    object DefaultSourceElementField : ElementFieldByElement() {
        override val itemName = "unknown"
        override val forSourceFlag = false
        override fun generate(element: SemanticElement, minus: Boolean) = semanticError(UnsupportedSemanticStructure(UnsupportedSemanticStructure.SemanticType.ELEMENT_WITH_SOURCE, element.beginIndex, element.endIndex))
    }

    /**
     * 如果方言没有定义对注解元素的生成方案的默认值。
     */
    object DefaultAnnotationElementField : ElementFieldByAnnotation() {
        override val itemName = "unknown"
        override fun generate(annotation: SemanticAnnotation, minus: Boolean) = semanticError(UnsupportedSemanticStructure(UnsupportedSemanticStructure.SemanticType.ANNOTATION, annotation.beginIndex, annotation.endIndex))
    }
}