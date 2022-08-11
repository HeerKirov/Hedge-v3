package com.heerkirov.hedge.server.functions.manager.query

import com.heerkirov.hedge.server.dao.MetaTagTable
import com.heerkirov.hedge.server.dao.SourceTags
import com.heerkirov.hedge.server.library.compiler.semantic.plan.MetaString
import com.heerkirov.hedge.server.library.compiler.semantic.plan.MetaType
import com.heerkirov.hedge.server.utils.ktorm.escapeLike
import com.heerkirov.hedge.server.enums.MetaType as CommonMetaType
import org.ktorm.dsl.eq
import org.ktorm.dsl.or
import org.ktorm.expression.BinaryExpression
import java.util.concurrent.ConcurrentHashMap

internal object MetaParserUtil {
    /**
     * 将metaString的值编译为对指定种类metaTag的等价或比较操作。
     */
    fun compileNameString(metaString: MetaString, metaTag: MetaTagTable<*>): BinaryExpression<Boolean> {
        return if(metaString.precise) {
            metaTag.name eq metaString.value
        }else{
            val value = mapMatchToSqlLike(metaString.value)
            (metaTag.name escapeLike value) or (metaTag.otherNames escapeLike value)
        }
    }

    /**
     * 将metaString的值编译为对指定种类metaTag的等价或比较操作。
     */
    fun compileNameString(metaString: MetaString, metaTag: SourceTags): BinaryExpression<Boolean> {
        return if(metaString.precise) {
            metaTag.name eq metaString.value
        }else{
            val value = mapMatchToSqlLike(metaString.value)
            (metaTag.code escapeLike value) or (metaTag.name escapeLike value) or (metaTag.otherName escapeLike value)
        }
    }

    /**
     * 根据metaString的类型，判断它是否能匹配目标缓存项。
     */
    fun isNameEqualOrMatch(metaString: MetaString, item: MetaQueryer.ItemInterface): Boolean {
        return if(metaString.precise) {
            metaString.value.equals(item.name, ignoreCase = true)
        }else{
            val regex = mapMatchToRegexPattern(metaString.value)
            regex.containsMatchIn(item.name) || item.otherNames.any { regex.containsMatchIn(it) }
        }
    }

    /**
     * 将HQL的match字符串翻译至符合sql like标准的格式，并转义需要防备的字符。
     */
    fun mapMatchToSqlLike(matchString: String): String {
        return sqlLikeMap.computeIfAbsent(matchString) {
            escapeSqlLike(escapeSqlSpecial(it))
        }
    }

    /**
     * 执行sql like转义，将具有特殊意义的符号转义掉。
     */
    fun escapeSqlSpecial(string: String): String {
        return string.replace(sqlLikeReplaceRegex, """\\$0""")
    }

    /**
     * 执行sql like转义，将HQL中的查询符号转义到sql like。
     */
    fun escapeSqlLike(string: String): String {
        return '%' + string.replace('*', '%').replace('?', '_') + '%'
    }

    /**
     * 将HQL的match字符串翻译至正则表达式标准格式，并转义需要防备的字符。
     */
    private fun mapMatchToRegexPattern(matchString: String): Regex {
        return regexPatternMap.computeIfAbsent(matchString) {
            val pattern = it
                .replace("\\", "\\\\")
                .replace(regexPatternReplaceRegex, "\\$0")
                .replace("*", ".*")
                .replace('?', '.')
            Regex(pattern, RegexOption.IGNORE_CASE)
        }
    }

    /**
     * 串联列表。
     */
    fun <T> unionList(vararg list: List<T>): List<T> {
        val result = ArrayList<T>(list.sumOf { it.size })
        for (i in list) {
            result.addAll(i)
        }
        return result
    }

    /**
     * 将compiler内部使用的metaType转译至公共metaType。
     */
    fun translateMetaType(metaType: MetaType): CommonMetaType {
        return when(metaType) {
            MetaType.TOPIC -> CommonMetaType.TOPIC
            MetaType.AUTHOR -> CommonMetaType.AUTHOR
            MetaType.TAG -> CommonMetaType.TAG
        }
    }

    private val sqlLikeMap = ConcurrentHashMap<String, String>()
    private val regexPatternMap = ConcurrentHashMap<String, Regex>()

    private val sqlLikeReplaceRegex = Regex("""[/"'\[\]%&_()\\]""")
    private val regexPatternReplaceRegex = Regex("""[$()+.\[\\^{|]""")
}