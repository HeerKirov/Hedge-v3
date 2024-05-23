package com.heerkirov.hedge.server.functions.manager.query

import com.heerkirov.hedge.server.dao.Annotations
import com.heerkirov.hedge.server.dao.MetaTagTable
import com.heerkirov.hedge.server.dao.SourceTags
import com.heerkirov.hedge.server.library.compiler.semantic.plan.MetaAddress
import com.heerkirov.hedge.server.library.compiler.semantic.plan.MetaString
import com.heerkirov.hedge.server.library.compiler.semantic.plan.MetaType
import com.heerkirov.hedge.server.utils.ktorm.escapeLike
import org.ktorm.dsl.and
import com.heerkirov.hedge.server.enums.MetaType as CommonMetaType
import org.ktorm.dsl.eq
import org.ktorm.dsl.like
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
            (metaTag.name escapeLike value) or (metaTag.otherNames escapeLike "%|$value|%")
        }
    }

    /**
     * 将metaString的值编译为对annotation的等价或比较操作。
     */
    fun compileNameString(metaString: MetaString, annotation: Annotations): BinaryExpression<Boolean> {
        return if(metaString.precise) {
            annotation.name eq metaString.value
        }else{
            Annotations.name like mapMatchToSqlLike(metaString.value)
        }
    }

    /**
     * 将metaString的值编译为对sourceTag的等价或比较操作。
     */
    fun compileNameString(metaAddress: MetaAddress, metaTag: SourceTags): BinaryExpression<Boolean> {
        val tag = if(metaAddress.last().precise) {
            (metaTag.code eq metaAddress.last().value) or (metaTag.name eq metaAddress.last().value)
        }else{
            val value = mapMatchToSqlLike(metaAddress.last().value)
            (metaTag.code escapeLike value) or (metaTag.name escapeLike value) or (metaTag.otherName escapeLike value)
        }

        val site = if(metaAddress.size < 2) null else if(metaAddress.first().precise) {
            SourceTags.site eq metaAddress.first().value
        }else{
            SourceTags.site like '%' + mapMatchToSqlLike(metaAddress.first().value, escape = false) + '%'
        }

        val type = if(metaAddress.size < 3) null else if(metaAddress[1].precise) {
            SourceTags.type eq metaAddress[1].value
        }else{
            SourceTags.type like '%' + mapMatchToSqlLike(metaAddress[1].value, escape = false) + '%'
        }

        //在长度为2时，address被认为是site:name；长度为3时，被认为是site.type:name；高于这个长度，则被认为是非法值
        return when(metaAddress.size) {
            3 -> tag and site!! and type!!
            2 -> tag and site!!
            1 -> tag
            else -> throw RuntimeException("SourceTag address has illegal length.")
        }
    }

    /**
     * 将metaString的值编译为对指定种类metaTag的等价或比较操作。
     */
    fun forecastNameString(metaString: MetaString, metaTag: MetaTagTable<*>): BinaryExpression<Boolean> {
        return if(metaString.precise) {
            metaTag.name like '%' + mapMatchToSqlLike(metaString.value, escape = false) + '%'
        }else{
            val value = '%' + mapMatchToSqlLike(metaString.value) + '%'
            (metaTag.name escapeLike value) or (metaTag.otherNames escapeLike value)
        }
    }

    /**
     * 将metaString的值编译为对annotation的等价或比较操作。该函数用于预测查询。
     */
    fun forecastNameString(metaString: MetaString, annotation: Annotations): BinaryExpression<Boolean> {
        return if(metaString.precise) {
            annotation.name like '%' + mapMatchToSqlLike(metaString.value, escape = false) + '%'
        } else {
            annotation.name like '%' + mapMatchToSqlLike(metaString.value) + '%'
        }
    }

    /**
     * 将metaString的值编译为对sourceTag的等价或比较操作。
     */
    fun forecastNameString(metaAddress: MetaAddress, sourceTag: SourceTags): BinaryExpression<Boolean> {
        val tag = if(metaAddress.last().precise) {
            sourceTag.code like '%' + mapMatchToSqlLike(metaAddress.last().value, escape = false) + '%'
        }else{
            val value = '%' + mapMatchToSqlLike(metaAddress.last().value) + '%'
            (sourceTag.code escapeLike value) or (sourceTag.name escapeLike value) or (sourceTag.otherName escapeLike value)
        }

        val site = if(metaAddress.size < 2) null else if(metaAddress.first().precise) {
            SourceTags.site eq metaAddress.first().value
        }else{
            SourceTags.site like '%' + mapMatchToSqlLike(metaAddress.first().value, escape = false) + '%'
        }

        val type = if(metaAddress.size < 3) null else if(metaAddress[1].precise) {
            SourceTags.type eq metaAddress[1].value
        }else{
            SourceTags.type like '%' + mapMatchToSqlLike(metaAddress[1].value, escape = false) + '%'
        }

        return when(metaAddress.size) {
            3 -> tag and site!! and type!!
            2 -> tag and site!!
            1 -> tag
            else -> throw RuntimeException("SourceTag address has illegal length.")
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
     * 将match filter的字符串翻译至符合sql like标准的格式，添加首尾的%%使其可以模糊匹配，并转义需要防备的字符。
     */
    fun compileMatchFilter(matchString: String, exact: Boolean = false): String {
        return if(exact) {
            escapeSqlLike(escapeSqlSpecial(matchString))
        }else{
            '%' + escapeSqlLike(escapeSqlSpecial(matchString)) + '%'
        }
    }

    /**
     * 判断match filter字符串中是否包含任何sql通配符。
     */
    fun isAnySqlSpecial(matchString: String): Boolean {
        return matchString.contains(sqlSpecialRegex)
    }

    /**
     * 将HQL的match字符串翻译至符合sql like标准的格式，并转义需要防备的字符。
     */
    private fun mapMatchToSqlLike(matchString: String, escape: Boolean = true): String {
        return if(escape) {
            sqlLikeMap.computeIfAbsent(matchString) { escapeSqlLike(escapeSqlSpecial(it)) }
        }else{
            escapeSqlSpecial(matchString)
        }
    }

    /**
     * 执行sql like转义，将具有特殊意义的符号转义掉。
     */
    private fun escapeSqlSpecial(string: String): String {
        return string.replace(sqlLikeReplaceRegex, """\\$0""")
    }

    /**
     * 执行sql like转义，将HQL中的查询符号转义到sql like。
     */
    private fun escapeSqlLike(string: String): String {
        return string.replace('*', '%').replace('?', '_')
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

    private val sqlLikeReplaceRegex = Regex("""[\\%_]""")
    private val regexPatternReplaceRegex = Regex("""[$()+.\[\\^{|]""")
    private val sqlSpecialRegex = Regex("""[\\*?]""")
}