import { Ref, ref, watch } from "vue"
import { useFetchEndpoint } from "@/functions/fetch"
import { useToast } from "@/modules/toast"
import { useMessageBox } from "@/modules/message-box"
import { useDroppable } from "@/modules/drag"
import { arrays } from "@/utils/primitives"

export function useImageCompareTableContext(columnNum: number, ids: Ref<(number | null)[]>, updateId: (idx: number, id: number) => void) {
    const context = arrays.newArray(columnNum, index => {
        const imageData = useImageData(ids.value[index])
        const dropEvents = useDropEvents(id => updateId(index, id))
        return {imageData, dropEvents}
    })

    watch(ids, ids => ids.forEach((id, index) => context[index].imageData.imageId.value = id))

    return {context}
}

function useImageData(initIndex: number | null) {
    const message = useMessageBox()

    const imageId = ref<number | null>(initIndex)

    const { data: metadata } = useFetchEndpoint({
        path: imageId,
        get: client => client.illust.image.get,
        afterRetrieve(path, data, type) {
            if(path !== null && data === null) {
                if(type === "PATH_CHANGED") {
                    message.showOkMessage("prompt", "无法使用此图像。", "请确认图像存在、可用，且不要使用集合。")
                }
                imageId.value = null
            }
        }
    })

    const { data: relatedItems } = useFetchEndpoint({
        path: imageId,
        get: client => path => client.illust.image.relatedItems.get(path, {limit: 9})
    })

    const { data: sourceData } = useFetchEndpoint({
        path: imageId,
        get: client => client.illust.image.sourceData.get
    })

    return {imageId, metadata, relatedItems, sourceData}
}

function useDropEvents(updateId: (id: number) => void) {
    const toast = useToast()

    const { dragover: _, ...dropEvents } = useDroppable("illusts", illusts => {
        if(illusts.length > 1) {
            toast.toast("选择项过多", "warning", "选择项过多。请仅选择1个项以拖放到此位置。")
            return
        }else if(illusts.length <= 0) {
            toast.toast("没有选择项", "warning", "选择项为空。")
            return
        }
        updateId(illusts[0].id)
    })

    return dropEvents
}
