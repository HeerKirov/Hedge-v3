package com.heerkirov.hedge.server.functions.manager.query

import com.heerkirov.hedge.server.components.database.DataRepository
import com.heerkirov.hedge.server.library.compiler.grammar.GrammarAnalyzer
import com.heerkirov.hedge.server.library.compiler.lexical.LexicalAnalyzer
import com.heerkirov.hedge.server.library.compiler.lexical.LexicalOptions
import com.heerkirov.hedge.server.library.compiler.semantic.SemanticAnalyzer
import com.heerkirov.hedge.server.library.compiler.semantic.dialect.*
import com.heerkirov.hedge.server.library.compiler.translator.*
import com.heerkirov.hedge.server.library.compiler.translator.visual.*
import com.heerkirov.hedge.server.library.compiler.utils.CompileError
import com.heerkirov.hedge.server.utils.structs.CacheMap

class QueryManager(private val data: DataRepository) {
    private val queryer = MetaQueryer(data)
    private val options = OptionsImpl()

    private val executePlanCache = CacheMap<DialectAndText, QuerySchema>(100)

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
                Dialect.SOURCE_IMAGE -> SourceDataDialect::class
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
                Dialect.SOURCE_IMAGE -> SourceImageExecutePlanBuilder(data.db)
            }
            val translatorResult = Translator.parse(semanticResult.result, queryer, builder, options)

            if(translatorResult.result == null) {
                QuerySchema(null, null, warnings = MetaParserUtil.unionList(lexicalResult.warnings, grammarResult.warnings, semanticResult.warnings, translatorResult.warnings), errors = translatorResult.errors)
            }else{
                QuerySchema(translatorResult.result, builder.build(), warnings = MetaParserUtil.unionList(lexicalResult.warnings, grammarResult.warnings, semanticResult.warnings, translatorResult.warnings), errors = emptyList())
            }
        }
    }

    /**
     * 冲刷缓存。因为管理器会尽可能缓存编译结果，在元数据发生变化时若不冲刷缓存，会造成查询结果不准确。
     * @param cacheType 发生变化的实体类型。
     */
    fun flushCacheOf(cacheType: CacheType) {
        //TODO 换用事件总线系统监听变化
        executePlanCache.clear()
        queryer.flushCacheOf(cacheType)
    }

    enum class Dialect { ILLUST, BOOK, TOPIC, AUTHOR, ANNOTATION, SOURCE_IMAGE }

    enum class CacheType { TAG, TOPIC, AUTHOR, ANNOTATION, SOURCE_TAG }

    data class QuerySchema(val visualQueryPlan: VisualQueryPlan?, val executePlan: ExecutePlan?, val warnings: List<CompileError<*>>, val errors: List<CompileError<*>>)

    private data class DialectAndText(val dialect: Dialect, val text: String)

    private inner class OptionsImpl : LexicalOptions, TranslatorOptions {
        private var _translateUnderscoreToSpace: Boolean? = null
        private var _chineseSymbolReflect: Boolean? = null
        private var _warningLimitOfUnionItems: Int? = null
        private var _warningLimitOfIntersectItems: Int? = null

        override val translateUnderscoreToSpace: Boolean get() {
            if (data.setting.query.translateUnderscoreToSpace != _translateUnderscoreToSpace) {
                //TODO 换用事件总线系统监听变化
                _translateUnderscoreToSpace = data.setting.query.translateUnderscoreToSpace
                executePlanCache.clear()
            }
            return _translateUnderscoreToSpace!!
        }
        override val chineseSymbolReflect: Boolean get() {
            if (data.setting.query.chineseSymbolReflect != _chineseSymbolReflect) {
                _chineseSymbolReflect = data.setting.query.chineseSymbolReflect
                executePlanCache.clear()
            }
            return _chineseSymbolReflect!!
        }
        override val warningLimitOfUnionItems: Int get() {
            if (data.setting.query.warningLimitOfUnionItems != _warningLimitOfUnionItems) {
                _warningLimitOfUnionItems = data.setting.query.warningLimitOfUnionItems
                executePlanCache.clear()
            }
            return _warningLimitOfUnionItems!!
        }
        override val warningLimitOfIntersectItems: Int get() {
            if (data.setting.query.warningLimitOfIntersectItems != _warningLimitOfIntersectItems) {
                _warningLimitOfIntersectItems = data.setting.query.warningLimitOfIntersectItems
                executePlanCache.clear()
            }
            return _warningLimitOfIntersectItems!!
        }
    }
}