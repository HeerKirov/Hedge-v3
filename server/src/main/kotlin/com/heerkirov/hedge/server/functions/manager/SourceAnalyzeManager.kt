package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.appdata.ImportOption
import com.heerkirov.hedge.server.components.appdata.SourceOption
import com.heerkirov.hedge.server.components.bus.EventBus
import com.heerkirov.hedge.server.dto.form.SourceBookForm
import com.heerkirov.hedge.server.dto.form.SourceDataAdditionalInfoForm
import com.heerkirov.hedge.server.dto.form.SourceDataUpdateForm
import com.heerkirov.hedge.server.dto.form.SourceTagForm
import com.heerkirov.hedge.server.dto.res.SourceDataPath
import com.heerkirov.hedge.server.events.SettingSourceSiteChanged
import com.heerkirov.hedge.server.exceptions.BusinessException
import com.heerkirov.hedge.server.exceptions.InvalidRegexError
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.utils.business.sourcePathOf
import com.heerkirov.hedge.server.utils.runIf
import com.heerkirov.hedge.server.utils.tuples.Tuple4
import com.heerkirov.hedge.server.utils.types.optOf
import com.heerkirov.hedge.server.utils.types.optOrUndefined
import com.heerkirov.hedge.server.utils.types.undefined
import java.util.concurrent.ConcurrentHashMap
import java.util.regex.Matcher
import java.util.regex.Pattern
import java.util.regex.PatternSyntaxException

class SourceAnalyzeManager(private val appdata: AppDataManager, bus: EventBus, private val siteManager: SourceSiteManager) {
    init {
        bus.on(SettingSourceSiteChanged::class) {
            builtinRules = generateBuiltinRules()
        }
    }
    /**
     * 对一条import记录的内容进行解析，得到source元数据。
     * @throws InvalidRegexError (regex) 执行正则表达式时发生错误，怀疑是表达式或相关参数没写对
     */
    fun analyseSourceMeta(filename: String?): Pair<SourceDataPath, SourceDataUpdateForm?>? {
        for (rule in getBuiltinRules()) {
            analyseOneRule(rule, filename)?.let { (id, secondaryId, secondaryName, form) ->
                return Pair(sourcePathOf(rule.site, id, secondaryId, secondaryName), form)
            }
        }
        for (rule in appdata.setting.import.sourceAnalyseRules) {
            analyseOneRule(rule, filename)?.let { (id, secondaryId, secondaryName, form) ->
                return Pair(sourcePathOf(rule.site, id, secondaryId, secondaryName), form)
            }
        }
        return null
    }

    /**
     * @throws InvalidRegexError (regex) 执行正则表达式时发生错误，怀疑是表达式或相关参数没写对
     */
    private fun analyseOneRule(rule: ImportOption.SourceAnalyseRule, filename: String?): Tuple4<String, Int?, String?, SourceDataUpdateForm?>? {
        if(filename == null) return null
        try {
            val text = getFilenameWithoutExtension(filename)
            val pattern = patterns.computeIfAbsent(rule.regex) { Pattern.compile(it) }

            val matcher = pattern.matcher(text)
            if(!matcher.find()) return null

            val id = matcher.groupOfIt(rule.idGroup, rule.regex) ?: throw be(InvalidRegexError(rule.regex, "group '${rule.idGroup}' not matched in regex."))
            val part = if(rule.partGroup != null) { matcher.groupOfIt(rule.partGroup, rule.regex)?.toInt() ?: throw be(InvalidRegexError(rule.regex, "group '${rule.partGroup}' not matched in regex.")) }else null
            val partName = if(rule.partNameGroup != null) { matcher.groupOfIt(rule.partNameGroup, rule.regex) }else null
            val form = if(rule.extras.isNullOrEmpty()) null else {
                var title: String? = null
                var description: String? = null
                val additionalInfo: MutableMap<String, String> = mutableMapOf()
                val tags: MutableList<SourceTagForm> = mutableListOf()
                val books: MutableList<SourceBookForm> = mutableListOf()
                val relations: MutableList<String> = mutableListOf()

                for(extra in rule.extras) {
                    val result = matcher.groupOfIt(extra.group, rule.regex)
                        ?.runIf(extra.translateUnderscoreToSpace) { replace('_', ' ') }
                        ?: if(extra.optional) continue else throw be(InvalidRegexError(rule.regex, "group '${extra.group}' not matched in regex."))
                    when(extra.target) {
                        ImportOption.SourceAnalyseRuleExtraTarget.TITLE -> title = result
                        ImportOption.SourceAnalyseRuleExtraTarget.DESCRIPTION -> description = result
                        ImportOption.SourceAnalyseRuleExtraTarget.ADDITIONAL_INFO -> additionalInfo[extra.additionalInfoField!!] = result
                        ImportOption.SourceAnalyseRuleExtraTarget.TAG -> tags.add(SourceTagForm(extra.tagType!!, result, undefined(), undefined()))
                        ImportOption.SourceAnalyseRuleExtraTarget.BOOK -> books.add(SourceBookForm(result, undefined(), undefined()))
                        ImportOption.SourceAnalyseRuleExtraTarget.RELATION -> relations.add(result)
                    }
                }

                if(title != null || description != null || additionalInfo.isNotEmpty() || tags.isNotEmpty() || books.isNotEmpty() || relations.isNotEmpty()) {
                    SourceDataUpdateForm(
                        title = optOrUndefined(title),
                        description = optOrUndefined(description),
                        tags = if(tags.isNotEmpty()) optOf(tags) else undefined(),
                        books = if(books.isNotEmpty()) optOf(books) else undefined(),
                        relations = if(relations.isNotEmpty()) optOf(relations) else undefined(),
                        additionalInfo = if(additionalInfo.isNotEmpty()) optOf(additionalInfo.entries.map { SourceDataAdditionalInfoForm(it.key, it.value) }) else undefined(),
                        publishTime = undefined(),
                        status = undefined()
                    )
                }else{
                    null
                }
            }

            return Tuple4(id, part, partName, form)
        }catch(e: NumberFormatException) {
            throw be(InvalidRegexError(rule.regex, "Some value cannot be convert to number."))
        }catch(e: PatternSyntaxException) {
            throw be(InvalidRegexError(rule.regex, "Pattern syntax error: ${e.message}"))
        }catch (e: BusinessException) {
            throw e
        } catch(e: Exception) {
            throw be(InvalidRegexError(rule.regex, e.message ?: e::class.simpleName ?: "Unnamed exception."))
        }
    }

    private fun Matcher.groupOfIt(group: String, regex: String): String? {
        try {
            return group.toIntOrNull()?.let { this.group(it) } ?: this.group(group)
        }catch(e: IndexOutOfBoundsException) {
            throw be(InvalidRegexError(regex, "group '$group' not exist in regex."))
        }catch(e: IllegalArgumentException) {
            throw be(InvalidRegexError(regex, "group '$group' not exist in regex."))
        }
    }

    private fun getFilenameWithoutExtension(filename: String): String {
        val i = filename.lastIndexOf('.')
        return if(i >= 0) filename.substring(0, i) else filename
    }

    private fun generateBuiltinRules(): List<ImportOption.SourceAnalyseRule> {
        return siteManager.list().filter { it.isBuiltin }.map {
            val id = if(it.idMode == SourceOption.SiteIdMode.NUMBER) "_(?<ID>\\d+)" else "_(?<ID>[A-Za-z0-9]+)"
            val part = when(it.partMode) {
                SourceOption.SitePartMode.PAGE_WITH_NAME -> "_(?<P>\\d+)(_(?<PN>[A-Za-z0-9]+))?"
                SourceOption.SitePartMode.PAGE -> "_(?<P>\\d+)"
                SourceOption.SitePartMode.NO -> ""
            }
            val partGroup = if(it.partMode != SourceOption.SitePartMode.NO) "P" else null
            val partNameGroup = if(it.partMode == SourceOption.SitePartMode.PAGE_WITH_NAME) "PN" else null
            ImportOption.SourceAnalyseRule(it.name, "${it.name}$id$part", "ID", partGroup, partNameGroup, null)
        }
    }

    private fun getBuiltinRules(): List<ImportOption.SourceAnalyseRule> {
        if(builtinRules == null) {
            synchronized(this) {
                if(builtinRules == null) {
                    builtinRules = generateBuiltinRules()
                }
            }
        }
        return builtinRules!!
    }

    @Volatile private var builtinRules: List<ImportOption.SourceAnalyseRule>? = null

    private val patterns = ConcurrentHashMap<String, Pattern>()
}