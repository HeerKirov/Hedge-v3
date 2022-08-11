package com.heerkirov.hedge.server.library.compiler.grammar.semantic

import com.heerkirov.hedge.server.library.compiler.utils.ErrorCollector
import com.heerkirov.hedge.server.library.compiler.utils.GrammarError

class SemanticNodeRules {
    @ForExpression("SEQUENCE -> SEQUENCE_ITEM")
    fun eval1(item: SequenceItem): MutList<SequenceItem> {
        return MutList(mutableListOf(item))
    }

    @ForExpressions([
        ForExpression("SEQUENCE -> SEQUENCE SEQUENCE_ITEM"), 
        ForExpression("SEQUENCE -> SEQUENCE & SEQUENCE_ITEM", args = [0, 2])
    ])
    fun eval2And3(mutList: MutList<SequenceItem>, item: SequenceItem): MutList<SequenceItem> {
        return mutList.add(item)
    }

    @ForExpression("SEQUENCE_ITEM -> SEQUENCE_BODY")
    fun eval4(body: SequenceBody): SequenceItem {
        return SequenceItem(minus = false, source = false, body, body.beginIndex, body.endIndex)
    }

    @ForExpressions([
        ForExpression("SEQUENCE_ITEM -> ^ SEQUENCE_BODY"),
        ForExpression("SEQUENCE_ITEM -> - SEQUENCE_BODY")
    ])
    fun eval5And6(symbol: Symbol, body: SequenceBody): SequenceItem {
        return when (symbol.value) {
            "-" -> SequenceItem(minus = true, source = false, body, symbol.beginIndex, body.endIndex)
            "^" -> SequenceItem(minus = false, source = true, body, symbol.beginIndex, body.endIndex)
            else -> throw RuntimeException("Unexpected symbol ${symbol.value}.")
        }
    }

    @ForExpression("SEQUENCE_ITEM -> - ^ SEQUENCE_BODY", args = [0, 2])
    fun eval7(symbol: Symbol, body: SequenceBody): SequenceItem {
        return SequenceItem(minus = true, source = true, body, symbol.beginIndex, body.endIndex)
    }

    @ForExpressions([
        ForExpression("SEQUENCE_BODY -> ELEMENT"),
        ForExpression("SEQUENCE_BODY -> ANNOTATION")
    ])
    fun eval8And9(elementOrAnnotation: SequenceBody): SequenceBody {
        return elementOrAnnotation
    }

    @ForExpression("ELEMENT -> ELEMENT_ITEM")
    fun eval10(items: MutList<SFP>): Element {
        return Element(null, items.toList(), items.beginIndex, items.endIndex)
    }

    @ForExpression("ELEMENT -> ELEMENT_PREFIX ELEMENT_ITEM")
    fun eval11(symbol: Symbol, items: MutList<SFP>): Element {
        return Element(symbol, items.toList(), symbol.beginIndex, items.endIndex)
    }

    @ForExpression("ANNOTATION -> [ ANNOTATION_ITEM ]")
    fun eval12(begin: Symbol, items: MutList<Str>, end: Symbol): Annotation {
        return Annotation(null, items.toList(), begin.beginIndex, end.endIndex)
    }

    @ForExpression("ANNOTATION -> [ ELEMENT_PREFIX ANNOTATION_ITEM ]", injectErrorCollector = true)
    fun eval13(begin: Symbol, symbol: Symbol, items: MutList<Str>, end: Symbol , collector: ErrorCollector<GrammarError<*>>): Annotation {
        return Annotation(symbol, items.toList(), begin.beginIndex, end.endIndex)
    }

    @ForExpressions([
        ForExpression("ELEMENT_PREFIX -> @"),
        ForExpression("ELEMENT_PREFIX -> #"),
        ForExpression("ELEMENT_PREFIX -> $")
    ])
    fun eval14And15And16(symbol: Symbol): Symbol {
        return symbol
    }

    @ForExpression("ANNOTATION_ITEM -> str")
    fun eval17(str: Str): MutList<Str> {
        return MutList(mutableListOf(str))
    }

    @ForExpressions([
        ForExpression("ANNOTATION_ITEM -> ANNOTATION_ITEM | str", args = [0, 2]),
        ForExpression("ANNOTATION_ITEM -> ANNOTATION_ITEM / str", args = [0, 2])
    ])
    fun eval18And19(mutList: MutList<Str>, str: Str): MutList<Str> {
        return mutList.add(str)
    }

    @ForExpression("ELEMENT_ITEM -> SFP")
    fun eval20(sfp: SFP): MutList<SFP> {
        return MutList(mutableListOf(sfp))
    }

    @ForExpressions([
        ForExpression("ELEMENT_ITEM -> ELEMENT_ITEM | SFP", args = [0, 2]),
        ForExpression("ELEMENT_ITEM -> ELEMENT_ITEM / SFP", args = [0, 2])
    ])
    fun eval21And22(mutList: MutList<SFP>, sfp: SFP): MutList<SFP> {
        return mutList.add(sfp)
    }

    @ForExpression("SFP -> SUBJECT")
    fun eval23(subject: Subject): SFP {
        return SFP(subject, null, null, subject.beginIndex, subject.endIndex)
    }

    @ForExpression("SFP -> SUBJECT UNARY_FAMILY")
    fun eval24(subject: Subject, family: Family): SFP {
        return SFP(subject, family, null, subject.beginIndex, family.endIndex)
    }

    @ForExpression("SFP -> SUBJECT FAMILY PREDICATIVE")
    fun eval25(subject: Subject, family: Family, predicative: Predicative): SFP {
        return SFP(subject, family, predicative, subject.beginIndex, predicative.endIndex)
    }

    @ForExpression("SUBJECT -> STRING")
    fun eval26(strList: StrList): Subject {
        return strList
    }

    @ForExpressions([
        ForExpression("UNARY_FAMILY -> ~+"),
        ForExpression("UNARY_FAMILY -> ~-"),
        ForExpression("FAMILY -> :"),
        ForExpression("FAMILY -> >"),
        ForExpression("FAMILY -> >="),
        ForExpression("FAMILY -> <"),
        ForExpression("FAMILY -> <="),
        ForExpression("FAMILY -> ~")
    ])
    fun eval27To34(symbol: Symbol): Family {
        return Family(symbol.value, symbol.beginIndex, symbol.endIndex)
    }

    @ForExpressions([
        ForExpression("PREDICATIVE -> STRING"),
        ForExpression("PREDICATIVE -> COLLECTION"),
        ForExpression("PREDICATIVE -> RANGE"),
        ForExpression("PREDICATIVE -> SORT_LIST")
    ])
    fun eval35To38(predicative: Predicative): Predicative {
        return predicative
    }

    @ForExpression("STRING -> str")
    fun eval39(str: Str): StrList {
        return StrListImpl(mutableListOf(str), str.beginIndex, str.endIndex)
    }

    @ForExpression("STRING -> STRING . str", args = [0, 2])
    fun eval40(strListImpl: StrListImpl, str: Str): StrList {
        return strListImpl.add(str)
    }


    @ForExpression("COLLECTION -> { }")
    fun eval41(begin: Symbol, end: Symbol): Col {
        return Col(emptyList(), begin.beginIndex, end.endIndex)
    }

    @ForExpression("COLLECTION -> { COLLECTION_ITEM }")
    fun eval42(begin: Symbol, mutList: MutList<Str>, end: Symbol): Col {
        return Col(mutList.toList(), begin.beginIndex, end.endIndex)
    }

    @ForExpression("COLLECTION_ITEM -> str")
    fun eval43(str: Str): MutList<Str> {
        return MutList(mutableListOf(str))
    }

    @ForExpression("COLLECTION_ITEM -> COLLECTION_ITEM , str", args = [0, 2])
    fun eval44(mutList: MutList<Str>, str: Str): MutList<Str> {
        return mutList.add(str)
    }

    @ForExpression("RANGE -> RANGE_BEGIN str , str RANGE_END", args = [0, 1, 3, 4])
    fun eval45(beginSymbol: Symbol, beginStr: Str, endStr: Str, endSymbol: Symbol): Range {
        return Range(beginStr, endStr, includeFrom = beginSymbol.value == "[", includeTo = endSymbol.value == "]", beginSymbol.beginIndex, endSymbol.endIndex)
    }

    @ForExpressions([
        ForExpression("RANGE_BEGIN -> ["),
        ForExpression("RANGE_BEGIN -> ("),
        ForExpression("RANGE_END -> ]"),
        ForExpression("RANGE_END -> )")
    ])
    fun eval46To49(symbol: Symbol): Symbol {
        return symbol
    }

    @ForExpression("SORT_LIST -> ORDERED_SORT_ITEM")
    fun eval50(sortItem: SortItem): SortList {
        return SortListImpl(mutableListOf(sortItem), sortItem.beginIndex, sortItem.endIndex)
    }

    @ForExpression("SORT_LIST -> SORT_LIST , ORDERED_SORT_ITEM", args = [0, 2])
    fun eval51(sortListImpl: SortListImpl, sortItem: SortItem): SortList {
        return sortListImpl.add(sortItem)
    }

    @ForExpression("ORDERED_SORT_ITEM -> SORT_ITEM")
    fun eval52(sortItem: SortItem): SortItem {
        return sortItem
    }

    @ForExpressions([
        ForExpression("ORDERED_SORT_ITEM -> + SORT_ITEM"),
        ForExpression("ORDERED_SORT_ITEM -> - SORT_ITEM")
    ])
    fun eval53And54(symbol: Symbol, sortItem: SortItem): SortItem {
        val direction = when (symbol.value) {
            "+" -> 1
            "-" -> -1
            else -> throw RuntimeException("Unexpected symbol ${symbol.value}.")
        }
        return SortItem(sortItem.value, sortItem.source, direction, symbol.beginIndex, sortItem.endIndex)
    }

    @ForExpression("SORT_ITEM -> str")
    fun eval55(str: Str): SortItem {
        return SortItem(str, false, 0, str.beginIndex, str.endIndex)
    }

    @ForExpression("SORT_ITEM -> ^ str", args = [1])
    fun eval56(str: Str): SortItem {
        return SortItem(str, true, 0, str.beginIndex, str.endIndex)
    }
}