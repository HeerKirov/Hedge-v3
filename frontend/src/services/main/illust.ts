import { computed, reactive, Ref, watch } from "vue"
import { installVirtualViewNavigation } from "@/components/data"
import { useDialogService } from "@/components-module/dialog"
import { flatResponse } from "@/functions/http-client"
import { IllustQueryFilter, Tagme } from "@/functions/http-client/api/illust"
import { SimpleTag, SimpleTopic, SimpleAuthor } from "@/functions/http-client/api/all"
import { useFetchEndpoint, usePostFetchHelper } from "@/functions/fetch"
import { useToast } from "@/modules/toast"
import { useRouterParamEvent } from "@/modules/router"
import { useListViewContext } from "@/services/base/list-view-context"
import { useSelectedState } from "@/services/base/selected-state"
import { useSelectedPaneState } from "@/services/base/selected-pane-state"
import { useIllustViewController } from "@/services/base/view-controller"
import { useQuerySchema } from "@/services/base/query-schema"
import { useImageDatasetOperators } from "@/services/common/illust"
import { useSettingSite } from "@/services/setting"
import { installation, toRef } from "@/utils/reactivity"
import { date, datetime, LocalDate, LocalDateTime } from "@/utils/datetime"

export const [installIllustContext] = installation(function () {
    const listview = useListView()
    const selector = useSelectedState({queryListview: listview.listview, keyOf: item => item.id})
    const paneState = useSelectedPaneState("illust", selector)
    const querySchema = useQuerySchema("ILLUST", toRef(listview.queryFilter, "query"))
    const listviewController = useIllustViewController(toRef(listview.queryFilter, "type"))
    const navigation = installVirtualViewNavigation()
    const operators = useImageDatasetOperators({
        paginationData: listview.paginationData,
        listview: listview.listview,
        selector, navigation
    })

    useSettingSite()

    useRouterParamEvent("MainIllust", params => {
        //监听router event。只监听Illust的，Partition没有。
        //对于meta tag，将其简单地转换为DSL的一部分。
        //FUTURE 当然这其实是有问题的，对于topic/tag，还应该使用地址去限制它们。
        querySchema.queryInputText.value = [
            params.tagName ? `$\`${params.tagName}\`` : undefined,
            params.topicName ? `#\`${params.topicName}\`` : undefined,
            params.authorName ? `@\`${params.authorName}\`` : undefined,
            params.source ? `^SITE:${params.source.site} ^ID:${params.source.id}` : undefined
        ].filter(i => i !== undefined).join(" ")
    })

    return {paneState, listview, selector, listviewController, querySchema, operators}
})

function useListView() {
    const listview = useListViewContext({
        defaultFilter: <IllustQueryFilter>{order: "-orderTime", type: "IMAGE"},
        request: client => (offset, limit, filter) => client.illust.list({offset, limit, ...filter}),
        eventFilter: {
            filter: ["entity/illust/created", "entity/illust/updated", "entity/illust/deleted", "entity/collection-images/changed"],
            operation({ event, refresh, update, remove }) {
                if(event.eventType === "entity/illust/created") {
                    refresh()
                }else if(event.eventType === "entity/illust/updated" && (event.generalUpdated || event.sourceDataUpdated)) {
                    update(i => i.id === event.illustId)
                }else if(event.eventType === "entity/illust/deleted") {
                    if(event.illustType === "COLLECTION") {
                        if(listview.queryFilter.value.type === "COLLECTION") {
                            refresh()
                        }
                    }else{
                        remove(i => i.id === event.illustId)
                    }
                }else if(event.eventType === "entity/collection-images/changed") {
                    if(listview.queryFilter.value.type === "COLLECTION") {
                        refresh()
                    }
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.illust.get(a.id))))
        }
    })
    return listview
}

export function useIllustDetailPaneSingle(path: Ref<number | null>) {
    const { metaTagEditor } = useDialogService()

    const { data, setData } = useFetchEndpoint({
        path,
        get: client => client.illust.get,
        update: client => client.illust.update,
        eventFilter: c => event => (event.eventType === "entity/illust/updated" || event.eventType === "entity/illust/deleted") && event.illustId === c.path
    })

    const setDescription = async (description: string) => {
        return description === data.value?.description || await setData({ description })
    }

    const setScore = async (score: number | null) => {
        return score === data.value?.score || await setData({ score })
    }

    const setPartitionTime = async (partitionTime: LocalDateTime) => {
        return partitionTime.timestamp === data.value?.partitionTime?.timestamp || await setData({partitionTime})
    }

    const setOrderTime = async (orderTime: LocalDateTime) => {
        return orderTime.timestamp === data.value?.orderTime?.timestamp || await setData({orderTime})
    }

    const openMetaTagEditor = () => {
        if(data.value !== null) {
            metaTagEditor.editIdentity({type: data.value.type, id: data.value.id})
        }
    }

    return {data, setDescription, setScore, setPartitionTime, setOrderTime, openMetaTagEditor}
}

export function useIllustDetailPaneMultiple(selected: Ref<number[]>, latest: Ref<number | null>) {
    const toast = useToast()
    const { metaTagEditor } = useDialogService()

    const batchFetch = usePostFetchHelper(httpClient => httpClient.illust.batchUpdate)

    const { data } = useFetchEndpoint({
        path: latest,
        get: client => client.illust.get,
        eventFilter: c => event => (event.eventType === "entity/illust/updated" || event.eventType === "entity/illust/deleted") && event.illustId === c.path
    })

    const actives = reactive({
        description: false,
        score: false,
        metaTag: false,
        tagme: false,
        partitionTime: false,
        orderTime: false
    })

    const anyActive = computed(() => actives.description || actives.score || actives.metaTag || actives.tagme || actives.partitionTime || actives.orderTime)

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
        const res = await metaTagEditor.edit({
            topics: form.topics.map(i => ({ ...i, isExported: false })),
            authors: form.authors.map(i => ({ ...i, isExported: false })),
            tags: form.tags.map(i => ({ ...i, isExported: false }))
        }, {
            allowTagme: false
        })
        if(res !== undefined) {
            form.topics = res.topics
            form.authors = res.authors
            form.tags = res.tags
        }
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
