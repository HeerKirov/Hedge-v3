import { MappingSourceTag, MappingSourceTagForm } from "@/functions/http-client/api/source-tag-mapping"
import { SourceTag, SourceTagForm } from "@/functions/http-client/api/source-data"

/**
 * 结合旧的和新的mapping source tag，patch出需要提交到server的表单内容。
 */
export function patchMappingSourceTagForm(items: MappingSourceTag[], oldItems: MappingSourceTag[]): MappingSourceTagForm[] {
    return items.map(item => {
        const oldItem = oldItems.find(i => i.site === item.site && i.code === item.code)
        if(oldItem === undefined) {
            //这是一个新项
            return {site: item.site, code: item.code, name: item.name, displayName: item.displayName || undefined, type: item.type || undefined}
        }else{
            //这是一个修改项
            return {
                site: item.site,
                code: item.code,
                name: item.name,
                displayName: (item.displayName || null) !== (oldItem.displayName || null) ? (item.displayName || "") : undefined,
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
            return {code: item.code, name: item.name, displayName: item.displayName || undefined, type: item.type || undefined}
        }else{
            //这是一个修改项
            return {
                code: item.code,
                name: item.name,
                displayName: (item.displayName || null) !== (oldItem.displayName || null) ? (item.displayName || "") : undefined,
                type: (item.type || null) !== (oldItem.type || null) ? (item.type || "") : undefined
            }
        }
    })
}
