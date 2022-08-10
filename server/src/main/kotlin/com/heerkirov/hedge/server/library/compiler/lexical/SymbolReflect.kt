package com.heerkirov.hedge.server.library.compiler.lexical


internal val chineseSingleSymbols = mapOf(
    '：' to ':',
    '》' to '>',
    '《' to '<',
    '～' to '~',
    '｜' to '|',
    '，' to ',',
    '。' to '.',
    '【' to '[',
    '】' to ']',
    '（' to '(',
    '）' to ')',
    '「' to '{',
    '」' to '}',
)

internal val chineseStringBoundSymbols = mapOf(
    '‘' to CharSequenceType.APOSTROPHE,
    '“' to CharSequenceType.DOUBLE_QUOTES
)

internal val chineseStringEndSymbols = mapOf(
    '‘' to '’',
    '“' to '”'
)