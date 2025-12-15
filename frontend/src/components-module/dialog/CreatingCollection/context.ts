import { Ref, computed, ref } from "vue"
import { CollectionSituation } from "@/functions/http-client/api/util-illust"
import { useToast } from "@/modules/toast"
import { useFetchHelper, usePostPathFetchHelper } from "@/functions/fetch"
import { arrays } from "@/utils/primitives"
import { LocalDate } from "@/utils/datetime"
import { Push } from "../context"

export interface CreatingCollection {
    /**
     * 传入一组images，创建一个集合。一般用于contextmenu。
     * 会列出当前images已属于的集合，选择是否要加入某个集合；或建一个新的，把所有images(以及collection的children)都塞进去。
     * 如果开启了相关选项，还会分析当前images的时间分区归属。
     * @param images 要用作创建集合的image id列表。
     * @param onCreated 如果成功创建集合，则执行回调。
     * @param skipDialog ALLOW(默认): 条件允许时跳过对话框环节：如果images都是真正的image，且都不属于任何集合，那么会干脆利落地直接创建，不打开对话框。NO: 不允许跳过。ALWAYS: 总是跳过。
     */
    createCollection(images: number[], onCreated?: (collectionId: number, newCollection: boolean) => void, skipDialog?: "ALLOW" | "NO" | "ALWAYS"): void
    /**
     * 同样的创建集合对话框，但是不执行实际内容，而是仅返回表单参数。后续应当手动调用创建集合API。
     */
    getCreateCollectionReturns(images: number[], skipDialog?: "ALLOW" | "NO" | "ALWAYS"): Promise<CreateCollectionReturns | undefined>
}

export interface CreateCollectionReturns {
    collectionId: number | "new"
    imageIds: number[]
    specifyPartitionTime?: LocalDate
}

export interface CreatingCollectionProps {
    situations: CollectionSituation[]
    images: number[]
    onCreated?(collectionId: number, newCollection: boolean): void
    onlyGetReturns?(returns: CreateCollectionReturns | undefined): void
    cancel(): void
}

export function useCreatingCollection(push: Push): CreatingCollection {
    const fetchSituation = useFetchHelper(client => client.illustUtil.getCollectionSituation)
    const { situate, executeSituate, getRecommendedSituation } = useSituate()

    return {
        async createCollection(images, onCreated, skipDialog) {
            const res = await fetchSituation(images)
            if(res !== undefined) {
                //若存在至少1个collection，或时间分区数量多于1，则需要对集合做决断
                const requireSituate = res.length > 1 || res.some(s => s.collections.length > 0)
                if(requireSituate && skipDialog === "ALWAYS") {
                    //需要决断，且参数要求必须跳过对话框时，自动执行决断
                    const recommended = getRecommendedSituation(res)
                    await executeSituate(situate(images, res, recommended))
                }else if(requireSituate || skipDialog === "NO") {
                    //需要决断或参数要求永不跳过对话框时，打开dialog
                    push({
                        type: "creatingCollection",
                        props: {situations: res, images, onCreated, cancel: () => {}}
                    })
                }else{
                    //不需要决断，则直接创建新集合
                    const r = await executeSituate(situate(images, res, {type: "new"}))
                    if(r !== undefined) onCreated?.(r.collectionId, r.created)
                }
            }
        },
        async getCreateCollectionReturns(images, skipDialog) {
            const res = await fetchSituation(images)
            if(res !== undefined) {
                //若存在至少1个collection，或时间分区数量多于1，则需要对集合做决断
                const requireSituate = res.length > 1 || res.some(s => s.collections.length > 0)
                if(requireSituate && skipDialog === "ALWAYS") {
                    //需要决断，且参数要求必须跳过对话框时，自动执行决断
                    const recommended = getRecommendedSituation(res)
                    return situate(images, res, recommended)
                }else if(requireSituate || skipDialog === "NO") {
                    //需要决断或参数要求永不跳过对话框时，打开dialog
                    return new Promise(resolve => {
                        push({
                            type: "creatingCollection",
                            props: {situations: res, images, onlyGetReturns: resolve, cancel: () => resolve(undefined)}
                        })
                    })
                }else{
                    //不需要决断，则直接创建新集合
                    return situate(images, res, {type: "new"})
                }
            }
            return undefined
        }
    }
}

export function useCreatingCollectionContext(images: Ref<number[]>, preSituations: Ref<CollectionSituation[]>, onCreated: (collectionId: number, newCollection: boolean) => void, onlyGetReturns?: (returns: CreateCollectionReturns | undefined) => void) {
    const { situate, executeSituate, getRecommendedSituation } = useSituate()

    const situations = computed(() => preSituations.value.map(s => ({...s, totalImageCount: s.images.length + s.collections.map(c => c.belongs.includes(c.collectionId) ? c.childrenCount : c.belongs.length).reduce((a, b) => a + b, 0)})))

    const selected = ref<{type: "new"} | {type: "collection", id: number} | {type: "partition", ts: number}>(getRecommendedSituation(preSituations.value))

    const submit = async () => {
        if(onlyGetReturns) {
            const res = situate(images.value, situations.value, selected.value)
            onlyGetReturns(res)
        }else{
            const res = await executeSituate(situate(images.value, situations.value, selected.value))
            if(res !== undefined) onCreated(res.collectionId, res.created)
        }
    }

    return {selected, situations, submit}
}

function useSituate() {
    const toast = useToast()
    const fetchCreate = useFetchHelper({request: client => client.illust.collection.create, handleErrorInRequest: toast.handleException})
    const fetchUpdate = usePostPathFetchHelper({request: client => client.illust.collection.images.partialUpdate, handleErrorInRequest: toast.handleException})

    function getRecommendedSituation(preSituations: CollectionSituation[]): {type: "new"} | {type: "collection", id: number} | {type: "partition", ts: number} {
        const situations = preSituations.map(s => ({...s, totalImageCount: s.images.length + s.collections.map(c => c.belongs.includes(c.collectionId) ? c.childrenCount : c.belongs.length).reduce((a, b) => a + b, 0)}))
        return situations.length > 1 ? ({type: "partition", ts: arrays.maxBy(situations, s => s.totalImageCount)!.partitionTime!.timestamp}) :
            situations[0].collections.length >= 1 ? ({type: "collection", id: arrays.maxBy(situations[0].collections, c => c.childrenCount)!.collectionId}) :
                ({type: "new"})
    }

    function situate(imageIds: number[], situations: CollectionSituation[], selected: {type: "collection", id: number} | {type: "partition", ts: number} | {type: "new"}): CreateCollectionReturns {
        if(selected.type === "partition") {
            const ts = selected.ts
            const situation = situations.find(s => s.partitionTime!.timestamp === ts)!
            if(situation.collections.length > 0) {
                const collectionId = arrays.maxBy(situation.collections, c => c.belongs.length)!.collectionId
                return {collectionId, imageIds, specifyPartitionTime: situation.partitionTime!}
            }else{
                return {collectionId: "new", imageIds, specifyPartitionTime: situation.partitionTime!}
            }
        }else if(selected.type === "collection") {
            const collectionId = selected.id
            const specifyPartitionTime = situations.length > 1 ? situations.find(s => s.collections.findIndex(c => c.collectionId === collectionId) >= 0)!.partitionTime! : undefined
            return {collectionId, imageIds, specifyPartitionTime}
        }else{
            return {collectionId: "new", imageIds}
        }
    }

    async function executeSituate(situation: CreateCollectionReturns): Promise<{collectionId: number, created: boolean} | undefined> {
        if(situation.collectionId === "new") {
            const res = await fetchCreate({images: situation.imageIds, specifyPartitionTime: situation.specifyPartitionTime})
            if(res !== undefined) return {collectionId: res.id, created: true}
        }else{
            const res = await fetchUpdate(situation.collectionId, {action: "ADD", illustIds: situation.imageIds, specifyPartitionTime: situation.specifyPartitionTime})
            if(res) return {collectionId: situation.collectionId, created: false}
        }
        return undefined
    }

    return {situate, executeSituate, getRecommendedSituation}
}