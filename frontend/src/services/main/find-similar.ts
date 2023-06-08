import { computed, reactive, ref, Ref, watch } from "vue"
import { installVirtualViewNavigation } from "@/components/data"
import { QueryListview, useFetchEndpoint } from "@/functions/fetch"
import { flatResponse } from "@/functions/http-client"
import { FindSimilarDetailResult, FindSimilarResult, FindSimilarResultImage, FindSimilarResultRelation } from "@/functions/http-client/api/find-similar"
import { RelatedSimpleTag } from "@/functions/http-client/api/tag"
import { RelatedSimpleTopic } from "@/functions/http-client/api/topic"
import { RelatedSimpleAuthor } from "@/functions/http-client/api/author"
import { Tagme } from "@/functions/http-client/api/illust"
import { SimpleBook } from "@/functions/http-client/api/book"
import { SimpleFolder } from "@/functions/http-client/api/folder"
import { platform } from "@/functions/ipc-client"
import { useMessageBox } from "@/modules/message-box"
import { DetailViewState, useDetailViewState } from "@/services/base/detail-view-state"
import { useListViewContext } from "@/services/base/list-view-context"
import { useSettingSite } from "@/services/setting"
import { installation } from "@/utils/reactivity"
import { LocalDate, LocalDateTime } from "@/utils/datetime"

export const [installFindSimilarContext, useFindSimilarContext] = installation(function () {
    const paneState = useDetailViewState<number>()
    const listview = useListView()
    const operators = useOperators(paneState, listview.listview)

    installVirtualViewNavigation()

    return {paneState, listview, operators}
})

function useListView() {
    return useListViewContext({
        request: client => (offset, limit) => client.findSimilar.result.list({offset, limit}),
        eventFilter: {
            filter: ["backend/similar-finder/result-added", "backend/similar-finder/result-resolved", "backend/similar-finder/result-deleted"],
            operation({ event, refresh, remove }) {
                if(event.eventType === "backend/similar-finder/result-added" && event.count > 0) {
                    refresh()
                }else if(event.eventType === "backend/similar-finder/result-resolved" || event.eventType === "backend/similar-finder/result-deleted") {
                    remove(i => i.id === event.resultId)
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.findSimilar.result.get(a.id))))
        }
    })
}

function useOperators(paneState: DetailViewState<number>, listview: QueryListview<FindSimilarResult>) {


    return {}
}


export const [installFindSimilarDetailPanel, useFindSimilarDetailPanel] = installation(function () {
    const message = useMessageBox()
    const { paneState } = useFindSimilarContext()

    const { data, setData: resolveIt, deleteData: deleteIt } = useFetchEndpoint({
        path: paneState.detailPath,
        get: client => client.findSimilar.result.get,
        update: client => client.findSimilar.result.resolve,
        delete: client => client.findSimilar.result.delete,
        eventFilter: c => event => (event.eventType === "backend/similar-finder/result-resolved" || event.eventType === "backend/similar-finder/result-deleted") && c.path === event.resultId,
        afterRetrieve(path, data) {
            if(path !== null && data === null) {
                paneState.closeView()
            }
        }
    })

    const selector = useDetailPanelSelector(data)
    
    const info = useDetailPanelInfo(data, selector)

    useSettingSite()

    return {data, selector, info}
})

function useDetailPanelSelector(data: Ref<FindSimilarDetailResult | null>) {
    //find similar详情页的选择器采用双模式。
    //默认情况下，使用compare模式，选择A、B两个item，每次点击都切换选择A、B，以此方便对比；按下ALT键则是不切换选择；
    //使用CTRL/SHIFT的情况下，切换至multiple模式，选择多个item；按CTRL单选，按SHIFT连续选择。
    const selectMode = ref<"COMPARE" | "MULTIPLE">("COMPARE")
    const multiple = ref<{selected: FindSimilarResultImage[], lastSelected: FindSimilarResultImage | null}>({selected: [], lastSelected: null})
    const compare = ref<{a: FindSimilarResultImage | null, b: FindSimilarResultImage | null, nextUse: "a" | "b"}>({a: null, b: null, nextUse: "a"})
    
    watch(data, data => {
        //data发生变化时，根据内容重置至初始状态
        if(data !== null) {
            if(data.images.length >= 2) {
                selectMode.value = "COMPARE"
                multiple.value = {selected: [data.images[0], data.images[1]], lastSelected: data.images[1]}
                compare.value = {a: data.images[0], b: data.images[1], nextUse: "a"}
            }else if(data.images.length === 1) {
                selectMode.value = "MULTIPLE"
                multiple.value = {selected: [data.images[0]], lastSelected: data.images[0]}
                compare.value = {a: data.images[0], b: null, nextUse: "a"}
            }else{
                selectMode.value = "MULTIPLE"
                multiple.value = {selected: [], lastSelected: null}
                compare.value = {a: null, b: null, nextUse: "a"}
            }
        }else{
            selectMode.value = "MULTIPLE"
            multiple.value = {selected: [], lastSelected: null}
            compare.value = {a: null, b: null, nextUse: "a"}
        }
    }, {immediate: true})

    const click = (index: number, event: MouseEvent) => {
        const item = data.value!.images[index]
        const shiftKey = event.shiftKey
        const ctrlKey = (platform === "darwin" && event.metaKey) || (platform !== "darwin" && event.ctrlKey)
        const altKey = event.altKey

        if(shiftKey || ctrlKey) {
            if(selectMode.value === "COMPARE") {
                selectMode.value = "MULTIPLE"
                if(shiftKey) {
                    //从compare进入multiple模式时，将re-nextUse作为上一次的lastSelected，将AB都包含在已选项内
                    const lastSelected = compare.value.nextUse === "a" ? compare.value.b : compare.value.a
                    if(lastSelected !== null) {
                        const lastSelectedIndex = data.value!.images.findIndex(i => i.type === lastSelected.type && i.id === lastSelected.id)
                        const slice = lastSelectedIndex < 0 ? data.value!.images.slice(0, index) : lastSelectedIndex < index ? data.value!.images.slice(lastSelectedIndex + 1, index + 1) : data.value!.images.slice(index, lastSelectedIndex)
                        multiple.value = {
                            selected: [compare.value.a, compare.value.b, ...slice].filter(it => it !== null) as FindSimilarResultImage[], 
                            lastSelected: item
                        }
                    }else{
                        multiple.value = {
                            selected: [compare.value.a, compare.value.b, item].filter(it => it !== null) as FindSimilarResultImage[], 
                            lastSelected: item
                        }
                    }
                }else{
                    multiple.value = {
                        selected: [compare.value.a, compare.value.b, item].filter(it => it !== null) as FindSimilarResultImage[], 
                        lastSelected: item
                    }
                }
                compare.value = {a: null, b: null, nextUse: "a"}
            }else{
                if(shiftKey) {
                    if(multiple.value.lastSelected !== null) {
                        const lastSelectedIndex = data.value!.images.findIndex(i => i.type === multiple.value.lastSelected!.type && i.id === multiple.value.lastSelected!.id)
                        const slice = lastSelectedIndex < 0 ? data.value!.images.slice(0, index) : lastSelectedIndex < index ? data.value!.images.slice(lastSelectedIndex + 1, index + 1) : data.value!.images.slice(index, lastSelectedIndex)
                        const filteredSlice = slice.filter(i => !multiple.value.selected.some(s => s.type === i.type && s.id === i.id))
                        multiple.value = {
                            selected: [...multiple.value.selected, ...filteredSlice],
                            lastSelected: item
                        }
                    }
                }else{
                    //按下CTRL，点选加入选择
                    const idx = multiple.value.selected.findIndex(i => i.type === item.type && i.id === item.id)
                    if(idx >= 0) {
                        //已存在此item时取消选择，并将lastSelected重置为selected的上一个
                        const selected = [...multiple.value.selected.slice(0, idx), ...multiple.value.selected.slice(idx + 1)]
                        multiple.value = {
                            selected,
                            lastSelected: selected.length > 0 ? selected[selected.length - 1] : null
                        }
                    }else{
                        //未存在此item时加入选择
                        multiple.value = {
                            selected: [...multiple.value.selected, item],
                            lastSelected: item
                        }
                    }
                }
            }
        }else{
            if(selectMode.value === "MULTIPLE") {
                selectMode.value = "COMPARE"
                //从multiple进入compare模式时，从a开始选择，并空缺b
                compare.value = {a: item, b: null, nextUse: "b"}
                multiple.value = {selected: [], lastSelected: null}
            }else if(!(item.type === compare.value.a?.type && item.id === compare.value.a?.id) && !(item.type === compare.value.b?.type && item.id === compare.value.b?.id)) {
                if(compare.value.nextUse === "a") {
                    compare.value = {
                        a: item,
                        b: compare.value.b,
                        nextUse: altKey ? "a" : "b"
                    }
                }else{
                    compare.value = {
                        a: compare.value.a,
                        b: item,
                        nextUse: altKey ? "b" : "a"
                    }
                }
            }
        }

        
    }

    const exchangeCompareSelection = () => {
        if(selectMode.value === "COMPARE") {
            compare.value = {a: compare.value.b, b: compare.value.a, nextUse: compare.value.nextUse === "a" ? "b" : "a"}
        }
    }

    return {selectMode, multiple, compare, click, exchangeCompareSelection}
}

function useDetailPanelInfo(data: Ref<FindSimilarDetailResult | null>, selector: ReturnType<typeof useDetailPanelSelector>) {
    const selectedRelations = ref<FindSimilarResultRelation[]>([])

    watch(selector.compare, ({ a, b }) => {
        if(a !== null && b !== null && data.value?.relations?.length) {
            const newRelations: FindSimilarResultRelation[] = []
            for(const r of data.value.relations) {
               if(r.a.type === a.type && r.a.id === a.id && r.b.type === b.type && r.b.id === b.id) {
                    newRelations.push(r)
               }else if(r.a.type === b.type && r.a.id === b.id && r.b.type === a.type && r.b.id === a.id) {
                    newRelations.push({...r, a, b})
               }
            }
            selectedRelations.value = newRelations
        }else{
            selectedRelations.value = []
        }
    })

    return {selectedRelations}
}

export function useFindSimilarCompareData(id: Ref<{type: "IMPORT_IMAGE" | "ILLUST", id: number} | null>) {
    const message = useMessageBox()

    const { data } = useFetchEndpoint({
        path: id,
        get: client => async path => {
            if(path.type === "ILLUST") {
                const metadata = await client.illust.image.get(path.id)
                if(!metadata.ok) return metadata

                const relatedItems = await client.illust.image.relatedItems.get(path.id, {limit: 9})
                if(!relatedItems.ok) return relatedItems

                const sourceData = await client.illust.image.sourceData.get(path.id)
                if(!sourceData.ok) return sourceData

                return {
                    ok: true,
                    status: 200,
                    data: <FindSimilarCompareData>{
                        thumbnailFile: metadata.data.thumbnailFile,
                        metadata: {
                            id: metadata.data.id,
                            file: null,
                            score: metadata.data.score,
                            favorite: metadata.data.favorite,
                            description: metadata.data.description,
                            tagme: metadata.data.tagme,
                            tags: metadata.data.tags,
                            topics: metadata.data.topics,
                            authors: metadata.data.authors,
                            partitionTime: metadata.data.partitionTime,
                            createTime: metadata.data.createTime,
                            updateTime: metadata.data.updateTime,
                            orderTime: metadata.data.orderTime,
                        },
                        sourceData: {
                            site: sourceData.data.sourceSite,
                            sourceId: sourceData.data.sourceId,
                            sourcePart: sourceData.data.sourcePart,
                        },
                        relatedItems: {
                            collection: relatedItems.data.collection?.id,
                            books: relatedItems.data.books,
                            folders: relatedItems.data.folders
                        }
                    }
                }
            }else{
                const res = await client.import.get(path.id)
                if(!res.ok) return res

                return {
                    ok: true,
                    status: 200,
                    data: <FindSimilarCompareData>{
                        thumbnailFile: res.data.thumbnailFile,
                        metadata: {
                            id: res.data.id,
                            file: res.data.fileName,
                            score: null,
                            favorite: false,
                            description: "",
                            tagme: res.data.tagme,
                            tags: [],
                            topics: [],
                            authors: [],
                            partitionTime: null,
                            createTime: res.data.createTime,
                            updateTime: res.data.createTime,
                            orderTime: res.data.orderTime,
                        },
                        sourceData: {
                            site: res.data.sourceSite,
                            sourceId: res.data.sourceId,
                            sourcePart: res.data.sourcePart,
                        },
                        relatedItems: {
                            collection: res.data.collectionId,
                            books: res.data.books,
                            folders: res.data.folders
                        }
                    }
                }
            }
        }
    })

    return data
}

export function useFindSimilarCompareList<T>(columnNum: Ref<number>, a: () => T | null, b: () => T | null): Ref<(T | null)[]> {
    return computed(() => {
        if(columnNum.value === 2) {
            return [a(), b()]
        }else if(columnNum.value === 1) {
            return [a()]
        }else{
            return [null]
        }
    })
}

export interface FindSimilarCompareData {
    thumbnailFile: string | null
    metadata: {
        id: number | null
        file: string | null
        score: number | null
        favorite: boolean
        description: string
        tagme: Tagme[]
        tags: RelatedSimpleTag[],
        topics: RelatedSimpleTopic[],
        authors: RelatedSimpleAuthor[],
        partitionTime: LocalDate | null,
        createTime: LocalDateTime,
        updateTime: LocalDateTime,
        orderTime: LocalDateTime,
    },
    sourceData: {
        site: string | null,
        sourceId: number | null,
        sourcePart: number | null,
    },
    relatedItems: {
        collection: number | string | null,
        books: SimpleBook[],
        folders: SimpleFolder[]
    }
}