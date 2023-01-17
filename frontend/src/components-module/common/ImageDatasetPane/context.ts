import { Ref } from "vue"
import { useFetchEndpoint } from "@/functions/fetch"
import { Tagme } from "@/functions/http-client/api/illust"
import { useMessageBox } from "@/modules/message-box"
import { LocalDateTime } from "@/utils/datetime"
import { objects } from "@/utils/primitives"

export function useImportDetailPaneSingle(path: Ref<number | null>) {
    const message = useMessageBox()

    const { data, setData } = useFetchEndpoint({
        path,
        get: client => client.import.get,
        update: client => client.import.update
    })

    const setTagme = async (tagme: Tagme[]) => {
        return objects.deepEquals(tagme, data.value?.tagme) || await setData({tagme})
    }

    const setSourceInfo = async ({ site, sourceId, sourcePart }: { site: string | null, sourceId: number | null, sourcePart: number | null}) => {
        console.log(sourcePart, data.value?.sourcePart)
        return (site === data.value?.sourceSite && sourceId === data.value?.sourceId && sourcePart === data.value?.sourcePart) || await setData({sourceSite: site, sourceId, sourcePart}, e => {
            if(e.code === "NOT_EXIST") {
                message.showOkMessage("error", `来源${site}不存在。`)
            }else if(e.code === "PARAM_ERROR") {
                const target = e.info === "sourceId" ? "来源ID" : e.info === "sourcePart" ? "分P" : e.info
                message.showOkMessage("error", `${target}的值内容错误。`, "ID只能是自然数。")
            }else if(e.code === "PARAM_REQUIRED") {
                const target = e.info === "sourceId" ? "来源ID" : e.info === "sourcePart" ? "分P" : e.info
                message.showOkMessage("error", `${target}属性缺失。`)
            }else if(e.code === "PARAM_NOT_REQUIRED") {
                if(e.info === "sourcePart") {
                    message.showOkMessage("error", `分P属性不需要填写，因为选择的来源类型不支持分P。`)
                }else if(e.info === "sourceId/sourcePart") {
                    message.showOkMessage("error", `来源ID/分P属性不需要填写，因为未指定来源类型。`)
                }else{
                    message.showOkMessage("error", `${e.info}属性不需要填写。`)
                }
            }else{
                return e
            }
        })
    }

    const setPartitionTime = async (partitionTime: LocalDateTime) => {
        return partitionTime.timestamp === data.value?.partitionTime?.timestamp || await setData({partitionTime})
    }

    const setCreateTime = async (createTime: LocalDateTime) => {
        return createTime.timestamp === data.value?.createTime?.timestamp || await setData({createTime})
    }

    const setOrderTime = async (orderTime: LocalDateTime) => {
        return orderTime.timestamp === data.value?.orderTime?.timestamp || await setData({orderTime})
    }

    return {data, setTagme, setSourceInfo, setPartitionTime, setCreateTime, setOrderTime}
}

export function useImportDetailPaneMultiple(selected: Ref<number[]>, latest: Ref<number | null>) {
    const { data } = useFetchEndpoint({
        path: latest,
        get: client => client.import.get
    })

    return {data}
}
