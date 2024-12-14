import { CompileError, ElementGroup } from "@/functions/http-client/api/util-query"

export const QUERY_ELEMENT_TYPES: {[key in ElementGroup["type"]]: string} = {
    "name": "名称",
    "meta-tag": "标签",
    "source-tag": "来源标签"
}

export const QUERY_FIELD_NAMES: {[key: string]: string} = {
    "ID": "ID",
    "FAVORITE": "收藏",
    "BOOK_MEMBER": "画集成员",
    "SCORE": "评分",
    "IMAGE_COUNT": "项目数量",
    "CREATE_TIME": "创建时间",
    "UPDATE_TIME": "上次修改",
    "ORDER_TIME": "排序时间",
    "PUBLISH_TIME": "发布时间",
    "PARTITION": "时间分区",
    "TITLE": "标题",
    "DESCRIPTION": "描述",
    "FILETYPE": "文件类型",
    "FILESIZE": "文件大小",
    "RESOLUTION_WIDTH": "分辨率宽度",
    "RESOLUTION_HEIGHT": "分辨率高度",
    "RESOLUTION_AREA": "分辨率面积",
    "RESOLUTION_RATIO": "分辨率宽高比",
    "VIDEO_DURATION": "视频时长",
    "SOURCE_SITE": "来源",
    "SOURCE_ID": "来源ID",
    "SOURCE_PAGE": "来源分页",
    "SOURCE_PAGE_NAME": "来源分页页名",
    "SOURCE_FROM": "来源站点",
    "SOURCE_TITLE": "来源标题",
    "SOURCE_DESCRIPTION": "来源描述",
    "SOURCE_PUBLISH_TIME": "来源发布时间",
    "TAGME": "TAGME",
    "STATUS": "状态"
}

export function queryCompileErrorTranslate(e: CompileError): string {
    switch(e.code) {
        case 1001: return `转义了一个普通字符${e.info}，它并不是可被转义的符号。`
        case 1002: return `希望遇到字符串终结符${e.info}，但却遇到了语句末尾。终结符丢失。`
        case 1003: return `希望在转义字符后遇到一个可转义符号，但却遇到了语句末尾。转义符号丢失。`
        case 1004: return `无任何用处的符号${e.info}。`
        case 2001: return `预料之外的文法符号'${e.info.actual}'。期望遇到(${e.info.expected.join(", ")})。`
        case 2002: return `预料之外的语句末尾。期望遇到(${e.info.expected.join(", ")})。`
        case 3001: return `字段"${QUERY_FIELD_NAMES[e.info.key]}": 关系符号和值缺失。`
        case 3002: return `字段"${QUERY_FIELD_NAMES[e.info.key]}": 不应该有关系符号和值。`
        case 3003: return `字段"${QUERY_FIELD_NAMES[e.info.key]}": 不支持${e.info.valueType}类型的值。`
        case 3004: return `字段"${QUERY_FIELD_NAMES[e.info.key]}": 当前关系符号${e.info.symbol}不支持${e.info.valueType}类型的值。`
        case 3005: return `字段"${QUERY_FIELD_NAMES[e.info.key]}": 不支持关系符号${e.info.symbol}。`
        case 3006: return `此元素的结构不满足显式指定的类型限制。${e.info === "#" ? "主题(#)要求结构不能有关系符号和值。" : e.info === "@" ? "作者(@)要求结构必须是单节地址。" : ""}`
        case 3007: return `元素类型${e.info.key}: 不应该有显式指定类型的前缀。`
        case 3008: return `元素类型${e.info.key}: 不应该有关系符号和值。`
        case 3009: return `元素类型${e.info.key}: 不支持${e.info.valueType}类型的值。`
        case 3010: return `元素类型${e.info.key}: 当前关系符号${e.info.symbol}不支持${e.info.valueType}类型的值。`
        case 3011: return `元素类型${e.info.key}: 不支持关系符号${e.info.symbol}。`
        case 3012: return `排序: 关系符号和值缺失。`
        case 3013: return `排序: 关系符号和值必须是排序列表。`
        case 3014: return `排序: '${e.info.value}'不是正确的排序列表项。可用项(${e.info.expected.join(", ")})。`
        case 3015: return `排序: 不能被排除(-)、标记为来源(^)、或连接(|)。`
        case 3016: return `排序: 排序项'${QUERY_FIELD_NAMES[e.info]}'重复了。后一次出现的项会被忽略。`
        case 3017: return `值不能是地址段形式(a.b.c)，只能是一项字符串。`
        case 3018: return `值在比较运算或区间中不能写成模糊匹配项。`
        case 3019: return `类型转换错误: '${e.info.value}'不能被转换为类型${e.info.type}。`
        case 3020: return `类型转换错误: '${e.info.value}'无法转换为枚举类型${e.info.type}的值。可用值为(${e.info.expected.join(", ")})。`
        case 3021: return `当前方言不支持${e.info}这个种类的语义。`
        case 3022: return `元素和字段不能在同一个合取项中混写。`
        case 3023: return `关键字"${e.info}"不能添加来源标记(^)，没有这个对应的来源字段。`
        case 3024: return `关键字"${e.info}"必须添加来源标记(^)，没有这个对应的字段。`
        case 3025: return `注解不能添加来源标记(^)。`
        case 4001: return `元素项的字面值给出了空串。`
        case 4002: return `元素项'${e.info}'没有匹配到任何实现。`
        case 4003: return `整个元素项'${e.info.join("|")}'都没有匹配到任何实现，这将导致查询不到任何结果。`
        case 4004: return `区间元素'${e.info}'没有匹配到任何实现，这将导致区间选择器的范围发生不合期望的溢出。`
        case 4005: return `元素'${e.info.item}'已匹配，但匹配结果并不是期望中的组类型，因此此项会被忽略。`
        case 4006: return `注解'${e.info}'已标记为"不能导出"，因此在查询中无法引用此注解，此项会被忽略。`
        case 4007: return `查询中的或连接(|)数量已达到警告值${e.info.warningLimit}。过多的查询项目可能拖慢查询速度。`
        case 4008: return `查询中的与连接(&)数量已达到警告值${e.info}。过多的连接查询层数可能严重拖慢查询速度。`
    }
}