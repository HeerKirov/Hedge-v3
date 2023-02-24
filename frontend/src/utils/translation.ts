import { MappingSourceTag, MappingSourceTagForm } from "@/functions/http-client/api/source-tag-mapping"
import { SourceBook, SourceBookForm, SourceTag, SourceTagForm } from "@/functions/http-client/api/source-data"

/**
 * 结合旧的和新的mapping source tag，patch出需要提交到server的表单内容。
 */
export function patchMappingSourceTagForm(items: MappingSourceTag[], oldItems: MappingSourceTag[]): MappingSourceTagForm[] {
    return items.map(item => {
        const oldItem = oldItems.find(i => i.site === item.site && i.code === item.code)
        if(oldItem === undefined) {
            //这是一个新项
            return {site: item.site, code: item.code, name: item.name, otherName: item.otherName || undefined, type: item.type || undefined}
        }else{
            //这是一个修改项
            return {
                site: item.site,
                code: item.code,
                name: item.name,
                otherName: (item.otherName || null) !== (oldItem.otherName || null) ? (item.otherName || "") : undefined,
                type: (item.type || null) !== (oldItem.type || null) ? (item.type || "") : undefined
            }
        }
    })
}

/**
 * 结合旧的和新的source tag，patch出需要提交到server的表单内容。
 */
export function patchSourceTagForm(items: SourceTag[], oldItems: SourceTag[]): SourceTagForm[] {
    return items.map(item => {
        const oldItem = oldItems.find(i => i.code === item.code)
        if(oldItem === undefined) {
            //这是一个新项
            return {code: item.code, name: item.name, otherName: item.otherName || undefined, type: item.type || undefined}
        }else{
            //这是一个修改项
            return {
                code: item.code,
                name: item.name,
                otherName: (item.otherName || null) !== (oldItem.otherName || null) ? (item.otherName || "") : undefined,
                type: (item.type || null) !== (oldItem.type || null) ? (item.type || "") : undefined
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
            return {code: item.code, title: item.title}
        }else{
            //这是一个修改项
            return {
                code: item.code,
                title: (item.title || null) !== (oldItem.title || null) ? (item.title || "") : undefined
            }
        }
    })
}
