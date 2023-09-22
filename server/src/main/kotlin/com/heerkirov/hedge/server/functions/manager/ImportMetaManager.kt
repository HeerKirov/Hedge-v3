package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.appdata.ImportOption
import com.heerkirov.hedge.server.exceptions.InvalidRegexError
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.model.ImportImage
import com.heerkirov.hedge.server.utils.tuples.Tuple4
import com.heerkirov.hedge.server.utils.tuples.Tuple5
import java.util.concurrent.ConcurrentHashMap
import java.util.regex.Matcher
import java.util.regex.Pattern
import java.util.regex.PatternSyntaxException

class ImportMetaManager(private val appdata: AppDataManager) {
    /**
     * 对一条import记录的内容进行解析，得到source元数据。
     * @throws InvalidRegexError (regex) 执行正则表达式时发生错误，怀疑是表达式或相关参数没写对
     */
    fun analyseSourceMeta(filename: String?): Tuple5<String?, Long?, Int?, String?, ImportImage.SourcePreference?> {
        for (rule in appdata.setting.import.sourceAnalyseRules) {
            analyseOneRule(rule, filename)?.let { (id, secondaryId, secondaryName, preference) ->
                return Tuple5(rule.site, id, secondaryId, secondaryName, preference)
            }
        }

        return Tuple5(null, null, null, null, null)
    }

    /**
     * @throws InvalidRegexError (regex) 执行正则表达式时发生错误，怀疑是表达式或相关参数没写对
     */
    private fun analyseOneRule(rule: ImportOption.SourceAnalyseRule, filename: String?): Tuple4<Long, Int?, String?, ImportImage.SourcePreference?>? {
        if(filename == null) return null
        try {
            val text = getFilenameWithoutExtension(filename)
            val pattern = patterns.computeIfAbsent(rule.regex) { Pattern.compile(it) }

            val matcher = pattern.matcher(text)
            if(!matcher.find()) return null

            val id = matcher.groupOfIt(rule.idGroup, rule.regex)?.toLong() ?: throw be(InvalidRegexError(rule.regex, "group '${rule.idGroup}' not matched in regex."))
            val part = if(rule.partGroup != null) { matcher.groupOfIt(rule.partGroup, rule.regex)?.toInt() ?: throw be(InvalidRegexError(rule.regex, "group '${rule.partGroup}' not matched in regex.")) }else null
            val partName = if(rule.partNameGroup != null) { matcher.groupOfIt(rule.partNameGroup, rule.regex) ?: throw be(InvalidRegexError(rule.regex, "group '${rule.partNameGroup}' not matched in regex.")) }else null
            val preference = if(rule.extras.isNullOrEmpty()) null else {
                var title: String? = null
                var description: String? = null
                val additionalInfo: MutableMap<String, String> = mutableMapOf()
                val tags: MutableList<ImportImage.SourcePreferenceTag> = mutableListOf()
                val books: MutableList<ImportImage.SourcePreferenceBook> = mutableListOf()
                val relations: MutableList<Long> = mutableListOf()

                for(extra in rule.extras) {
                    val result = matcher.groupOfIt(extra.group, rule.regex) ?: if(extra.optional) continue else throw be(InvalidRegexError(rule.regex, "group '${extra.group}' not matched in regex."))
                    when(extra.target) {
                        ImportOption.SourceAnalyseRuleExtraTarget.TITLE -> title = result
                        ImportOption.SourceAnalyseRuleExtraTarget.DESCRIPTION -> description = result
                        ImportOption.SourceAnalyseRuleExtraTarget.ADDITIONAL_INFO -> additionalInfo[extra.additionalInfoField!!] = result
                        ImportOption.SourceAnalyseRuleExtraTarget.TAG -> tags.add(ImportImage.SourcePreferenceTag(extra.tagType!!, result, null, null))
                        ImportOption.SourceAnalyseRuleExtraTarget.BOOK -> books.add(ImportImage.SourcePreferenceBook(result, null, null))
                        ImportOption.SourceAnalyseRuleExtraTarget.RELATION -> relations.add(result.toLong())
                    }
                }

                if(title != null || description != null || additionalInfo.isNotEmpty() || tags.isNotEmpty() || books.isNotEmpty() || relations.isNotEmpty()) {
                    ImportImage.SourcePreference(title, description, additionalInfo, tags, books, relations)
                }else{
                    null
                }
            }

            return Tuple4(id, part, partName, preference)
        }catch(e: NumberFormatException) {
            throw be(InvalidRegexError(rule.regex, "Some value cannot be convert to number."))
        }catch(e: PatternSyntaxException) {
            throw be(InvalidRegexError(rule.regex, "Pattern syntax error: ${e.message}"))
        }catch(e: Exception) {
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

    private val patterns = ConcurrentHashMap<String, Pattern>()
}