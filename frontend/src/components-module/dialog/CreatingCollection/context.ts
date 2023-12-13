import { Ref, computed, ref } from "vue"
import { CollectionSituation } from "@/functions/http-client/api/util-illust"
import { useToast } from "@/modules/toast"
import { useFetchHelper, usePostPathFetchHelper } from "@/functions/fetch"
import { Push } from "../context"
import { arrays } from "@/utils/primitives"

export interface CreatingCollection {
    /**
     * 传入一组images，创建一个集合。一般用于contextmenu。
     * 会列出当前images已属于的集合，选择是否要加入某个集合；或建一个新的，把所有images(以及collection的children)都塞进去。
     * 如果开启了相关选项，还会分析当前images的时间分区归属。
     * @param images 要用作创建集合的image id列表。
     * @param onCreated 如果成功创建集合，则执行回调。
     * @param skipDialogIfAllow 条件允许时跳过对话框环节：如果images都是真正的image，且都不属于任何集合，那么会干脆利落地直接创建，不打开对话框。(此条件默认开启)
     */
    createCollection(images: number[], onCreated?: (collectionId: number, newCollection: boolean) => void, skipDialogIfAllow?: boolean): void
}

export interface CreatingCollectionProps {
    situations: CollectionSituation[]
    images: number[]
    onCreated?(collectionId: number, newCollection: boolean): void
}

export function useCreatingCollection(push: Push): CreatingCollection {
    const fetchSituation = useFetchHelper(client => client.illustUtil.getCollectionSituation)
    const fetchCreate = useFetchHelper(client => client.illust.collection.create)

    return {
        async createCollection(images, onCreated, skipDialogIfAllow) {
            const res = await fetchSituation(images)
            if(res !== undefined) {
                if(res.length > 1 || res.some(s => s.collections.length > 0) || skipDialogIfAllow === false) {
                    //若存在至少1个collection，或时间分区数量多于1，则需要对集合做决断，打开dialog
                    push({
                        type: "creatingCollection",
                        props: {situations: res, images, onCreated}
                    })
                }else{
                    //不需要决断，则直接创建新集合
                    const res = await fetchCreate({images})
                    if(res !== undefined) {
                        onCreated?.(res.id, true)
                    }
                }
            }
        }
    }
}

export function useCreatingCollectionContext(images: Ref<number[]>, preSituations: Ref<CollectionSituation[]>, onCreated: (collectionId: number, newCollection: boolean) => void) {
    const toast = useToast()
    const fetchCreate = useFetchHelper({request: client => client.illust.collection.create, handleErrorInRequest: toast.handleException})
    const fetchUpdate = usePostPathFetchHelper({request: client => client.illust.collection.images.update, handleErrorInRequest: toast.handleException})

    const situations = computed(() => preSituations.value.map(s => ({...s, totalImageCount: s.images.length + s.collections.map(c => c.belongs.length).reduce((a, b) => a + b, 0)})))

    const selected = ref<{type: "new"} | {type: "collection", id: number} | {type: "partition", ts: number}>(situations.value.length > 1 ? ({type: "partition", ts: arrays.maxBy(situations.value, s => s.totalImageCount)!.partitionTime!.timestamp}) : ({type: "new"}))

    const submit = async () => {
        if(selected.value.type === "partition") {
            const ts = selected.value.ts
            const situation = situations.value.find(s => s.partitionTime!.timestamp === ts)!
            if(situation.collections.length > 0) {
                const collectionId = arrays.maxBy(situation.collections, c => c.belongs.length)!.collectionId
                const res = await fetchUpdate(collectionId, {illustIds: images.value, specifyPartitionTime: situation.partitionTime!})
                if(res) onCreated(collectionId, false)
            }else{
                const res = await fetchCreate({images: images.value, specifyPartitionTime: situation.partitionTime!})
                if(res !== undefined) onCreated(res.id, true)
            }
        }else if(selected.value.type === "collection") {
            const collectionId = selected.value.id
            const specifyPartitionTime = situations.value.length > 1 ? situations.value.find(s => s.collections.findIndex(c => c.collectionId === collectionId) >= 0)!.partitionTime! : undefined
            const res = await fetchUpdate(selected.value.id, {illustIds: images.value, specifyPartitionTime})
            if(res) onCreated(selected.value.id, false)
        }else{
            const res = await fetchCreate({images: images.value})
            if(res !== undefined) onCreated(res.id, true)
        }
    }

    return {selected, situations, submit}
}
