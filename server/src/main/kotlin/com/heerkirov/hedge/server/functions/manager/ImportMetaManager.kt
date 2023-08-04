package com.heerkirov.hedge.server.functions.manager

import com.heerkirov.hedge.server.components.appdata.AppDataManager
import com.heerkirov.hedge.server.components.appdata.ImportOption
import com.heerkirov.hedge.server.exceptions.InvalidRegexError
import com.heerkirov.hedge.server.exceptions.be
import com.heerkirov.hedge.server.model.ImportImage
import com.heerkirov.hedge.server.utils.tuples.Tuple4
import java.util.concurrent.ConcurrentHashMap
import java.util.regex.Matcher
import java.util.regex.Pattern
import java.util.regex.PatternSyntaxException

class ImportMetaManager(private val appdata: AppDataManager) {
    /**
     * 对一条import记录的内容进行解析，得到source元数据。
     * @throws InvalidRegexError (regex) 执行正则表达式时发生错误，怀疑是表达式或相关参数没写对
     */
    fun analyseSourceMeta(filename: String?): Tuple4<String?, Long?, Int?, ImportImage.SourcePreference?> {
        for (rule in appdata.setting.import.sourceAnalyseRules) {
            analyseOneRule(rule, filename)?.let { (id, secondaryId, preference) ->
                return Tuple4(rule.site, id, secondaryId, preference)
            }
        }

        return Tuple4(null, null, null, null)
    }

    /**
     * @throws InvalidRegexError (regex) 执行正则表达式时发生错误，怀疑是表达式或相关参数没写对
     */
    private fun analyseOneRule(rule: ImportOption.SourceAnalyseRule, filename: String?): Triple<Long, Int?, ImportImage.SourcePreference?>? {
        if(filename == null) return null
        try {
            val text = getFilenameWithoutExtension(filename)
            val pattern = patterns.computeIfAbsent(rule.regex) { Pattern.compile(it) }

            val matcher = pattern.matcher(text)
            if(!matcher.find()) return null

            val id = matcher.groupByIt(rule.idGroup).toLong()
            val secondaryId = rule.secondaryIdGroup?.let { matcher.groupByIt(it) }?.toInt()
            val preference = if(rule.extras.isNullOrEmpty()) null else {
                var title: String? = null
                var description: String? = null
                val additionalInfo: MutableMap<String, String> = mutableMapOf()
                val tags: MutableList<ImportImage.SourcePreferenceTag> = mutableListOf()
                val books: MutableList<ImportImage.SourcePreferenceBook> = mutableListOf()
                val relations: MutableList<Long> = mutableListOf()

                for(extra in rule.extras) {
                    val result = try {
                        matcher.groupByIt(extra.group)
                    }catch(e: IndexOutOfBoundsException) {
                        if(extra.optional) continue else throw e
                    }catch(e: IllegalArgumentException) {
                        if(extra.optional) continue else throw e
                    }
                    when(extra.target) {
                        ImportOption.SourceAnalyseRuleExtraTarget.TITLE -> title = result
                        ImportOption.SourceAnalyseRuleExtraTarget.DESCRIPTION -> description = result
                        ImportOption.SourceAnalyseRuleExtraTarget.ADDITIONAL_INFO -> additionalInfo[extra.additionalInfoField!!] = result
                        ImportOption.SourceAnalyseRuleExtraTarget.TAG -> tags.add(ImportImage.SourcePreferenceTag(result, null, null, extra.tagType))
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

            return Triple(id, secondaryId, preference)
        }catch(e: IndexOutOfBoundsException) {
            throw be(InvalidRegexError(rule.regex, "Specified group index of id/secondaryId/extra is out of bounds of matches."))
        }catch(e: IllegalArgumentException) {
            throw be(InvalidRegexError(rule.regex, "Specified group name of id/secondaryId/extra is illegal of matches."))
        }catch(e: NumberFormatException) {
            throw be(InvalidRegexError(rule.regex, "Value of id/secondaryId cannot be convert to number."))
        }catch(e: PatternSyntaxException) {
            throw be(InvalidRegexError(rule.regex, "Pattern syntax error: ${e.message}"))
        }catch(e: Exception) {
            throw be(InvalidRegexError(rule.regex, e.message ?: e::class.simpleName ?: "Unnamed exception."))
        }
    }

    private fun Matcher.groupByIt(group: String): String {
        return group.toIntOrNull()?.let { this.group(it) } ?: this.group(group)
    }

    private fun getFilenameWithoutExtension(filename: String): String {
        val i = filename.lastIndexOf('.')
        return if(i >= 0) filename.substring(0, i) else filename
    }

    private val patterns = ConcurrentHashMap<String, Pattern>()
}