import { computed, reactive, Ref, watch } from "vue"
import { useFetchEndpoint, useFetchHelper, usePostFetchHelper } from "@/functions/fetch"
import { Tagme } from "@/functions/http-client/api/illust"
import { OrderTimeType } from "@/functions/http-client/api/setting-import"
import { SimpleTag, SimpleTopic, SimpleAuthor } from "@/functions/http-client/api/all"
import { useToast } from "@/modules/toast"
import { useMessageBox } from "@/modules/message-box"
import { date, datetime, LocalDate, LocalDateTime } from "@/utils/datetime"
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
    const toast = useToast()

    const batchFetch = useFetchHelper(httpClient => httpClient.import.batchUpdate)

    const { data } = useFetchEndpoint({
        path: latest,
        get: client => client.import.get
    })

    const actives = reactive({
        tagme: false,
        setCreatedTimeBy: false,
        setOrderTimeBy: false,
        partitionTime: false
    })

    const anyActive = computed(() => actives.tagme || actives.setOrderTimeBy || actives.setOrderTimeBy || actives.partitionTime || form.analyseSource)

    const form = reactive<{
        tagme: Tagme[]
        setCreatedTimeBy: OrderTimeType
        setOrderTimeBy: OrderTimeType
        partitionTime: LocalDate
        analyseSource: boolean
    }>({
        tagme: [],
        setCreatedTimeBy: "UPDATE_TIME",
        setOrderTimeBy: "UPDATE_TIME",
        partitionTime: date.now(),
        analyseSource: false
    })

    const submit = async () => {
        if(anyActive.value) {
            const res = await batchFetch({
                target: selected.value,
                tagme: actives.tagme ? form.tagme : undefined,
                setCreateTimeBy: actives.setCreatedTimeBy ? form.setCreatedTimeBy : undefined,
                setOrderTimeBy: actives.setOrderTimeBy ? form.setOrderTimeBy : undefined,
                partitionTime: actives.partitionTime ? form.partitionTime : undefined,
                analyseSource: form.analyseSource
            }, toast.handleException)
            if(res) {
                if(res.length) {
                    if(res.length > 3) {
                        toast.toast("来源信息分析失败", "warning", `超过${res.length}个文件的来源信息分析失败，可能是因为正则表达式内容错误。`)
                    }else{
                        toast.toast("来源信息分析失败", "warning", "存在文件的来源信息分析失败，可能是因为正则表达式内容错误。")
                    }
                }else{
                    toast.toast("批量编辑完成", "info", "已完成所选项目的信息批量编辑。")
                }
                clear()
            }
        }
    }

    const clear = () => {
        actives.tagme = false
        actives.setCreatedTimeBy = false
        actives.setOrderTimeBy = false
        actives.partitionTime = false
    }

    return {data, actives, anyActive, form, submit, clear}
}

export function useIllustDetailPaneSingle(path: Ref<number | null>) {
    const message = useMessageBox()

    const { data, setData } = useFetchEndpoint({
        path,
        get: client => client.illust.get,
        update: client => client.illust.update
    })


    const setDescription = async (description: string) => {
        return description === data.value?.description || await setData({ description })
    }
    const setScore = async (score: number | null) => {
        return score === data.value?.score || await setData({ score })
    }
    const setTagme = async (tagme: Tagme[]) => {
        return objects.deepEquals(tagme, data.value?.tagme) || await setData({tagme})
    }

    const setPartitionTime = async (partitionTime: LocalDateTime) => {
        return partitionTime.timestamp === data.value?.partitionTime?.timestamp || await setData({partitionTime})
    }

    const setOrderTime = async (orderTime: LocalDateTime) => {
        return orderTime.timestamp === data.value?.orderTime?.timestamp || await setData({orderTime})
    }

    const openMetaTagEditor = () => {
        //TODO open tag editor
    }

    return {data, setDescription, setScore, setTagme, setPartitionTime, setOrderTime, openMetaTagEditor}
}

export function useIllustDetailPaneMultiple(selected: Ref<number[]>, latest: Ref<number | null>) {
    const toast = useToast()

    const batchFetch = usePostFetchHelper(httpClient => httpClient.illust.batchUpdate)

    const { data } = useFetchEndpoint({
        path: latest,
        get: client => client.illust.get
    })

    const actives = reactive({
        description: false,
        score: false,
        metaTag: false,
        tagme: false,
        partitionTime: false,
        orderTime: false
    })

    const anyActive = computed(() => actives.tagme || actives.partitionTime || actives.orderTime)

    const form = reactive<{
        description: string
        score: number | null
        tags: SimpleTag[]
        topics: SimpleTopic[]
        authors: SimpleAuthor[]
        tagme: Tagme[]
        partitionTime: LocalDate,
        orderTime: {
            begin: LocalDateTime,
            end: LocalDateTime
        }
    }>({
        description: "",
        score: null,
        tags: [],
        topics: [],
        authors: [],
        tagme: ["TAG", "TOPIC", "AUTHOR"],
        partitionTime: date.now(),
        orderTime: {
            begin: datetime.now(),
            end: datetime.now()
        }
    })

    const editMetaTag = async () => {
        //TODO edit meta tag
    }

    const submit = async () => {
        if(anyActive.value) {
            const res = await batchFetch({
                target: selected.value,
                tagme: actives.tagme ? form.tagme : undefined,
                tags: actives.metaTag && form.tags.length ? form.tags.map(i => i.id) : undefined,
                topics: actives.metaTag && form.topics.length ? form.topics.map(i => i.id) : undefined,
                authors: actives.metaTag && form.authors.length ? form.authors.map(i => i.id) : undefined,
                description: actives.description ? form.description : undefined,
                score: actives.score ? form.score : undefined,
                partitionTime: actives.partitionTime ? form.partitionTime : undefined,
                orderTimeBegin: actives.orderTime ? form.orderTime.begin : undefined,
                orderTimeEnd: actives.orderTime ? form.orderTime.end : undefined
            }, toast.handleException)
            if(res) {
                toast.toast("批量编辑完成", "info", "已完成所选项目的信息批量编辑。")
                clear()
            }
        }
    }

    const clear = () => {
        actives.tagme = false
        actives.description = false
        actives.score = false
        actives.metaTag = false
        actives.partitionTime = false
        actives.orderTime = false
    }

    watch(() => actives.metaTag, enabled => { if(enabled) editMetaTag().finally() })

    return {data, actives, anyActive, form, submit, clear}
}
