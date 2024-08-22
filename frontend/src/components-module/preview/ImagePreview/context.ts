import { Ref, ref, watch } from "vue"
import { QueryListview } from "@/functions/fetch"
import { NullableFilePath } from "@/functions/http-client/api/all"
import { ServiceBaseType } from "../context"
import { useInterceptedKey } from "@/modules/keyboard"

export type ImageProps = ServiceBaseType<"image"> & (ListviewModeProps | ArrayModeProps)

interface ListviewModeProps {
    type: "listview"
    listview: QueryListview<{id: number, filePath: NullableFilePath | null}, number>
    columnNum?: Readonly<Ref<number>>
    viewMode?: Readonly<Ref<"grid" | "row">>
    selected: Readonly<Ref<number[]>>
    selectedIndex: Readonly<Ref<(number | undefined)[]>>
    lastSelected: Readonly<Ref<number | null>>
    updateSelect(selected: number[], lastSelected: number | null): void
}

interface ArrayModeProps {
    type: "array"
    files: string[]
    initIndex?: number
}

export function useImagePreviewContext(ctx: ImageProps, close: () => void) {
    if(ctx.type === "listview") {
        if(ctx.selected.value.length > 1) {
            return useArrayMode(getMultipleCtx(ctx), close)
        }else{
            return useListviewMode(ctx, close)
        }
    }else{
        return useArrayMode(ctx, close)
    }
}

function useListviewMode(ctx: ListviewModeProps, close: () => void) {
    let idx: number | undefined = undefined
    const targetFile = ref<string | null>(null)

    const gotoIndex = (newIdx: number) => {
        const ret = ctx.listview.proxy.sync.retrieve(newIdx)
        if(ret !== undefined) {
            ctx.updateSelect([ret.id], ret.id)
        }
    }

    const watchRefresh = async (selectedId: number | null) => {
        if(selectedId !== null) {
            idx = await ctx.listview.proxy.findByKey(selectedId)
            if(idx !== undefined) {
                const item = ctx.listview.proxy.sync.retrieve(idx)!
                targetFile.value = item.filePath?.original ?? null
            }else{
                targetFile.value = null
            }
        }else{
            idx = undefined
            targetFile.value = null
        }
    }

    const arrow = (direction: "left" | "right") => {
        if(idx !== undefined) {
            if(direction === "left" && idx > 0) {
                gotoIndex(idx - 1)
            }else if(direction === "right" && ctx.listview.proxy.sync.count() && idx < ctx.listview.proxy.sync.count()! - 1) {
                gotoIndex(idx + 1)
            }
        }
    }

    watch(ctx.lastSelected, watchRefresh, {immediate: true})

    useInterceptedKey(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"], e => {
        if(idx !== undefined) {
            if(e.key === "ArrowUp" && idx > 0) {
                if(ctx.viewMode?.value === "grid" && ctx.columnNum?.value) {
                    if(idx - ctx.columnNum.value >= 0) gotoIndex(idx - ctx.columnNum.value)
                }else{
                    gotoIndex(idx - 1)
                }
            }else if(e.key === "ArrowLeft" && idx > 0) {
                gotoIndex(idx - 1)
            }else if(e.key === "ArrowDown" && ctx.listview.proxy.sync.count() && idx < ctx.listview.proxy.sync.count()! - 1) {
                if(ctx.viewMode?.value === "grid" && ctx.columnNum?.value) {
                    if(idx + ctx.columnNum.value <= ctx.listview.proxy.sync.count()! - 1) gotoIndex(idx + ctx.columnNum.value)
                }else{
                    gotoIndex(idx + 1)
                }
            }else if(e.key === "ArrowRight" && ctx.listview.proxy.sync.count() && idx < ctx.listview.proxy.sync.count()! - 1) {
                gotoIndex(idx + 1)
            }else if(e.key === "Space") {
                close()
            }
        }
    })

    return {targetFile, arrow}
}

function useArrayMode(ctx: ArrayModeProps, close: () => void) {
    let idx: number = ctx.initIndex ?? 0
    const targetFile = ref<string | null>(ctx.files[idx])

    const arrow = (direction: "left" | "right") => {
        if(direction === "left" && idx > 0) {
            targetFile.value = ctx.files[--idx]
        }else if(direction === "right" && idx < ctx.files.length - 1) {
            targetFile.value = ctx.files[++idx]
        }
    }

    useInterceptedKey(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"], e => {
        if((e.key === "ArrowUp" || e.key === "ArrowLeft") && idx > 0) {
            targetFile.value = ctx.files[--idx]
        }else if((e.key === "ArrowDown" || e.key === "ArrowRight") && idx < ctx.files.length - 1) {
            targetFile.value = ctx.files[++idx]
        }else if(e.key === "Space") {
            close()
        }
    })

    return {targetFile, arrow}
}

function getMultipleCtx(ctx: ListviewModeProps): ArrayModeProps {
    let initIndex: number | undefined
    if(ctx.lastSelected.value !== null) {
        const idx = ctx.selected.value.indexOf(ctx.lastSelected.value)
        initIndex = idx >= 0 ? idx : undefined
    }else{
        initIndex = undefined
    }
    const files = ctx.selectedIndex.value.map(idx => {
        if(idx !== undefined) {
            const item = ctx.listview.proxy.sync.retrieve(idx)!
            return item.filePath?.original ?? null
        }else{
            return null
        }
    }).filter(i => i !== null) as string[]
    return {type: "array", files, initIndex}
}