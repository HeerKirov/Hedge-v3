package com.heerkirov.hedge.server.utils.business

import java.util.regex.Pattern

/**
 * 检查name的命名是否符合要求。用于tag类entity的检查。
 * 要求name不能包含非空字符和禁用符号。
 */
fun checkTagName(name: String): Boolean {
    //检查name是否符合规范。

    //不能不包含非空字符
    if(name.isBlank()) {
        return false
    }

    //不能包含禁用符号' " ` . |
    for (c in disableCharacter) {
        if(name.contains(c)) {
            return false
        }
    }
    return true
}

/**
 * 检查name的命名是否符合要求。
 * 要求name只能为[A-Za-z0-9_]，且开头只能是[A-Za-z]。
 */
fun checkVariableName(name: String): Boolean {
    //不能不包含非空字符
    if(name.isBlank()) {
        return false
    }

    return variableRegex.matcher(name).find()
}

/**
 * 检查score的范围是否符合要求。
 */
fun checkScore(score: Int): Boolean {
    return score in 1..10
}

private val disableCharacter = arrayOf('\'', '"', '`', '.', '|')
private val variableRegex = Pattern.compile("^[A-Za-z][A-Za-z0-9_]*$")