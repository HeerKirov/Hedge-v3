import { computed, onMounted, ref } from "vue"
import { useLocalStorage } from "@/functions/app"
import { DetailIllust, ImagePropsCloneAdvancedOptions, ImagePropsCloneForm } from "@/functions/http-client/api/illust"
import { useFetchHelper, usePostFetchHelper } from "@/functions/fetch"
import { usePreviewService } from "@/components-module/preview"
import { Push } from "../context"

export interface CloneImage {
    /**
     * 打开一个对话框，执行图像替换操作。
     * 需要预先指定要处理的图像列表。
     */
    clone(illustIds: number[], onSucceed?: () => void): void
    /**
     * 打开一个对话框，执行图像替换的参数选定操作。
     * 它不会实际执行，而是异步返回表单参数，后续应当手动调用图像替换API。
     */
    getCloneProps(illustIds: number[]): Promise<ImagePropsCloneForm | undefined>
}

export interface CloneImageProps {
    illustIds: number[]
    onSucceed?(): void
    onlyGetProps?(form: ImagePropsCloneForm): void
    cancel(): void
}

export function useCloneImage(push: Push): CloneImage {
    return {
        clone(illustIds, onSucceed) {
            push({
                type: "cloneImage",
                props: {illustIds, onSucceed, cancel: () => {}}
            })
        },
        getCloneProps(illustIds) {
            return new Promise(resolve => {
                push({
                    type: "cloneImage",
                    props: {illustIds, onlyGetProps: resolve, cancel: () => resolve(undefined)}
                })
            })
        },
    }
}

export function useCloneImageContext(illustIds: number[], onSucceed?: () => void, onlyGetProps?: (form: ImagePropsCloneForm) => void) {
    const previewService = usePreviewService()

    const fetchDetailIllust = useFetchHelper(client => client.illust.get)
    const fetchCloneImage = usePostFetchHelper(client => client.illust.cloneImageProps)

    const replaceList = ref<{from: number | DetailIllust | null, to: number | DetailIllust | null}[]>([])

    const unmatched = computed(() => replaceList.value.some(({ from, to }) => from === null || to === null))

    const options = useLocalStorage<{merge?: boolean, deleteFrom?: boolean}>("dialog/clone-image/options", () => ({merge: true, deleteFrom: true}), true)

    const openImagePreview = (index: number, key: "from" | "to") => {
        const files = replaceList.value.flatMap(({ from, to }) => {
            const returns: string[] = []
            if(typeof from === "object" && from !== null) returns.push(from.filePath.original)
            if(typeof to === "object" && to !== null) returns.push(to.filePath.original)
            return returns
        })
        const initIndex = index * 2 + (key === "from" ? 0 : 1)
        previewService.show({preview: "image", type: "array", files, initIndex})
    }
    
    const exchange = () => {
        for(let idx = 0; idx < replaceList.value.length; ++idx) {
            const tmp = replaceList.value[idx].from
            replaceList.value[idx].from = replaceList.value[idx].to
            replaceList.value[idx].to = tmp
        }
    }

    const drop = (index: number, key: "from" | "to", illustId: number) => {
        //找到数据项当前已存在于列表中的位置
        let swap: {index: number, key: "from" | "to"} | undefined
        for (let i = 0; i < replaceList.value.length; ++i) {
            for (const k of ["from", "to"] as const) {
                const obj = replaceList.value[i][k]
                if((typeof obj === "number" && obj === illustId) || (typeof obj === "object" && obj !== null && obj.id === illustId)) {
                    swap = {index: i, key: k}
                    break
                }
            }
            if (swap !== undefined) break
        }

        if (swap !== undefined) {
            //在另一个位置已找到数据项，需要将当前位置和另一个位置的数据项互换
            const temp = replaceList.value[index][key]
            replaceList.value[index][key] = replaceList.value[swap.index][swap.key]
            replaceList.value[swap.index][swap.key] = temp
        } else {
            //在当前位置没有其他项需要互换，直接替换。此时需要重新请求数据
            replaceList.value[index][key] = illustId
            void fillDetail(index, key, illustId)
        }
    }    

    const execute = async () => {
        if(onlyGetProps) {
            const { merge, deleteFrom } = options.value
            const formReplaceList = replaceList.value.filter(({ from, to }) => from !== null && to !== null).map(({ from, to }) => ({from: typeof from === "number" ? from : from!.id, to: typeof to === "number" ? to : to!.id}))
            onlyGetProps({replaceList: formReplaceList, advancedOptions: {merge, deleteFrom}})
        }else{
            const { merge, deleteFrom } = options.value
            const formReplaceList = replaceList.value.filter(({ from, to }) => from !== null && to !== null).map(({ from, to }) => ({from: typeof from === "number" ? from : from!.id, to: typeof to === "number" ? to : to!.id}))
            const res = await fetchCloneImage({replaceList: formReplaceList, advancedOptions: {merge, deleteFrom}})
            if(res && onSucceed) onSucceed()
        }
    }

    const fillDetail = async (idx: number, key: "from" | "to", id: number | null) => {
        if (id != null) {
            const detail = await fetchDetailIllust(id)
            if(detail !== undefined && replaceList.value[idx]) {
                if(replaceList.value[idx][key] === id) {
                    replaceList.value[idx][key] = detail
                }else{
                    for(const possibleKey of ["from", "to"] as const) {
                        const found = replaceList.value.find(item => item[possibleKey] === id)
                        if(found) {
                            found[possibleKey] = detail
                        }
                    }
                }
            }
        }
    }

    onMounted(() => {
        // 将illustIds分成前后两段，然后对应组合成replaceList
        const mid = Math.ceil(illustIds.length / 2)
        const fromIds = illustIds.slice(0, mid)
        const toIds = illustIds.slice(mid, mid * 2)
        replaceList.value = fromIds.map((from, idx) => ({
            from,
            to: toIds[idx] !== undefined ? toIds[idx] : null
        }))
        
        for(let idx=0; idx<replaceList.value.length; ++idx) {
            void fillDetail(idx, "from", typeof replaceList.value[idx].from === "number" ? replaceList.value[idx].from as number : null)
            void fillDetail(idx, "to", typeof replaceList.value[idx].to === "number" ? replaceList.value[idx].to as number : null)
        }
    })

    return {replaceList, unmatched, openImagePreview, exchange, drop, options, execute}
}
