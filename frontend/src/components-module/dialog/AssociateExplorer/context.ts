import { ref, Ref, watchEffect } from "vue"
import { useStackedView } from "@/components-module/stackedview"
import { useFetchEndpoint, useFetchHelper, usePostPathFetchHelper } from "@/functions/fetch"
import { Illust, SimpleIllust } from "@/functions/http-client/api/illust"
import { useDroppable } from "@/modules/drag"
import { computedAsync, toRef } from "@/utils/reactivity"
import { Push } from "../context"

export interface AssociateExplorer {
    /**
     * 打开编辑关联组的面板。
     * @param illustId
     * @param addIds 将这些项作为追加项，添加到当前项的关联组中。
     * @param mode 追加的模式，仅追加新项，或覆盖已有项。
     * @param onSucceed
     */
    editAssociate(illustId: number, addIds?: number[], mode?: "append" | "override", onSucceed?: () => void): void
    /**
     * 打开关联组详情查看面板。
     */
    openAssociateView(illustId: number): void
}

export type AssociateExplorerProps = {
    mode: "view"
    illustId: number
} | {
    mode: "edit"
    illustId: number
    addIds: number[]
    addMode: "append" | "override"
    onSucceed?(): void
}

export function useAssociateExplorer(push: Push): AssociateExplorer {
    return {
        editAssociate(illustId, addIds, addMode, onSucceed) {
            push({
                type: "associateExplorer",
                props: {mode: "edit", illustId, addIds: addIds ?? [], addMode: addMode ?? "append", onSucceed}
            })
        },
        openAssociateView(illustId) {
            push({
                type: "associateExplorer",
                props: {mode: "view", illustId}
            })
        },
    }
}

export function useAssociateViewData(path: Ref<number>, close: () => void) {
    const viewStack = useStackedView()
    
    const { data } = useFetchEndpoint({
        path,
        get: client => client.illust.associate.get,
        eventFilter: c => event => event.eventType === "entity/illust/related-items/updated" && event.illustId === c.path
    })

    const openAssociateInNewView = (index?: number) => {
        if(data.value?.length) {
            close()
            viewStack.openImageView({imageIds: data.value.map(i => i.id), focusIndex: index})
        }
    }
    
    return {data, openAssociateInNewView}
}

export function useAssociateEditorData(props: {id: number, addIds: number[], mode: "append" | "override" | "manualEdit"}, close: () => void) {
    const fetchIllustByIds = useFetchHelper(client => client.illust.findByIds)
    const fetchSetAssociate = usePostPathFetchHelper(client => client.illust.associate.set)

    const path = toRef(props, "id")

    const { dragover: _, ...dropEvents } = useDroppable("illusts", illusts => {
        const adds = illusts.filter(i => i.id !== props.id && !images.value.some(j => j.id === i.id)).map(i => ({id: i.id, filePath: i.filePath}))
        images.value.push(...adds)
    })

    const images = ref<SimpleIllust[]>([])

    if(props.mode === "append") {
        const { loading, data } = useFetchEndpoint({
            path,
            get: client => client.illust.associate.get
        })

        const addIllusts = computedAsync(null, async () => {
            if(!loading.value && data.value !== null) {
                const addIds = props.addIds.filter(id => id !== props.id && !data.value!.some(i => i.id === id))
                const res = await fetchIllustByIds(addIds)
                if(res !== undefined) {
                    return <Illust[]>res.filter(i => i !== null)
                }else{
                    return []
                }
            }else{
                return null
            }
        })

        watchEffect(() => {
            if(data.value !== null && addIllusts.value !== null) {
                images.value = [...data.value, ...addIllusts.value].map(i => ({id: i.id, filePath: i.filePath}))
            }
        })
    }else if(props.mode == "override") {
        watchEffect(async () => {
            const addIds = props.addIds.filter(id => id !== props.id)
            const res = await fetchIllustByIds(addIds)
            if(res !== undefined) {
                images.value = <SimpleIllust[]>res.filter(i => i !== null).map(i => ({id: i!.id, filePath: i!.filePath}))
            }
        })
    }else{
        const { data } = useFetchEndpoint({
            path,
            get: client => client.illust.associate.get
        })

        watchEffect(() => {
            if(data.value !== null) {
                images.value = data.value.map(i => ({id: i.id, filePath: i.filePath}))
            }
        })
    }

    const remove = (index: number) => {
        images.value.splice(index, 1)
    }

    const save = async () => {
        const ok = await fetchSetAssociate(props.id, images.value.map(i => i.id))
        if(ok) {
            close()
        }
    }

    return {images, dropEvents, remove, save}
}
