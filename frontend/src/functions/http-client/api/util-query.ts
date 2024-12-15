import { UsefulColors } from "@/constants/ui"
import { HttpInstance, Response } from ".."
import { TagAddressType } from "./tag"
import { TopicType } from "./topic"
import { AuthorType } from "./author"

export function createUtilQueryEndpoint(http: HttpInstance): UtilQueryEndpoint {
    return {
        querySchema: http.createDataRequest("/api/utils/query/schema", "POST"),
        queryForecast: http.createDataRequest("/api/utils/query/forecast", "POST"),
        history: {
            get: http.createPathRequest(dialect => `/api/utils/query/history/${dialect}`),
            push: http.createPathDataRequest(dialect => `/api/utils/query/history/${dialect}`, "POST", {
                parseData: text => ({text})
            }),
            clear: http.createPathRequest(dialect => `/api/utils/query/history/${dialect}`, "DELETE"),
        }
    }
}

export interface UtilQueryEndpoint {
    querySchema(form: QueryForm): Promise<Response<QueryRes>>
    queryForecast(form: ForecastForm): Promise<Response<ForecastRes>>
    history: {
        get(dialect: Dialect): Promise<Response<string[]>>
        push(dialect: Dialect, text: string): Promise<Response<string[]>>
        clear(dialect: Dialect): Promise<Response<null>>
    }
}

export type Dialect = "ILLUST" | "BOOK" | "SOURCE_DATA" | "TOPIC" | "AUTHOR"

export interface QueryForm {
    text: string
    dialect: Dialect
}

export interface QueryRes {
    queryPlan: QueryPlan | null
    warnings: CompileError[]
    errors: CompileError[]
}

export interface QueryPlan {
    sorts: string[]
    elements: ElementGroup[]
    filters: FilterGroup[]
}

export type ElementGroup
    = { type: "name", intersectItems: ElementItem<ElementString>[] }
    | { type: "description", intersectItems: ElementItem<ElementString>[] }
    | { type: "meta-tag", intersectItems: ElementItem<ElementTopic | ElementAuthor | ElementTag>[] }
    | { type: "source-tag", intersectItems: ElementItem<ElementSourceTag>[] }
export interface ElementItem<V> { exclude: boolean, unionItems: V[] }
export type ElementValue = ElementString | ElementSourceTag | ElementTopic | ElementAuthor | ElementTag
interface ElementString { type: undefined, value: string, precise: boolean }
export interface ElementSourceTag { type: "source-tag", id: number, name: string, code: string, otherName: string | null, site: string, sourceTagType: string }
export interface ElementTopic { type: "topic", id: number, name: string, otherNames: string[], tagType: TopicType, color: UsefulColors | null }
export interface ElementAuthor { type: "author", id: number, name: string, otherNames: string[], tagType: AuthorType, color: UsefulColors | null }
export interface ElementTag { type: "tag", id: number, name: string, tagType: TagAddressType, otherNames: string[], color: UsefulColors | null, realTags: { id: number, name: string, tagType: TagAddressType }[] }

export interface FilterGroup { exclude: boolean, fields: FilterOfOneField[] }
export interface FilterOfOneField { name: string, values: FilterValue[] }
export type FilterValue = { type: "equal", value: string | number }
    | { type: "match", value: string | number }
    | { type: "range", begin: string | number | null, end: string | number | null, includeBegin: boolean, includeEnd: boolean }

//=== 预测功能 ===

export interface ForecastForm {
    text: string
    cursorIndex: number | null
    dialect: Dialect
}

export type ForecastRes = {
    succeed: false
    forecast: null
} | {
    succeed: true
    forecast: VisualForecast
}

export interface VisualForecast {
    type: "source-tag" | "keyword" | "tag" | "topic" | "author" | "filter" | "sort"
    context: string
    suggestions: {name: string, aliases: string[], address: string[] | null}[]
    beginIndex: number
    endIndex: number
    fieldName: string | null
}

//=== 编译错误和警告 ===

export type CompileError = NormalCharacterEscaped
    | ExpectQuoteButEOF
    | ExpectEscapedCharacterButEOF
    | UselessSymbol
    | UnexpectedToken
    | UnexpectedEOF
    | FilterValueRequired
    | FilterValueNotRequired
    | UnsupportedFilterValueType
    | UnsupportedFilterValueTypeOfRelation
    | UnsupportedFilterRelationSymbol
    | InvalidMetaTagForThisPrefix
    | ElementPrefixNotRequired
    | ElementValueNotRequired
    | UnsupportedElementValueType
    | UnsupportedElementValueTypeOfRelation
    | UnsupportedElementRelationSymbol
    | SortValueRequired
    | SortValueMustBeSortList
    | InvalidSortItem
    | SortIsIndependent
    | DuplicatedSortItem
    | ValueCannotBeAddress
    | ValueCannotBePatternInComparison
    | TypeCastError
    | EnumTypeCastError
    | UnsupportedSemanticStructure
    | IdentifiesAndElementsCannotBeMixed
    | ThisIdentifyCannotHaveSourceFlag
    | ThisIdentifyMustHaveSourceFlag
    | BracketCannotHaveSourceFlag
    | BlankElement
    | ElementMatchesNone
    | WholeElementMatchesNone
    | RangeElementNotFound
    | ElementMatchedButNotGroup
    | NumberOfUnionItemExceed
    | NumberOfIntersectItemExceed

interface CompileErrorTemplate<C extends number, I> {
    code: C
    message: string
    happenPosition: IndexRange | null
    info: I
}

interface IndexRange {
    begin: number
    end: number | null
}

//=== 词法分析错误 ===

/**
 * 转义了一个普通字符，而非需要被转义的符号。
 * info: 这个普通字符char
 */
type NormalCharacterEscaped = CompileErrorTemplate<1001, string>

/**
 * 希望遇到字符串终结符，但是却遇到了字符串末尾。终结符丢失。
 * info: 这个字符串符号quote
 */
type ExpectQuoteButEOF = CompileErrorTemplate<1002, string>

/**
 * 希望在转义字符后遇到一个符号用于转义，但是却遇到了字符串末尾。转义符号丢失。
 */
type ExpectEscapedCharacterButEOF = CompileErrorTemplate<1003, null>

/**
 * 遇到了意料之外的符号，此符号在词法中没有任何作用，因此将被忽略掉。
 * info: 这个没用的符号char
 */
type UselessSymbol = CompileErrorTemplate<1004, string>

//=== 语法分析错误 ===

/**
 * 遇到了预料之外的token。
 * info: 实际遇到的词素 & 此位置能接受的下一个词素
 */
type UnexpectedToken = CompileErrorTemplate<2001, {actual: string, expected: string[]}>

/**
 * 遇到了预料之外的结束EOF。
 * info: 实际遇到的词素(EOF) & 此位置能接受的下一个词素
 */
type UnexpectedEOF = CompileErrorTemplate<2002, {actual: "∑", expected: string[]}>

//=== 语义分析错误 ===

/**
 * 表语中的值的类型标记。
 */
type ValueType = "COLLECTION" | "RANGE" | "SORT_LIST"

//==== 关键字项目 ====

/**
 * 此关键字项目要求关系和值，但是缺失了关系和值。[begin, end)应标记关键字的subject。
 * info: key: 关键字名称，例如ID
 */
type FilterValueRequired = CompileErrorTemplate<3001, {key: string}>

/**
 * 此关键字项目不应该有关系和值。[begin, end)应标记关键字的sfp。
 * info: key: 关键字名称，例如FAVORITE
 */
type FilterValueNotRequired = CompileErrorTemplate<3002, {key: string}>

/**
 * 此关键字项目不支持这个种类的值。和下一个的区别是，无论如何不应该出现这个种类的值。[begin, end)应标记predicative。
 * info: key: 关键字名称; valueType: 指出不支持的类型结构
 */
type UnsupportedFilterValueType = CompileErrorTemplate<3003, {key: string, valueType: ValueType}>

/**
 * 此关键字项目下，当前关系不支持这个种类的值。和上一个的区别是，换一个运算符号可能支持。[begin, end)应标记predicative。
 * info: key: 关键字名称; valueType: 指出不支持的类型结构; symbol: 指出当前的运算符号
 */
type UnsupportedFilterValueTypeOfRelation = CompileErrorTemplate<3004, {key: string, valueType: ValueType, symbol: string}>

/**
 * 此关键字项目不支持这个种类的关系运算。[begin, end)应标记family。
 * info: key: 关键字名称; symbol: 指出不受支持的运算符号。
 */
type UnsupportedFilterRelationSymbol = CompileErrorTemplate<3005, {key: string, symbol: string}>

//==== 元素项目 ====

/**
 * 此条meta tag元素的结构不满足显式指定的类型限制。topic(#)要求结构不能有关系和值; author(@)要求结构必须是单节地址。[begin, end)应标记整个element。
 * info: 指出tag类型的符号。
 */
type InvalidMetaTagForThisPrefix = CompileErrorTemplate<3006, string>

/**
 * 这一种类的element要求不能有类型前缀，但是给出了前缀。[begin, end)应标记element。
 * info: key: element类型名称
 */
type ElementPrefixNotRequired = CompileErrorTemplate<3007, {key: string}>

/**
 * 此元素项目不应该有关系和值。[begin, end)应标记关键字的sfp。
 * info: key: element类型名称
 */
type ElementValueNotRequired = CompileErrorTemplate<3008, {key: string}>

/**
 * 此元素项目不支持这个种类的值。和下一个的区别是，无论如何不应该出现这个种类的值。[begin, end)应标记predicative。
 * info: key: element类型名称; valueType: 指出不支持的类型结构
 */
type UnsupportedElementValueType = CompileErrorTemplate<3009, {key: string, valueType: ValueType}>

/**
 * 此元素项目下，当前关系不支持这个种类的值。和上一个的区别是，换一个运算符号可能支持。[begin, end)应标记predicative。
 * info: key: element类型名称; valueType: 指出不支持的类型结构; symbol: 指出当前的运算符号
 */
type UnsupportedElementValueTypeOfRelation = CompileErrorTemplate<3010, {key: string, valueType: ValueType, symbol: string}>

/**
 * 此元素项目不支持这个种类的关系运算。[begin, end)应标记predicative。
 * info: key: element类型名称; valueType: 指出不支持的类型结构; symbol: 指出当前的运算符号
 */
type UnsupportedElementRelationSymbol = CompileErrorTemplate<3011, {key: string, symbol: string}>

//==== 排序项目 ====

/**
 * 排序项目需要有关系和值。[begin, end)应标记关键字的subject。
 */
type SortValueRequired = CompileErrorTemplate<3012, null>

/**
 * 排序项目的关系和值必须是:排序列表。[begin, end)应标记项目的sfp。
 */
type SortValueMustBeSortList = CompileErrorTemplate<3013, null>

/**
 * 值不是正确的排序列表项。[begin, end)应标记项目的sfp。
 * info: value: 错误的列表项; expected: 给出正确可用的排序项列表。
 */
type InvalidSortItem = CompileErrorTemplate<3014, {value: string, expected: string[]}>

/**
 * 排序项是独立而特别的：它不能被排除(-)，不能标记为来源项(^)，也不能和任何项用或(|)连接。[begin, end)标记整个body。
 */
type SortIsIndependent = CompileErrorTemplate<3015, null>

/**
 * 在排序项列表中出现了重复的排序项。后一次出现的项会被忽略。[begin, end)标记这个sort项。
 * info: 这个被忽略的排序项。
 */
type DuplicatedSortItem = CompileErrorTemplate<3016, string>

//==== 值类型相关 ====

/**
 * 值不能写成meta tag地址段的形式(a.b.c)，只能是一项string。[begin, end)应标记地址段strList。
 */
type ValueCannotBeAddress = CompileErrorTemplate<3017, null>

/**
 * 值在比较运算或区间中不能写成模糊匹配项。[begin, end)应标记值。
 */
type ValueCannotBePatternInComparison = CompileErrorTemplate<3018, null>

/**
 * 类型转换错误：str无法转换为目标类型的值。[begin, end)应标记值。
 * info: value: 值的内容; type: 想要的转换目标类型
 */
type TypeCastError = CompileErrorTemplate<3019, {value: string, type: "NUMBER" | "SIZE" | "DATE"}>

/**
 * 类型转换错误：str无法转换为目标枚举类型的值。[begin, end)应标记值。
 * info: value: 值的内容; type: 枚举类型名称; expected: 给出可用的枚举值列表
 */
type EnumTypeCastError = CompileErrorTemplate<3020, {value: string, type: string, expected: string[]}>

//==== 构造语义相关 ====

/**
 * 当前方言不支持这个种类的语义。[begin, end)标记整个element。
 * info: 语义类型名称
 */
type UnsupportedSemanticStructure = CompileErrorTemplate<3021, "ELEMENT" | "ELEMENT_WITH_SOURCE" | "BRACKET">

/**
 * 元素和关键字项不能在同一个合取项中混写。[begin, end)标记整个element。
 */
type IdentifiesAndElementsCannotBeMixed = CompileErrorTemplate<3022, null>

/**
 * 这一个关键字是不能带sourceFlag(^)的，它没有source对应的项。[begin, end)标记subject。
 * info: 关键字名称
 */
type ThisIdentifyCannotHaveSourceFlag = CompileErrorTemplate<3023, string>

/**
 * 这一个关键字是必须带sourceFlag(^)的，它没有非source对应的项。[begin, end)标记subject。
 * info: 关键字名称
 */
type ThisIdentifyMustHaveSourceFlag = CompileErrorTemplate<3024, string>

/**
 * bracket项目是不能标记为from source(^)的。[begin, end)标记整个body。
 */
type BracketCannotHaveSourceFlag = CompileErrorTemplate<3025, null>

//=== 执行计划翻译 ===

/**
 * (warning)元素类的meta tag的字面值给出了空串。
 */
type BlankElement = CompileErrorTemplate<4001, null>

/**
 * (warning)元素类的一个项匹配了数量为0的实现。和下一个的区别是，它在queryer的实现层调用，且它提示的是某个写出来的元素为空。而当一整个合取项的匹配都为空时，下面的警告也会一起抛出。
 * info: 这个项的内容
 */
type ElementMatchesNone = CompileErrorTemplate<4002, string>

/**
 * (warning)元素类的meta tag的一个合取项匹配了数量为0的实现。这将导致整个匹配表达式为false。
 * info: 所有项的内容列表
 */
type WholeElementMatchesNone = CompileErrorTemplate<4003, string[]>

/**
 * (warning)进行区间匹配的区间端点没有匹配到任何实现。这将导致区间选择器的范围发生不合期望的溢出。
 * info: 未匹配的端点内容
 */
type RangeElementNotFound = CompileErrorTemplate<4004, string>

/**
 * (warning)此项的目标是匹配一个组/序列化组/序列化组成员，但查询得到的结果标签却并不是期望中的类型。这样的话此项会被忽略。
 * info: item: 项内容; goal: 期望匹配到的类型
 */
type ElementMatchedButNotGroup = CompileErrorTemplate<4005, {item: string, goal: "GROUP" | "SEQUENCE_GROUP" | "SEQUENCE_GROUP_MEMBER"}>

/**
 * (warning)元素类的meta tag查询所对应的项的数量达到了警告阈值。这意味着一个连接查询中的or项目可能过多，拖慢查询速度。
 * info: items: 项内容列表; warningLimit: 限制数量
 */
type NumberOfUnionItemExceed = CompileErrorTemplate<4007, {items: string[], warningLimit: number}>

/**
 * (warning)元素类的meta tag查询的合取项的数量达到了警告阈值。这意味着连接查询的层数可能过多，严重拖慢查询速度。
 * info: 限制数量
 */
type NumberOfIntersectItemExceed = CompileErrorTemplate<4008, number>
