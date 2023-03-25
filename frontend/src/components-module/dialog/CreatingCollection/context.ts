import { Ref, ref } from "vue"
import { CollectionSituation } from "@/functions/http-client/api/util-illust"
import { useToast } from "@/modules/toast"
import { useFetchHelper, usePostPathFetchHelper } from "@/functions/fetch"
import { Push } from "../context"

export interface CreatingCollection {
    /**
     * 传入一组images，创建一个集合。一般用于contextmenu。
     * 会列出当前images已属于的集合，选择是否要加入某个集合；或建一个新的，把所有images(以及collection的children)都塞进去。
     * @param images 要用作创建集合的image id列表。
     * @param onCreated 如果成功创建集合，则执行回调。
     * @param skipDialogIfAllow 条件允许时跳过对话框环节：如果images都是真正的image，且都不属于任何集合，那么会干脆利落地直接创建，不打开对话框
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
                if(!skipDialogIfAllow || res.length > 0) {
                    //若存在任何返回的situations，则需要对集合做决断，打开dialog
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

export function useCreatingCollectionContext(images: Ref<number[]>, onCreated: (collectionId: number, newCollection: boolean) => void) {
    const toast = useToast()
    const fetchCreate = useFetchHelper({request: client => client.illust.collection.create, handleErrorInRequest: toast.handleException})
    const fetchUpdate = usePostPathFetchHelper({request: client => client.illust.collection.images.update, handleErrorInRequest: toast.handleException})

    const selected = ref<number | "new">("new")

    const submit = async () => {
        if(selected.value === "new") {
            const res = await fetchCreate({images: images.value})
            if(res !== undefined) {
                onCreated(res.id, true)
            }
        }else{
            const res = await fetchUpdate(selected.value, images.value)
            if(res) {
                onCreated(selected.value, false)
            }
        }
    }

    return {selected, submit}
}
