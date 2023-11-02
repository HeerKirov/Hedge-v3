import { Ref, watch } from "vue"
import { IllustType } from "@/functions/http-client/api/illust"
import { useLocalStorage } from "@/functions/app"
import { toRef } from "@/utils/reactivity"

/**
 * illust使用的view controller。
 */
export interface IllustViewController {
    fitType: Ref<"cover" | "contain">
    columnNum: Ref<number>
    collectionMode: Ref<boolean>
    viewMode: Ref<"row" | "grid">
    editableLockOn: Ref<boolean>
}

/**
 * import image使用的view controller。
 */
export interface ImportImageViewController {
    fitType: Ref<"cover" | "contain">
    columnNum: Ref<number>
    viewMode: Ref<"row" | "grid">
}

/**
 * trashed image使用的view controller。
 */
export interface TrashedImageViewController {
    fitType: Ref<"cover" | "contain">
    columnNum: Ref<number>
    viewMode: Ref<"row" | "grid">
}

/**
 * book使用的view controller。
 */
export interface BookViewController {
    columnNum: Ref<number>
}

export function useIllustViewController(queryFilterIllustType?: Ref<IllustType>): IllustViewController {
    const storage = useLocalStorage<{
        fitType: "cover" | "contain", columnNum: number, collectionMode: boolean, viewMode: "row" | "grid", editableLockOn: boolean
    }>("illust/list/view-controller", () => ({
        fitType: "cover", columnNum: 8, collectionMode: true, viewMode: "grid", editableLockOn: false
    }), true)

    if(queryFilterIllustType !== undefined) watch(() => storage.value.collectionMode, collectionMode => queryFilterIllustType.value = collectionMode ? "COLLECTION" : "IMAGE", {immediate: true})

    return {
        fitType: toRef(storage, "fitType"),
        columnNum: toRef(storage, "columnNum"),
        collectionMode: toRef(storage, "collectionMode"),
        viewMode: toRef(storage, "viewMode"),
        editableLockOn: toRef(storage, "editableLockOn")
    }
}

export function useImportImageViewController(): ImportImageViewController {
    const storage = useLocalStorage<{
        fitType: "cover" | "contain", columnNum: number, viewMode: "row" | "grid"
    }>("import-image/list/view-controller", () => ({
        fitType: "cover", columnNum: 8, viewMode: "row"
    }), true)

    return {
        fitType: toRef(storage, "fitType"),
        columnNum: toRef(storage, "columnNum"),
        viewMode: toRef(storage, "viewMode")
    }
}

export function useTrashedImageViewController(): TrashedImageViewController {
    const storage = useLocalStorage<{
        fitType: "cover" | "contain", columnNum: number, viewMode: "row" | "grid"
    }>("trashed-image/list/view-controller", () => ({
        fitType: "cover", columnNum: 8, viewMode: "grid"
    }), true)

    return {
        fitType: toRef(storage, "fitType"),
        columnNum: toRef(storage, "columnNum"),
        viewMode: toRef(storage, "viewMode")
    }
}

export function useBookViewController(): BookViewController {
    const storage = useLocalStorage<{
        columnNum: number
    }>("book/list/view-controller", () => ({
        columnNum: 5
    }), true)

    return {
        columnNum: toRef(storage, "columnNum")
    }
}
