package com.heerkirov.hedge.server.functions.manager.query

import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.enums.MetaType
import com.heerkirov.hedge.server.events.*
import com.heerkirov.hedge.server.library.compiler.grammar.GrammarAnalyzer
import com.heerkirov.hedge.server.library.compiler.lexical.LexicalAnalyzer
import com.heerkirov.hedge.server.library.compiler.lexical.LexicalOptions
import com.heerkirov.hedge.server.library.compiler.semantic.SemanticAnalyzer
import com.heerkirov.hedge.server.library.compiler.semantic.dialect.*
import com.heerkirov.hedge.server.library.compiler.translator.*
import com.heerkirov.hedge.server.library.compiler.translator.visual.*
import com.heerkirov.hedge.server.library.compiler.utils.CompileError
import com.heerkirov.hedge.server.utils.structs.CacheMap

class QueryManager(private val data: DataRepository, bus: EventBus) {
    private val queryer = MetaQueryer(data)
    private val options = OptionsImpl()

    private val executePlanCache = CacheMap<DialectAndText, QuerySchema>(100)

    init {
        //监听meta tag、annotation、source tag的变化，刷新缓存
        bus.on(MetaTagEntityEvent::class, AnnotationEntityEvent::class, SourceTagUpdated::class) { flushCacheByEvent(it) }
        //监听query option的变化，刷新查询选项
        bus.on(SettingQueryChanged::class) { options.flushOptionsByEvent(it) }
    }

    /**
     * 在指定的方言下编译查询语句。获得此语句结果的可视化查询计划、执行计划、错误和警告。
     */
    fun querySchema(text: String, dialect: Dialect): QuerySchema {
        return executePlanCache.computeIfAbsent(DialectAndText(dialect, text)) { key ->
            val lexicalResult = LexicalAnalyzer.parse(key.text, options)
            if(lexicalResult.result == null) {
                return@computeIfAbsent QuerySchema(null, null, warnings = lexicalResult.warnings, errors = lexicalResult.errors)
            }
            val grammarResult = GrammarAnalyzer.parse(lexicalResult.result)
            if(grammarResult.result == null) {
                return@computeIfAbsent QuerySchema(null, null, warnings = lexicalResult.warnings + grammarResult.warnings, errors = grammarResult.errors)
            }
            val semanticResult = SemanticAnalyzer.parse(grammarResult.result, when (key.dialect) {
                Dialect.ILLUST -> IllustDialect::class
                Dialect.BOOK -> BookDialect::class
                Dialect.AUTHOR, Dialect.TOPIC -> AuthorAndTopicDialect::class
                Dialect.ANNOTATION -> AnnotationDialect::class
                Dialect.SOURCE_DATA -> SourceDataDialect::class
            })
            if(semanticResult.result == null) {
                return@computeIfAbsent QuerySchema(null, null, warnings = MetaParserUtil.unionList(lexicalResult.warnings, grammarResult.warnings, semanticResult.warnings), errors = semanticResult.errors)
            }
            val builder = when (key.dialect) {
                Dialect.ILLUST -> IllustExecutePlanBuilder(data.db)
                Dialect.BOOK -> BookExecutePlanBuilder(data.db)
                Dialect.AUTHOR -> AuthorExecutePlanBuilder(data.db)
                Dialect.TOPIC -> TopicExecutePlanBuilder(data.db)
                Dialect.ANNOTATION -> AnnotationExecutePlanBuilder()
                Dialect.SOURCE_DATA -> SourceImageExecutePlanBuilder(data.db)
            }
            val translatorResult = Translator.parse(semanticResult.result, queryer, builder, options)

            if(translatorResult.result == null) {
                QuerySchema(null, null, warnings = MetaParserUtil.unionList(lexicalResult.warnings, grammarResult.warnings, semanticResult.warnings, translatorResult.warnings), errors = translatorResult.errors)
            }else{
                QuerySchema(translatorResult.result, builder.build(), warnings = MetaParserUtil.unionList(lexicalResult.warnings, grammarResult.warnings, semanticResult.warnings, translatorResult.warnings), errors = emptyList())
            }
        }
    }

    private fun flushCacheByEvent(e: PackagedBusEvent<*>) {
        when(val event = e.event) {
            is MetaTagEntityEvent -> when(event.metaType) {
                MetaType.TAG -> flushCacheOf(CacheType.TAG)
                MetaType.TOPIC -> flushCacheOf(CacheType.TOPIC)
                MetaType.AUTHOR -> flushCacheOf(CacheType.AUTHOR)
            }
            is AnnotationEntityEvent -> flushCacheOf(CacheType.ANNOTATION)
            is SourceTagUpdated -> flushCacheOf(CacheType.SOURCE_TAG)
        }
    }

    /**
     * 冲刷缓存。因为管理器会尽可能缓存编译结果，在元数据发生变化时若不冲刷缓存，会造成查询结果不准确。
     * @param cacheType 发生变化的实体类型。
     */
    private fun flushCacheOf(cacheType: CacheType) {
        executePlanCache.clear()
        queryer.flushCacheOf(cacheType)
    }

    enum class Dialect { ILLUST, BOOK, TOPIC, AUTHOR, ANNOTATION, SOURCE_DATA }

    enum class CacheType { TAG, TOPIC, AUTHOR, ANNOTATION, SOURCE_TAG }

    data class QuerySchema(val visualQueryPlan: VisualQueryPlan?, val executePlan: ExecutePlan?, val warnings: List<CompileError<*>>, val errors: List<CompileError<*>>)

    private data class DialectAndText(val dialect: Dialect, val text: String)

    private inner class OptionsImpl : LexicalOptions, TranslatorOptions {
        private var _translateUnderscoreToSpace: Boolean? = null
        private var _chineseSymbolReflect: Boolean? = null
        private var _warningLimitOfUnionItems: Int? = null
        private var _warningLimitOfIntersectItems: Int? = null

        override val translateUnderscoreToSpace: Boolean get() {
            if (_translateUnderscoreToSpace == null) {
                _translateUnderscoreToSpace = data.setting.query.translateUnderscoreToSpace
            }
            return _translateUnderscoreToSpace!!
        }

        override val chineseSymbolReflect: Boolean get() {
            if (_chineseSymbolReflect == null) {
                _chineseSymbolReflect = data.setting.query.chineseSymbolReflect
            }
            return _chineseSymbolReflect!!
        }

        override val warningLimitOfUnionItems: Int get() {
            if (_warningLimitOfUnionItems == null) {
                _warningLimitOfUnionItems = data.setting.query.warningLimitOfUnionItems
            }
            return _warningLimitOfUnionItems!!
        }

        override val warningLimitOfIntersectItems: Int get() {
            if (_warningLimitOfIntersectItems == null) {
                _warningLimitOfIntersectItems = data.setting.query.warningLimitOfIntersectItems
            }
            return _warningLimitOfIntersectItems!!
        }

        fun flushOptionsByEvent(e: PackagedBusEvent<*>) {
            val option = (e.event as SettingQueryChanged).queryOption
            option.chineseSymbolReflect.alsoOpt {
                if(it != _chineseSymbolReflect) {
                    _chineseSymbolReflect = it
                    executePlanCache.clear()
                }
            }
            option.warningLimitOfUnionItems.alsoOpt {
                if(it != _warningLimitOfUnionItems) {
                    _warningLimitOfUnionItems = it
                    executePlanCache.clear()
                }
            }
            option.warningLimitOfIntersectItems.alsoOpt {
                if(it != _warningLimitOfIntersectItems) {
                    _warningLimitOfIntersectItems = it
                    executePlanCache.clear()
                }
            }
            option.translateUnderscoreToSpace.alsoOpt {
                if(it != _translateUnderscoreToSpace) {
                    _translateUnderscoreToSpace = it
                    executePlanCache.clear()
                }
            }
        }
    }
}