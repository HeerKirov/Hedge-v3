import { parseOrder } from "@/components-business/top-bar/AttachFilter/utils"
import { MappingSourceTag, MappingSourceTagForm } from "@/functions/http-client/api/source-tag-mapping"
import { SourceBook, SourceBookForm, SourceTag, SourceTagForm } from "@/functions/http-client/api/source-data"
import { AuthorQueryFilter } from "@/functions/http-client/api/author"
import { TopicQueryFilter } from "@/functions/http-client/api/topic"
import { QueryRes } from "@/functions/http-client/api/util-query"
import { QUERY_FIELD_NAMES, QUERY_FILTER_ORDER_NAMES } from "@/constants/translate"
import { AUTHOR_TYPE_NAMES, TOPIC_TYPE_NAMES } from "@/constants/entity"

/**
 * 结合旧的和新的mapping source tag，patch出需要提交到server的表单内容。
 */
export function patchMappingSourceTagForm(items: MappingSourceTag[], oldItems: MappingSourceTag[]): MappingSourceTagForm[] {
    return items.map(item => {
        const oldItem = oldItems.find(i => i.site === item.site && i.type === item.type && i.code === item.code)
        if(oldItem === undefined) {
            //这是一个新项
            return {site: item.site, code: item.code, name: item.name || undefined, otherName: item.otherName || undefined, type: item.type}
        }else{
            //这是一个修改项
            return {
                site: item.site,
                type: item.type,
                code: item.code,
                name: (item.name || null) !== (oldItem.name || null) ? (item.name || null) : undefined,
                otherName: (item.otherName || null) !== (oldItem.otherName || null) ? (item.otherName || null) : undefined,
            }
        }
    })
}

/**
 * 结合旧的和新的source tag，patch出需要提交到server的表单内容。
 */
export function patchSourceTagForm(items: SourceTag[], oldItems: SourceTag[]): SourceTagForm[] {
    return items.map(item => {
        const oldItem = oldItems.find(i => i.type === item.type && i.code === item.code)
        if(oldItem === undefined) {
            //这是一个新项
            return {code: item.code, name: item.name || undefined, otherName: item.otherName || undefined, type: item.type}
        }else{
            //这是一个修改项
            return {
                type: item.type,
                code: item.code,
                name: (item.name || null) !== (oldItem.name || null) ? (item.name || null) : undefined,
                otherName: (item.otherName || null) !== (oldItem.otherName || null) ? (item.otherName || null) : undefined,
            }
        }
    })
}

/**
 * 结合旧的和新的source book，patch出需要提交到server的表单内容。
 */
export function patchSourceBookForm(items: SourceBook[], oldItems: SourceBook[]): SourceBookForm[] {
    return items.map(item => {
        const oldItem = oldItems.find(i => i.code === item.code)
        if(oldItem === undefined) {
            //这是一个新项
            return {code: item.code, title: item.title || undefined}
        }else{
            //这是一个修改项
            return {
                code: item.code,
                title: (item.title || null) !== (oldItem.title || null) ? (item.title || "") : undefined,
                otherTitle: (item.otherTitle || null) !== (oldItem.otherTitle || null) ? (item.otherTitle || null) : undefined
            }
        }
    })
}

/**
 * 将authorQueryFilter转换为文本描述，适用于标题。
 */
export function translateAuthorQueryFilterToString(filter: AuthorQueryFilter, defaultFilter?: AuthorQueryFilter): string | null {
    const returns = []
    if(filter.query && filter.query !== defaultFilter?.query) returns.push(filter.query)
    if(filter.favorite && filter.favorite !== defaultFilter?.favorite) returns.push("✓收藏")
    if(filter.type && filter.type !== defaultFilter?.type) returns.push(AUTHOR_TYPE_NAMES[filter.type])
    if(filter.order) {
        const defaultOrders = defaultFilter?.order ? (typeof defaultFilter.order === "string" ? [defaultFilter.order] : defaultFilter.order).map(item => parseOrder(item)) : []
        const orders = (typeof filter.order === "string" ? [filter.order] : filter.order).map(item => parseOrder(item)).filter(([n, d]) => !defaultOrders.find(([n0, d0]) => n === n0 && d === d0))
        if(orders.length > 0) {
            const result = orders.map(([n, d]) => (d === "descending" ? "↓" : "↑") + QUERY_FILTER_ORDER_NAMES[n]).join(",")
            returns.push(`排序:${result}`)
        }
    }

    return returns.length > 0 ? returns.join(" ") : null
}

/**
 * 将topicQueryFilter转换为文本描述，适用于标题。
 */
export function translateTopicQueryFilterToString(filter: TopicQueryFilter, defaultFilter?: TopicQueryFilter): string | null {
    const returns = []
    if(filter.query && filter.query !== defaultFilter?.query) returns.push(filter.query)
    if(filter.favorite && filter.favorite !== defaultFilter?.favorite) returns.push("✓收藏")
    if(filter.type && filter.type !== defaultFilter?.type) returns.push(TOPIC_TYPE_NAMES[filter.type])
    if(filter.parentId !== undefined && filter.parentId !== defaultFilter?.parentId) returns.push(`父主题:${filter.parentId}`)
    if(filter.order) {
        const defaultOrders = defaultFilter?.order ? (typeof defaultFilter.order === "string" ? [defaultFilter.order] : defaultFilter.order).map(item => parseOrder(item)) : []
        const orders = (typeof filter.order === "string" ? [filter.order] : filter.order).map(item => parseOrder(item)).filter(([n, d]) => !defaultOrders.find(([n0, d0]) => n === n0 && d === d0))
        if(orders.length > 0) {
            const result = orders.map(([n, d]) => (d === "descending" ? "↓" : "↑") + QUERY_FILTER_ORDER_NAMES[n]).join(",")
            returns.push(`排序:${result}`)
        }
    }

    return returns.length > 0 ? returns.join(" ") : null
}

/**
 * 将QuerySchema转换为文本描述，适用于标题。
 */
export function translateQuerySchemaToString(schema: QueryRes | null): string | null {
    if(schema?.queryPlan) {
        const returns = []
        for(const element of schema.queryPlan.elements) {
            if(element.type === "name" || element.type === "description") {
                for(const intersectItem of element.intersectItems) {
                    returns.push((intersectItem.exclude ? "-" : "") + intersectItem.unionItems.map(item => `[${item.value}]`).join("|"))
                }
            }else if(element.type === "source-tag") {
                for(const intersectItem of element.intersectItems) {
                    returns.push((intersectItem.exclude ? "-" : "") + intersectItem.unionItems.map(item => `^${item.name}`).join("|"))
                }
            }else{
                for(const intersectItem of element.intersectItems) {
                    returns.push((intersectItem.exclude ? "-" : "") + intersectItem.unionItems.map(item => (item.type === "topic" ? "#" : item.type === "author" ? "@" : "$") + item.name).join("|"))
                }
            }
        }
        for(const filterGroup of schema.queryPlan.filters) {
            const field = filterGroup.fields.map(oneField => {
                const name = QUERY_FIELD_NAMES[oneField.name] ?? oneField.name
                const values = oneField.values.map(value => {
                    if(value.type === "equal") {
                        return ":" + value.value
                    }else if(value.type === "match") {
                        return "≈" + value.value
                    }else if(value.begin !== null && value.end !== null) {
                        return value.begin + "~" + value.end
                    }else if(value.end === null) {
                        return (value.includeBegin ? "≥" : ">") + value.begin
                    }else{
                        return (value.includeEnd ? "≤" : "<") + value.end
                    }
                }).join(",")
                return name + values
            })
            returns.push((filterGroup.exclude ? "-" : "") + field)
        }
        if(schema.queryPlan.sorts.length > 0) {
            const field = schema.queryPlan.sorts.map(o => (o.charAt(0) === '-' ? '-' : '+') + (QUERY_FIELD_NAMES[o.substring(1)] ?? o.substring(1))).join(",")
            returns.push("排序:" + field)
        }
        return returns.length > 0 ? returns.join(" ") : null
    }
    return null
}