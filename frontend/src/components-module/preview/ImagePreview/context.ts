import { Ref, ref, watch } from "vue"
import { PaginationData, QueryListview } from "@/functions/fetch"
import { ServiceBaseType } from "../context"
import { useInterceptedKey } from "@/modules/keyboard"

export type ImageProps = ServiceBaseType<"image"> & (ListviewModeProps | ArrayModeProps)

interface ListviewModeProps {
    type: "listview"
    listview: QueryListview<{id: number, file: string}>
    paginationData: PaginationData<unknown>
    columnNum?: Readonly<Ref<number>>
    viewMode?: Readonly<Ref<"grid" | "row">>
    selected: Readonly<Ref<number[]>>
    lastSelected: Readonly<Ref<number | null>>
    updateSelect(selected: number[], lastSelected: number | null): void
}

interface ArrayModeProps {
    type: "array"
    files: string[]
    initIndex?: number
}

export function useImagePreviewContext(ctx: ImageProps) {
    if(ctx.type === "listview") {
        if(ctx.selected.value.length > 1) {
            return useArrayMode(getMultipleCtx(ctx))
        }else{
            return useListviewMode(ctx)
        }
    }else{
        return useArrayMode(ctx)
    }
}

function useListviewMode(ctx: ListviewModeProps) {
    let idx: number | undefined = undefined
    const targetFile = ref<string | null>(null)

    const gotoIndex = (newIdx: number) => {
        const ret = ctx.listview.proxy.syncOperations.retrieve(newIdx)
        if(ret !== undefined) {
            ctx.updateSelect([ret.id], ret.id)
        }
    }

    const watchRefresh = (selectedId: number | null) => {
        if(ctx.lastSelected.value !== null) {
            idx = ctx.listview.proxy.syncOperations.find(i => i.id === selectedId, [ctx.paginationData.metrics.offset, ctx.paginationData.metrics.offset + ctx.paginationData.metrics.limit])
            if(idx !== undefined) {
                const item = ctx.listview.proxy.syncOperations.retrieve(idx)!
                targetFile.value = item.file
            }else{
                targetFile.value = null
            }
        }else{
            idx = undefined
            targetFile.value = null
        }
    }

    watch(ctx.lastSelected, watchRefresh, {immediate: true})

    useInterceptedKey(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"], e => {
        if(idx !== undefined) {
            if(e.key === "ArrowUp" && idx > 0) {
                if(ctx.viewMode?.value === "grid" && ctx.columnNum?.value) {
                    if(idx - ctx.columnNum.value >= 0) gotoIndex(idx - ctx.columnNum.value)
                }else{
                    gotoIndex(idx - 1)
                }
            }else if(e.key === "ArrowLeft" && idx > 0) {
                gotoIndex(idx - 1)
            }else if(e.key === "ArrowDown" && ctx.listview.proxy.syncOperations.count() && idx < ctx.listview.proxy.syncOperations.count()! - 1) {
                if(ctx.viewMode?.value === "grid" && ctx.columnNum?.value) {
                    if(idx + ctx.columnNum.value <= ctx.listview.proxy.syncOperations.count()! - 1) gotoIndex(idx + ctx.columnNum.value)
                }else{
                    gotoIndex(idx + 1)
                }
            }else if(e.key === "ArrowRight" && ctx.listview.proxy.syncOperations.count() && idx < ctx.listview.proxy.syncOperations.count()! - 1) {
                gotoIndex(idx + 1)
            }
        }
    })

    return {targetFile}
}

function useArrayMode(ctx: ArrayModeProps) {
    let idx: number = ctx.initIndex ?? 0
    const targetFile = ref<string | null>(ctx.files[idx])

    useInterceptedKey(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"], e => {
        if((e.key === "ArrowUp" || e.key === "ArrowLeft") && idx > 0) {
            targetFile.value = ctx.files[--idx]
        }else if((e.key === "ArrowDown" || e.key === "ArrowRight") && idx < ctx.files.length - 1) {
            targetFile.value = ctx.files[++idx]
        }
    })

    return {targetFile}
}

function getMultipleCtx(ctx: ListviewModeProps): ArrayModeProps {
    let initIndex: number | undefined
    if(ctx.lastSelected.value !== null) {
        const idx = ctx.selected.value.indexOf(ctx.lastSelected.value)
        initIndex = idx >= 0 ? idx : undefined
    }else{
        initIndex = undefined
    }
    const files = ctx.selected.value.map(id => {
        const idx = ctx.listview.proxy.syncOperations.find(i => i.id === id, [ctx.paginationData.metrics.offset, ctx.paginationData.metrics.offset + ctx.paginationData.metrics.limit])
        if(idx !== undefined) {
            const item = ctx.listview.proxy.syncOperations.retrieve(idx)!
            return item.file
        }else{
            return null
        }
    }).filter(i => i !== null) as string[]
    return {type: "array", files, initIndex}
}