package com.heerkirov.hedge.server.utils

import java.util.*

object SqlDelimiter {
    /**
     * 给出一段SQL语句，使用参数列表渲染其中的可替换值。
     */
    fun render(sql: String, arguments: Map<String, String>): String {
        val sb = StringBuilder()
        var start = 0
        while (true) {
            val idx = sql.indexOf("\${", start)
            if(idx < start) {
                sb.append(sql.substring(start))
                break
            }

            val endIdx = sql.indexOf("}", idx).let { if(it >= idx) it else sql.length }
            val argumentName = sql.substring(idx + 2, endIdx)
            val argumentValue = arguments[argumentName] ?: throw IllegalArgumentException("Argument '$argumentName' not exist.")

            sb.append(sql.substring(start, idx))
            sb.append(argumentValue)

            start = endIdx + 1
        }
        return sb.toString()
    }

    /**
     * 给出一段(可以包括数行)SQL语句。使用分号，将其分割为单句的SQL语句。
     * @param sql SQL语句段
     * @return 单句SQL的列表
     */
    fun splitByDelimiter(sql: String): List<String> {
        val result: MutableList<String> = ArrayList()

        //记录字符串匹配状态。null表示不在字符串内，其他表示在字符串内，且表示字符串字符
        var state: Char? = null
        //上一个匹配终点，也就是下一条SQL语句split的起点
        var lastIndex = 0
        var i = 0
        while (i < sql.length) {
            val c = sql[i]
            if (state == null) {
                if (c == ';') {
                    //在字符串外遇到分号，开启字符串分割。上一个终点到分号位置分割为一条
                    result.add(sql.substring(lastIndex, i))
                    //终点设为分号位置+1，这样是下一条的起点
                    lastIndex = i + 1
                } else if (c == '"' || c == '\'' || c == '`') {
                    //在字符串外遇到字符串符号，改变state，进入字符串模式
                    state = c
                } else if (c == '-' && i + 1 < sql.length && sql[i + 1] == '-') {
                    //在字符串外遇到--，改变state，进入注释模式
                    state = '-'
                    i += 1
                } else if (c == '/' && i + 1 < sql.length && sql[i + 1] == '*') {
                    //在字符串外遇到/*，改变state，进入注释模式
                    state = '/'
                    i += 1
                }
            } else if (state == '/') {
                if (c == '*' && i + 1 < sql.length && sql[i + 1] == '/') {
                    //遇到*/结束符
                    state = null
                    i += 1
                }
            } else if (state == '-') {
                if (c == '\n' || c == '\r') {
                    //遇到回车结束符
                    state = null
                }
            } else {
                if (c == '\\') {
                    //在字符串内遇到转义字符，这意味着下一个字符会被转义，包括一个字符串符号
                    //因此直接跳过下一个符号
                    i += 1
                } else if (c == state) {
                    //在字符串内遇到匹配的字符串符号，跳出字符串模式
                    state = null
                }
            }
            i += 1
        }
        if (lastIndex < sql.length) {
            result.add(sql.substring(lastIndex))
        }
        return result.asSequence().map { trimAnyAnnotation(it) }.map { trimWhitespace(it) }.filter { it.isNotEmpty() }.toList()
    }

    /**
     * 去除SQL语句内的任何注释。
     */
    private fun trimAnyAnnotation(s: String): String {
        var str = s
        val stack: MutableList<Int> = LinkedList()
        var lastIndex = -1
        var state: Char? = null
        run {
            var i = 0
            while (i <= str.length) {
                val c = if (i == str.length) '\u0000' else str[i]
                if (state == null) {
                    if (c == '"' || c == '\'' || c == '`') {
                        state = c
                    } else if (c == '-' && i + 1 < str.length && str[i + 1] == '-') {
                        state = '-'
                        lastIndex = i
                        i += 1
                    } else if (c == '/' && i + 1 < str.length && str[i + 1] == '*') {
                        state = '/'
                        lastIndex = i
                        i += 1
                    }
                } else if (state == '/') {
                    if (c == '*' && i + 1 < str.length && str[i + 1] == '/') {
                        state = null
                        stack.add(lastIndex)
                        stack.add(i + 2)
                        i += 1
                    } else if (c == '\u0000') {
                        state = null
                        stack.add(lastIndex)
                        stack.add(i)
                    }
                } else if (state == '-') {
                    if (c == '\n' || c == '\r' || c == '\u0000') {
                        //遇到回车结束符
                        state = null
                        stack.add(lastIndex)
                        stack.add(i)
                    }
                } else {
                    if (c == '\\') {
                        i += 1
                    } else if (c == state) {
                        state = null
                    }
                }
                i += 1
            }
        }
        var i = stack.size - 1
        while (i >= 0) {
            val end = stack[i]
            val begin = stack[i - 1]
            str = str.substring(0, begin) + " " + str.substring(end)
            i -= 2
        }
        return str
    }

    /**
     * 去除字符串两端的任何空白字符。
     */
    private fun trimWhitespace(str: String): String {
        var first = -1
        var last = -1
        for (i in str.indices) {
            val c = str[i]
            if (c != ' ' && c != '\n' && c != '\r' && c != '\t') {
                first = i
                break
            }
        }
        if (first == -1) { return "" }
        for (i in str.length downTo 1) {
            val c = str[i - 1]
            if (c != ' ' && c != '\n' && c != '\r' && c != '\t') {
                last = i
                break
            }
        }
        return if (first == 0 && last == str.length) { str }else{ str.substring(first, last) }
    }
}