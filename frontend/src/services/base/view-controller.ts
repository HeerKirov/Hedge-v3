import { Ref, watch } from "vue"
import { IllustQueryType } from "@/functions/http-client/api/illust"
import { useLocalStorage, useTabStorage } from "@/functions/app"
import { toRef } from "@/utils/reactivity"

/**
 * illust使用的view controller。
 */
export interface IllustViewController {
    fitType: Ref<"cover" | "contain">
    columnNum: Ref<number>
    collectionMode: Ref<IllustQueryType | boolean>
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

export function useIllustViewController(queryFilterIllustType?: Ref<IllustQueryType>): IllustViewController {
    interface StorageType { fitType: "cover" | "contain", columnNum: number, collectionMode: IllustQueryType | boolean, viewMode: "row" | "grid", editableLockOn: boolean }

    //此处采用了两级存储。第一级的localStorage用于永久存储，而第二级的tabStorage用于在页面内实时同步所有更改。
    //两级存储既可以保证在页面内的变更会同步给其他route，又不会导致跨页面变更，因为只有tabStorage初始化的时候才会从localStorage读取数据。
    const localStorage = useLocalStorage<StorageType>("illust/list/view-controller", () => ({fitType: "cover", columnNum: 8, collectionMode: "COLLECTION", viewMode: "grid", editableLockOn: false}), true)
    const storage = useTabStorage<StorageType>("illust/list/view-controller", localStorage.value)

    if(queryFilterIllustType !== undefined) {
        //tips: 向前兼容之前的boolean类型
        watch(() => storage.value.collectionMode, collectionMode => queryFilterIllustType.value = typeof collectionMode === "boolean" ? (collectionMode ? "COLLECTION" : "IMAGE") : collectionMode, {immediate: true})
    }

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
