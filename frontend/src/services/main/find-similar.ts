import * as echarts from "echarts"
import { computed, onBeforeUnmount, onMounted, ref, Ref, watch } from "vue"
import { installVirtualViewNavigation } from "@/components/data"
import { usePreviewService } from "@/components-module/preview"
import { QueryInstance, QueryListview, useFetchEndpoint, useFetchHelper, usePaginationDataView, usePathFetchHelper, usePostFetchHelper, usePostPathFetchHelper, useQueryListview } from "@/functions/fetch"
import { flatResponse } from "@/functions/http-client"
import { FindSimilarDetailResult, FindSimilarResult, FindSimilarResultDetailImage, FindSimilarResultImage, FindSimilarResultResolveAction, FindSimilarResultResolveForm, SimilarityRelationCoverage } from "@/functions/http-client/api/find-similar"
import { FilePath, SourceDataPath } from "@/functions/http-client/api/all"
import { RelatedSimpleTag } from "@/functions/http-client/api/tag"
import { RelatedSimpleTopic } from "@/functions/http-client/api/topic"
import { RelatedSimpleAuthor } from "@/functions/http-client/api/author"
import { CommonIllust, ImagePropsCloneForm, Tagme } from "@/functions/http-client/api/illust"
import { SimpleBook } from "@/functions/http-client/api/book"
import { SimpleFolder } from "@/functions/http-client/api/folder"
import { platform } from "@/functions/ipc-client"
import { useAssets, useLocalStorage } from "@/functions/app"
import { useMessageBox } from "@/modules/message-box"
import { useInterceptedKey } from "@/modules/keyboard"
import { useDetailViewState } from "@/services/base/detail-view-state"
import { useListViewContext } from "@/services/base/list-view-context"
import { useIllustViewController } from "@/services/base/view-controller"
import { SelectedState, useSelectedState } from "@/services/base/selected-state"
import { useSettingSite } from "@/services/setting"
import { installation, toRef } from "@/utils/reactivity"
import { date, datetime, LocalDate, LocalDateTime } from "@/utils/datetime"
import { arrays, numbers } from "@/utils/primitives"
import { useListeningEvent } from "@/utils/emitter"
import { useToast } from "@/modules/toast"
import { useDialogService } from "@/components-module/dialog"
import { onElementResize } from "@/utils/sensors"

export const [installFindSimilarContext, useFindSimilarContext] = installation(function () {
    const paneState = useDetailViewState<number>()
    const listview = useListView()

    installVirtualViewNavigation()
    useSettingSite()

    return {paneState, listview}
})

function useListView() {
    return useListViewContext({
        request: client => (offset, limit) => client.findSimilar.result.list({offset, limit}),
        eventFilter: {
            filter: ["entity/find-similar-result/created", "entity/find-similar-result/updated", "entity/find-similar-result/deleted"],
            operation({ event, refresh, updateOne, removeOne }) {
                if(event.eventType === "entity/find-similar-result/created" && event.count > 0) {
                    refresh()
                }else if(event.eventType === "entity/find-similar-result/deleted") {
                    removeOne(i => i.id === event.resultId)
                }else if(event.eventType === "entity/find-similar-result/updated") {
                    updateOne(i => i.id === event.resultId)
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.findSimilar.result.get(a.id))))
        }
    })
}

export function useFindSimilarItemContext(item: FindSimilarResult) {
    const fetchResolve = usePostPathFetchHelper(client => client.findSimilar.result.resolve)
    const fetchDelete = usePathFetchHelper(client => client.findSimilar.result.delete)

    const status = {
        onlySame: !item.summaryType.some(i => i !== "EQUIVALENCE"),
        anySimilar: item.summaryType.some(i => i === "SIMILAR"),
        anyRelated: item.summaryType.some(i => i === "RELATED"),
        moreThan2: item.images.length >= 2,
        moreThan3: item.images.length >= 3
    }

    const allow = {
        keepOld: status.onlySame || status.anySimilar,
        keepNew: status.onlySame || status.anySimilar,
        keepNewAndCloneProps: (status.onlySame || status.anySimilar) && status.moreThan2
    }

    const keepOld = () => {
        if(allow.keepOld) {
            const takedImages = [...item.images].sort(resultCompare).slice(1)
            if(takedImages.length > 0) {
                fetchResolve(item.id, {actions: [{type: "DELETE", imageIds: takedImages.map(i => i.id)}], clear: true})
            }
        }
    }

    const keepNew = () => {
        if(allow.keepNew) {
            const takedImages = [...item.images].sort(resultCompare).slice(0, item.images.length - 1)
            if(takedImages.length > 0) {
                fetchResolve(item.id, {actions: [{type: "DELETE", imageIds: takedImages.map(i => i.id)}], clear: true})
            }
        }
    }

    const keepNewAndCloneProps = () => {
        if(allow.keepNewAndCloneProps) {
            const sortedImages = [...item.images].sort(resultCompare)
            const a = sortedImages[0], b = sortedImages[sortedImages.length - 1], d = sortedImages.slice(1, sortedImages.length - 1)
            const config = {
                props: <ImagePropsCloneForm["props"]>{
                    score: true, favorite: true, description: true, tagme: true, metaTags: true, 
                    collection: true, books: true, folders: true, associate: true, orderTime: true, 
                    partitionTime: false, source: false
                },
                merge: true,
                deleteFrom: true
            }
            fetchResolve(item.id, {actions: [
                {type: "DELETE", imageIds: d.map(i => i.id)},
                {type: "CLONE_IMAGE", from: a.id, to: b.id, ...config}
            ], clear: true})
        }
    }
    
    const ignoreIt = () => {
        fetchResolve(item.id, {actions: arrays.windowed(item.images, 2).map(([a, b]) => ({type: "MARK_IGNORED", from: a.id, to: b.id})), clear: true})
    }

    const deleteIt = () => {
        fetchDelete(item.id, undefined)
    }

    return {allow, keepOld, keepNewAndCloneProps, keepNew, ignoreIt, deleteIt}
}

export const [installFindSimilarDetailPanel, useFindSimilarDetailPanel] = installation(function () {
    
    const { paneState } = useFindSimilarContext()

    const storage = useLocalStorage<{viewMode: "grid" | "graph" | "compare"}>("find-similar/detail", () => ({viewMode: "graph"}), true)

    const viewMode = toRef(storage, "viewMode")

    const listviewController = useIllustViewController()

    const { data, setData: resolve, deleteData: clear } = useFetchEndpoint({
        path: paneState.detailPath,
        get: client => client.findSimilar.result.get,
        update: client => client.findSimilar.result.resolve,
        delete: client => client.findSimilar.result.delete,
        eventFilter: c => event => (event.eventType === "entity/find-similar-result/updated" || event.eventType === "entity/find-similar-result/deleted") && c.path === event.resultId,
        afterRetrieve(path, data) {
            if(path !== null && data === null) {
                paneState.closeView()
            }
        }
    })

    const listview = useQueryListview({
        request: () => async (offset, limit) => ({ok: true, status: 200, data: {total: data.value?.images.length ?? 0, result: data.value?.images.slice(offset, limit) ?? []}})
    })

    watch(data, () => listview.refresh())

    const paginationData = usePaginationDataView(listview)

    const selector = useSelectedState({queryListview: listview, keyOf: item => item.id})

    const operators = useOperators(data, selector, resolve, clear)

    return {data, listview, paginationData, selector, listviewController, viewMode, operators}
})

function useOperators(data: Ref<FindSimilarDetailResult | null>, selector: SelectedState<number>, resolve: (f: FindSimilarResultResolveForm) => Promise<boolean>, clear: () => Promise<boolean>) {
    const message = useMessageBox()

    const allCollections = computed(() => {
        if(data.value !== null) {
            const ret = new Set<number>()
            data.value.images.forEach(i => i.parentId && ret.add(i.parentId))
            return [...ret.values()].sort()
        }
        return []
    })

    const allBooks = computed(() => {
        if(data.value !== null) {
            const ret = new Set<number>()
            data.value.coverages.forEach(c => c.info.type === "BOOK" && ret.add(c.info.bookId))
            return [...ret.values()].sort()
        }
        return []
    })

    const getEffectedItems = (currentImageId?: number) => {
        return currentImageId === undefined || selector.selected.value.includes(currentImageId) ? selector.selected.value : [currentImageId]
    }

    const addToCollection = async (collectionId: number | "new", currentImageId?: number) => {
        const imageIds = getEffectedItems(currentImageId)
        await resolve({actions: [{type: "ADD_TO_COLLECTION", imageIds, collectionId}], clear: false})
    }

    const addToBook = async (bookId: number, currentImageId?: number) => {
        const imageIds = getEffectedItems(currentImageId)
        await resolve({actions: [{type: "ADD_TO_BOOK", imageIds, bookId}], clear: false})
    }

    const cloneImage = (currentImageId?: number) => {
        const imageIds = getEffectedItems(currentImageId)
        if(imageIds.length !== 2) {
            message.showOkMessage("warn", "克隆图像属性需要两个选择项。", "请选择两个图像。")
        }else{

        }
    }

    const markIgnored = async (currentImageId?: number) => {
        const imageIds = getEffectedItems(currentImageId)
        if(imageIds.length === 1) {
            message.showOkMessage("warn", "忽略标记需要在图像之间生效。", "请选择多个图像。")
        }else if(await message.showYesNoMessage("warn", `确定要在${imageIds.length}个项之间添加忽略标记吗？`, "被添加忽略标记的项之间形如已建立关联。")) {
            const actions: FindSimilarResultResolveAction[] = []
            for(let i = 0; i < imageIds.length - 1; ++i) {
                for(let j = i + 1; j < imageIds.length; ++j) {
                    actions.push({type: "MARK_IGNORED", from: imageIds[i], to: imageIds[j]})
                }
            }
            await resolve({actions, clear: false})
        }
    }

    const deleteItem = async (currentImageId?: number) => {
        const imageIds = getEffectedItems(currentImageId)
        if(await message.showYesNoMessage("warn", imageIds.length === 1 ? "确定要删除此项吗？" : `确定要删除${imageIds.length}个已选择项吗？`, "被删除的项将放入「已删除」归档。")) {
            await resolve({actions: [{type: "DELETE", imageIds}], clear: false})
        }
    }

    const complete = async () => {
        if(data.value?.resolved || await message.showYesNoMessage("confirm", "相似关系并未完全解决。", "此时确认完成，将清除此相似项记录，且仍保留未解决的相似项关系。")) {
            await clear()
        }
    }

    return {allCollections, allBooks, addToCollection, addToBook, markIgnored, cloneImage, deleteItem, complete}
}

export function useGraphView({ menu }: {menu: (i: FindSimilarResultDetailImage) => void}) {
    const { data, selector: { selected, update: updateSelect } } = useFindSimilarDetailPanel()

    const { assetsUrl } = useAssets()

    const tooltipFormatter = (params: echarts.TooltipComponentFormatterCallbackParams): string => {
        const p = params as Exclude<echarts.TooltipComponentFormatterCallbackParams, any[]>
        if(p.dataType === "node") {
            const node = p.data as GraphNodeItem
            return graphNodeTooltips[node.id!] ?? "unknown node tooltip"
        }else if(p.dataType === "edge") {
            const link = p.data as GraphLinkItem
            return graphLinkTooltips[link.id!] ?? "unknown edge tooltip"
        }
        return "unknown tooltip"
    }

    const click = (e: echarts.ECElementEvent) => {
        function getEffectedImagesByNodeId(nodeId: string) {
            if(nodeId.startsWith("IMAGE:")) {
                const image = graphNodeReflections[nodeId] as FindSimilarResultDetailImage
                return [image.id]
            }else{
                const coverage = graphNodeReflections[nodeId] as SimilarityRelationCoverage
                return coverage.imageIds
            }
        }
        function getEffectedImages() {
            if(e.dataType === "node") {
                return getEffectedImagesByNodeId((e.data as GraphNodeItem).id!)
            }else if(e.dataType === "edge") {
                const source = (e.data as GraphLinkItem).source! as string, target = (e.data as GraphLinkItem).target! as string
                const sourceImages = getEffectedImagesByNodeId(source), targetImages = getEffectedImagesByNodeId(target)
                return [...sourceImages, ...targetImages.filter(i => !sourceImages.includes(i))]
            }else{
                return []
            }
        }
        
        const shift = e.event?.event.ctrlKey || e.event?.event.shiftKey
        const effectedImageIds = getEffectedImages()
        if(shift) {
            const filtered = effectedImageIds.filter(id => !selected.value.includes(id))
            if(filtered.length > 0) {
                updateSelect([...selected.value, ...filtered], filtered[filtered.length - 1])
            }else if(effectedImageIds.length > 0) {
                const final = selected.value.filter(i => !effectedImageIds.includes(i))
                updateSelect(final, final[final.length - 1])
            }
        }else{
            updateSelect(effectedImageIds, effectedImageIds[effectedImageIds.length - 1])
        }
    }
    
    const contextmenu = (e: echarts.ECElementEvent) => {
        const id = (e.data as GraphNodeItem).id!
        const imageId = parseInt(id.slice("IMAGE:".length))
        const image = data.value?.images.find(i => i.id === imageId)
        if(image !== undefined) menu(image)
    }

    const flushSelected = (added: number[], removed: number[]) => {
        for(const id of added) {
            const node = graphNodeByImageIds[id]
            if(node !== undefined) {
                if(node.itemStyle === undefined) node.itemStyle = {}
                node.itemStyle.shadowColor = "#1468cc"
                node.itemStyle.shadowBlur = 10
            }
        }

        for(const id of removed) {
            const node = graphNodeByImageIds[id]
            if(node !== undefined && node.itemStyle !== undefined) {
                node.itemStyle.shadowColor = undefined
                node.itemStyle.shadowBlur = undefined
            }
        }
    }

    const graphNodes: GraphNodeItem[] = []
    const graphLinks: GraphLinkItem[] = []
    const graphNodeTooltips: Record<string, string> = {}
    const graphLinkTooltips: Record<string, string> = {}
    const graphNodeReflections: Record<string, FindSimilarResultDetailImage | SimilarityRelationCoverage> = {}
    const graphNodeByImageIds: Record<number, GraphNodeItem> = {}

    let chartInstance: echarts.EChartsType | null = null

    watch(data, data => {
        if(data == null) return
        const { images, coverages, edges } = data

        graphNodes.splice(0, graphNodes.length)
        graphLinks.splice(0, graphLinks.length)

        for(const image of images) {
            const id = `IMAGE:${image.id}`
            const name = `图像:${image.id}`
            const node = {id, name, category: "图像", symbol: `image://${assetsUrl(image.filePath.sample)}`}
            graphNodes.push(node)
            graphNodeTooltips[id] = name
            graphNodeReflections[id] = image
            graphNodeByImageIds[image.id] = node
        }
        const imageToCoverages: Record<number, SimilarityRelationCoverage> = {}
        for(const coverage of coverages) {
            if(coverage.info.type === "BOOK") {
                const id = `BOOK:${coverage.info.bookId}`
                const name = `画集:${coverage.info.bookId}`
                
                graphNodes.push({id, name, category: "画集", symbol: "circle", itemStyle: {color: "grey"}})
                graphNodeTooltips[id] = `画集:${coverage.info.bookId}<br/>有多个图像已通过此节点关联。`
                graphNodeReflections[id] = coverage

                graphLinks.push(...coverage.imageIds.map(imageId => ({id: `${id} to IMAGE:${imageId}`, source: id, target: `IMAGE:${imageId}`, lineStyle: {color: "grey", type: "dashed"} as const})))
                coverage.imageIds.forEach(imageId => graphLinkTooltips[`${id} to IMAGE:${imageId}`] = `图像:${imageId}<br/>------<br/>已关联的${name}`)
            }else if(coverage.info.type === "COLLECTION") {
                const id = `COLLECTION:${coverage.info.collectionId}`
                const name = `集合:${coverage.info.collectionId}`
                
                graphNodes.push({id, name, category: "集合", symbol: "circle", itemStyle: {color: "grey"}})
                graphNodeTooltips[id] = `集合:${coverage.info.collectionId}<br/>有多个图像已通过此节点关联。`
                graphNodeReflections[id] = coverage
                
                graphLinks.push(...coverage.imageIds.map(imageId => ({id: `${id} to IMAGE:${imageId}`, source: id, target: `IMAGE:${imageId}`, lineStyle: {color: "grey", type: "dashed"} as const})))
                coverage.imageIds.forEach(imageId => graphLinkTooltips[`${id} to IMAGE:${imageId}`] = `图像:${imageId}<br/>------<br/>已关联的${name}`)
            }else if(coverage.info.type === "SOURCE_BOOK") {
                const id = `SOURCE_BOOK:${coverage.info.site}:${coverage.info.sourceBookCode}`
                const name = `来源集合:${coverage.info.site}-${coverage.info.sourceBookCode}`
                
                graphNodes.push({id, name, category: "来源集合", symbol: "circle", itemStyle: {color: coverage.ignored ? "grey" : "blue"}})
                graphNodeTooltips[id] = `${coverage.ignored ? "(已标记忽略)" : ""}来源集合:${coverage.info.site}-${coverage.info.sourceBookCode}<br/><span class="is-font-size-small">有多个图像通过此节点产生了相关关系。</span>`
                graphNodeReflections[id] = coverage
                
                graphLinks.push(...coverage.imageIds.map(imageId => ({id: `${id} to IMAGE:${imageId}`, source: id, target: `IMAGE:${imageId}`, lineStyle: {color: coverage.ignored ? "grey" : "blue"} as const})))
                coverage.imageIds.forEach(imageId => graphLinkTooltips[`${id} to IMAGE:${imageId}`] = `图像:${imageId}<br/>------<br/>${coverage.ignored ? "已标记忽略" : "相关"}的${name}`)
            }else if(coverage.info.type === "SOURCE_IDENTITY_SIMILAR") {
                const id = `SOURCE_IDENTITY_SIMILAR:${coverage.info.site}:${coverage.info.sourceId}`
                const name = `来源ID:${coverage.info.site}-${coverage.info.sourceId}`
                
                graphNodes.push({id, name, category: "来源ID", symbol: "circle", itemStyle: {color: coverage.ignored ? "grey" : "blue"}})
                graphNodeTooltips[id] = `${coverage.ignored ? "(已标记忽略)" : ""}来源ID:${coverage.info.site}-${coverage.info.sourceId}<br/><span class="is-font-size-small">有多个图像通过此节点产生了相关关系。</span>`
                graphNodeReflections[id] = coverage
                
                graphLinks.push(...coverage.imageIds.map(imageId => ({id: `${id} to IMAGE:${imageId}`, source: id, target: `IMAGE:${imageId}`, lineStyle: {color: coverage.ignored ? "grey" : "blue"} as const})))
                coverage.imageIds.forEach(imageId => graphLinkTooltips[`${id} to IMAGE:${imageId}`] = `图像:${imageId}<br/>------<br/>${coverage.ignored ? "已标记忽略" : "相关"}的${name}`)
            }
            coverage.imageIds.forEach(imageId => imageToCoverages[imageId] = coverage)
        }
        
        for(const edge of edges) {
            const id = `IMAGE:${edge.a} to IMAGE:${edge.b}`
            const color = imageToCoverages[edge.a]?.imageIds.some(imageId => imageId === edge.b) || edge.types.some(info => info.type === "ASSOCIATED" || info.type === "IGNORED") ? "grey"
                : edge.types.some(info => info.type === "SOURCE_IDENTITY_EQUAL") ? "orange"
                : edge.types.some(info => info.type === "SOURCE_RELATED") ? "blue"
                : edge.types.some(info => info.type === "HIGH_SIMILARITY") ? "green"
                : "purple"
            graphLinks.push({
                id,
                source: `IMAGE:${edge.a}`,
                target: `IMAGE:${edge.b}`,
                lineStyle: {color}
            })
            graphLinkTooltips[id] = `图像:${edge.a} & 图像:${edge.b}<br/>------<br/>` + edge.types.map(info => {
                if(info.type === "SOURCE_IDENTITY_EQUAL") {
                    return info.sourcePartName !== null ? `<b>相同的来源页名</b>: ${info.site}/${info.sourcePartName}` 
                        : info.sourcePart !== null ? `<b>相同的来源ID与页码</b>: ${info.site} ${info.sourceId} p${info.sourcePart}` 
                        : `<b>相同的来源ID</b>: ${info.site} ${info.sourceId}`
                }else if(info.type === "SOURCE_RELATED") {
                    return `<b>相关关系</b>: 来源关联项`
                }else if(info.type === "HIGH_SIMILARITY") {
                    return `<b>内容相似</b>: ${numbers.round2decimal(info.similarity * 100)}%`
                }else if(info.type === "ASSOCIATED") {
                    return `<span style="color:grey"><b>已关联</b>: 关联组引起的关联</span>`
                }else{
                    return `<b style="color:grey">已标记忽略</b>`
                }
            }).join("<br/>")
        }

        flushSelected(selected.value, [])

        chartInstance?.setOption(option)
    }, {immediate: true})

    watch(selected, (selected, old) => {
        const added = old !== undefined ? selected.filter(i => !old.includes(i)) : selected
        const removed = old !== undefined ? old.filter(i => !selected.includes(i)) : []
        
        flushSelected(added, removed)

        chartInstance?.setOption(option)
    })

    const option: echarts.EChartsOption = {
        tooltip: {
            type: "item",
            position: "right",
            formatter: tooltipFormatter
        },
        series: [
            {
                name: "相似项关系视图",
                type: "graph",
                layout: "force",
                data: graphNodes,
                links: graphLinks,
                categories: [{name: "图像"}, {name: "集合"}, {name: "画集"}, {name: "来源集合"}, {name: "来源ID"}],
                roam: true,
                draggable: true,
                legendHoverLink: true,
                cursor: "pointer",
                symbolSize: 20,
                zoom: 6,
                label: {
                    position: "top"
                },
                lineStyle: {
                    width: 5
                },
                emphasis: {
                    focus: "adjacency",
                    lineStyle: {
                        width: 10
                    }
                },
                force: {
                    repulsion: 30
                }
            }
        ]
    }

    const chartDom = ref<HTMLElement>()

    onMounted(() => {
        chartInstance = echarts.init(chartDom.value)
        chartInstance.setOption(option)
        chartInstance.on("click", click)
        chartInstance.on("contextmenu", {dataType: "node"}, contextmenu)
    })

    onBeforeUnmount(() => {
        if(chartInstance !== null) {
            chartInstance.off("click")
            chartInstance.off("contextmenu")
            chartInstance.clear()
            chartInstance.dispose()
            chartInstance = null
        }
    })

    onElementResize(chartDom, () => chartInstance?.resize())

    return {chartDom}
}

export function useDetailPane() {
    const preview = usePreviewService()
    const { listview, paginationData, selector, listviewController } = useFindSimilarDetailPanel()

    const storage = useLocalStorage<{tabType: "info" | "source" | "related", multiple: "action" | "resolve" | false}>("find-similar/detail/pane", () => ({tabType: "info", multiple: "resolve"}), true)

    const tabType = computed({
        get: () => selector.selected.value.length > 1 && storage.value.multiple ? storage.value.multiple : storage.value.tabType,
        set: (value) => {
            if(selector.selected.value.length > 1) {
                if(value !== "action" && value !== "resolve") {
                    storage.value = {tabType: value, multiple: false}   
                }else{
                    storage.value.multiple = value
                }
            }else if(value !== "action" && value !== "resolve") {
                storage.value.tabType = value
            }
        }
    })

    const path = computed(() => selector.lastSelected.value ?? selector.selected.value[selector.selected.value.length - 1] ?? null)

    const detail = useIllustDetailPaneId(path, listview, paginationData.proxy)

    useInterceptedKey(["Meta+Digit1", "Meta+Digit2", "Meta+Digit3", "Meta+Digit4", "Meta+Digit5"], e => {
        if(e.key === "Digit1") tabType.value = "info"
        else if(e.key === "Digit2") tabType.value = "related"
        else if(e.key === "Digit3") tabType.value = "source"
        else if(e.key === "Digit4") tabType.value = "action"
        else if(e.key === "Digit5") tabType.value = "resolve"
    })

    const openImagePreview = () => {
        preview.show({
            preview: "image", 
            type: "listview", 
            listview: listview,
            paginationData: paginationData.data,
            columnNum: listviewController.columnNum,
            viewMode: listviewController.viewMode,
            selected: selector.selected,
            lastSelected: selector.lastSelected,
            updateSelect: selector.update
        })
    }

    return {tabType, detail, selector, parent, openImagePreview}
}

function useIllustDetailPaneId(path: Ref<number | null>, listview: QueryListview<CommonIllust>, instance: QueryInstance<CommonIllust>) {
    const detail = ref<{id: number, type: "IMAGE" | "COLLECTION", filePath: FilePath} | null>(null)

    const fetch = useFetchHelper(client => client.illust.get)

    watch(path, async path => {
        if(path !== null) {
            const idx = instance.syncOperations.find(i => i.id === path)
            if(idx !== undefined) {
                const item = instance.syncOperations.retrieve(idx)!
                detail.value = {id: item.id, type: item.type ?? "IMAGE", filePath: item.filePath}
            }else{
                const res = await fetch(path)
                detail.value = res !== undefined ? {id: res.id, type: res.type ?? "IMAGE", filePath: res.filePath} : null
            }
        }else{
            detail.value = null
        }
    }, {immediate: true})

    useListeningEvent(listview.modifiedEvent, async e => {
        if(path.value !== null) {
            if(e.type === "FILTER_UPDATED" || e.type === "REFRESH") {
                const idx = instance.syncOperations.find(i => i.id === path.value)
                if(idx !== undefined) {
                    const item = instance.syncOperations.retrieve(idx)!
                    detail.value = {id: item.id, type: item.type ?? "IMAGE", filePath: item.filePath}
                }else{
                    const res = await fetch(path.value)
                    detail.value = res !== undefined ? {id: res.id, type: res.type ?? "IMAGE", filePath: res.filePath} : null
                }
            }else if(e.type === "MODIFY" && e.value.id === path.value) {
                detail.value = {id: e.value.id, type: e.value.type ?? "IMAGE", filePath: e.value.filePath}
            }else if(e.type === "REMOVE" && e.oldValue.id === path.value) {
                detail.value = null
            }
        }
    })

    return detail
}

export type GraphNodeItem = Exclude<Exclude<echarts.GraphSeriesOption["data"], undefined>[number], string | number | Date | (string | number | Date)[]>
export type GraphLinkItem = Exclude<echarts.GraphSeriesOption["edges"], undefined>[number]

//== deprecated ==

function useDetailPanelSelector(data: Ref<FindSimilarDetailResult | null>) {
    //find similar详情页的选择器采用双模式。
    //默认情况下，使用compare模式，选择A、B两个item，每次点击都切换选择A、B，以此方便对比；按下ALT键则是不切换选择；
    //使用CTRL/SHIFT的情况下，切换至multiple模式，选择多个item；按CTRL单选，按SHIFT连续选择。
    const selectMode = ref<"COMPARE" | "MULTIPLE">("COMPARE")
    const multiple = ref<{selected: FindSimilarResultImage[], lastSelected: FindSimilarResultImage | null}>({selected: [], lastSelected: null})
    const compare = ref<{a: FindSimilarResultImage | null, b: FindSimilarResultImage | null, nextUse: "a" | "b"}>({a: null, b: null, nextUse: "b"})
    
    watch(data, data => {
        //data发生变化时，根据内容重置至初始状态
        if(data !== null) {
            if(data.images.length >= 2) {
                selectMode.value = "COMPARE"
                multiple.value = {selected: [data.images[0], data.images[1]], lastSelected: data.images[1]}
                compare.value = {a: data.images[0], b: data.images[1], nextUse: "b"}
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
                        const lastSelectedIndex = data.value!.images.findIndex(i => i.id === lastSelected.id)
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
                        const lastSelectedIndex = data.value!.images.findIndex(i => i.id === multiple.value.lastSelected!.id)
                        const slice = lastSelectedIndex < 0 ? data.value!.images.slice(0, index) : lastSelectedIndex < index ? data.value!.images.slice(lastSelectedIndex + 1, index + 1) : data.value!.images.slice(index, lastSelectedIndex)
                        const filteredSlice = slice.filter(i => !multiple.value.selected.some(s => s.id === i.id))
                        multiple.value = {
                            selected: [...multiple.value.selected, ...filteredSlice],
                            lastSelected: item
                        }
                    }
                }else{
                    //按下CTRL，点选加入选择
                    const idx = multiple.value.selected.findIndex(i => i.id === item.id)
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
            }else if(item.id !== compare.value.a?.id && item.id !== compare.value.b?.id) {
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

function useDetailPanelResolves(path: Ref<number | null>, selector: ReturnType<typeof useDetailPanelSelector>) {
    /*
    const actions = ref<FindSimilarResultResolveAction[]>([])

    watch(path, () => actions.value = [])

    const addActionClone = (props: ImagePropsCloneForm["props"], merge: boolean, deleteFrom: boolean) => {
        if(selector.selectMode.value === "COMPARE") {
            if(selector.compare.value.a !== null && selector.compare.value.b !== null) {
                const existActionIdx = actions.value.findIndex(a => a.actionType === "MARK_IGNORED" && ((a.a === selector.compare.value.a?.id && a.b === selector.compare.value.b?.id) || (a.a === selector.compare.value.b?.id && a.b === selector.compare.value.a?.id)))
                if(existActionIdx >= 0) {
                    actions.value.splice(existActionIdx, 1, {actionType: "CLONE_IMAGE", a: selector.compare.value.a.id, b: selector.compare.value.b.id, config: {props, merge, deleteFrom}})
                }else{
                    actions.value.push({actionType: "CLONE_IMAGE", a: selector.compare.value.a.id, b: selector.compare.value.b.id, config: {props, merge, deleteFrom}})
                }
            }
        }
    }

    const addActionCollection = (collectionId: string | number) => {
        if(selector.selectMode.value === "COMPARE") {
            if(selector.compare.value.a !== null && !actions.value.some(a => a.actionType === "ADD_TO_COLLECTION" && a.config.collectionId === collectionId && a.a === selector.compare.value.a?.id)) {
                actions.value.push({actionType: "ADD_TO_COLLECTION", a: selector.compare.value.a.id, config: {collectionId}})
            }
            if(selector.compare.value.b !== null && !actions.value.some(a => a.actionType === "ADD_TO_COLLECTION" && a.config.collectionId === collectionId && a.a === selector.compare.value.b?.id)) {
                actions.value.push({actionType: "ADD_TO_COLLECTION", a: selector.compare.value.b.id, config: {collectionId}})
            }
        }else{
            for(const item of selector.multiple.value.selected) {
                if(!actions.value.some(a => a.actionType === "ADD_TO_COLLECTION" && a.config.collectionId === collectionId && a.a === item.id)) {
                    actions.value.push({actionType: "ADD_TO_COLLECTION", a: item.id, config: {collectionId}})
                }
            }
        }
    }

    const addActionBook = (bookId: number) => {
        if(selector.selectMode.value === "COMPARE") {
            if(selector.compare.value.a !== null && !actions.value.some(a => a.actionType === "ADD_TO_BOOK" && a.config.bookId === bookId && a.a === selector.compare.value.a?.id)) {
                actions.value.push({actionType: "ADD_TO_BOOK", a: selector.compare.value.a.id, config: {bookId}})
            }
            if(selector.compare.value.b !== null && !actions.value.some(a => a.actionType === "ADD_TO_BOOK" && a.config.bookId === bookId && a.a === selector.compare.value.b?.id)) {
                actions.value.push({actionType: "ADD_TO_BOOK", a: selector.compare.value.b.id, config: {bookId}})
            }
        }else{
            for(const item of selector.multiple.value.selected) {
                if(!actions.value.some(a => a.actionType === "ADD_TO_BOOK" && a.config.bookId === bookId && a.a === item.id)) {
                    actions.value.push({actionType: "ADD_TO_BOOK", a: item.id, config: {bookId}})
                }
            }
        }
    }    

    const addActionDelete = (goal: "A" | "B" | "A&B") => {
        if(selector.selectMode.value === "COMPARE") {
            if((goal === "A" || goal === "A&B") && selector.compare.value.a !== null && !actions.value.some(a => a.actionType === "DELETE" && a.a === selector.compare.value.a?.id)) {
                actions.value.push({actionType: "DELETE", a: selector.compare.value.a.id})
            }
            if((goal === "B" || goal === "A&B") && selector.compare.value.b !== null && !actions.value.some(a => a.actionType === "DELETE" && a.a === selector.compare.value.b?.id)) {
                actions.value.push({actionType: "DELETE", a: selector.compare.value.b.id})
            }
        }else{
            for(const item of selector.multiple.value.selected) {
                if(!actions.value.some(a => a.actionType === "DELETE" && a.a === item.id)) {
                    actions.value.push({actionType: "DELETE", a: item.id})
                }
            }
        }
    }

    const addActionIgnore = () => {
        if(selector.selectMode.value === "COMPARE") {
            if(selector.compare.value.a !== null && selector.compare.value.b !== null && !actions.value.some(a => a.actionType === "MARK_IGNORED" && ((a.a === selector.compare.value.a?.id && a.b === selector.compare.value.b?.id) || (a.a === selector.compare.value.b?.id && a.b === selector.compare.value.a?.id)))) {
                actions.value.push({actionType: "MARK_IGNORED", a: selector.compare.value.a.id, b: selector.compare.value.b.id})
            }
        }else{
            for(const [a, b] of arrays.windowed(selector.multiple.value.selected, 2)) {
                if(!actions.value.some(x => x.actionType === "MARK_IGNORED" && ((x.a === a.id && x.b === b.id) || (x.a === b.id && x.b === a.id)))) {
                    actions.value.push({actionType: "MARK_IGNORED", a: a.id, b: b.id})
                }
            }
        }
    }

    return {actions, addActionClone, addActionCollection, addActionBook, addActionIgnore, addActionDelete}
    */
}

function useDetailPanelRelationDisplay(data: Ref<FindSimilarDetailResult | null>, resolves: ReturnType<typeof useDetailPanelResolves>, selector: ReturnType<typeof useDetailPanelSelector>) {
    /*
    type EditedRelation
        = {type: "CLONE_IMAGE", direction: "A to B" | "B to A", props: ImagePropsCloneForm["props"], merge: boolean, deleteFrom: boolean}
        | {type: "ADD_TO_COLLECTION", goal: "A" | "B", collectionId: string | number}
        | {type: "ADD_TO_BOOK", goal: "A" | "B", bookId: number}
        | {type: "DELETE", goal: "A" | "B"}
        | {type: "MARK_IGNORED"}

    const existedRelations = ref<FindSimilarResultRelation[]>([])
    const editedRelations = ref<EditedRelation[]>([])

    function refreshExistedRelationsByCompare() {
        const { a, b } = selector.compare.value
        if(a !== null && b !== null && data.value?.relations?.length) {
            const newRelations: FindSimilarResultRelation[] = []
            for(const r of data.value.relations) {
                if((r.a === a.id && r.b === b.id) || (r.a === b.id && r.b === a.id)) {
                    newRelations.push(r)
                }
            }
            existedRelations.value = newRelations
        }else{
            existedRelations.value = []
        }
    }

    function refreshEditedRelationsByCompare() {
        const { a, b } = selector.compare.value
        if(a !== null && b !== null && resolves.actions.value.length) {
            const newRelations: EditedRelation[] = []
            for(const action of resolves.actions.value) {
                if(action.actionType === "CLONE_IMAGE") {
                    if(action.a === a.id && action.b === b.id) {
                        newRelations.push({type: "CLONE_IMAGE", direction: "A to B", props: action.config.props, merge: action.config.merge ?? false, deleteFrom: action.config.deleteFrom ?? false})    
                    }else if(action.a === b.id && action.b === a.id) {
                        newRelations.push({type: "CLONE_IMAGE", direction: "B to A", props: action.config.props, merge: action.config.merge ?? false, deleteFrom: action.config.deleteFrom ?? false})    
                    }
                }else if(action.actionType === "ADD_TO_COLLECTION") {
                    if(action.a === a.id) {
                        newRelations.push({type: "ADD_TO_COLLECTION", goal: "A", collectionId: action.config.collectionId})
                    }else if(action.a === b.id) {
                        newRelations.push({type: "ADD_TO_COLLECTION", goal: "B", collectionId: action.config.collectionId})
                    }
                }else if(action.actionType === "ADD_TO_BOOK") {
                    if(action.a === a.id) {
                        newRelations.push({type: "ADD_TO_BOOK", goal: "A", bookId: action.config.bookId})
                    }else if(action.a === b.id) {
                        newRelations.push({type: "ADD_TO_BOOK", goal: "B", bookId: action.config.bookId})
                    }
                }else if(action.actionType === "MARK_IGNORED") {
                    if((action.a === a.id && action.b === b.id) || (action.a === b.id && action.b === a.id)) {
                        newRelations.push({type: "MARK_IGNORED"})
                    }
                }else if(action.actionType === "DELETE") {
                    if(action.a === a.id) {
                        newRelations.push({type: "DELETE", goal: "A"})
                    }else if(action.a === b.id) {
                        newRelations.push({type: "DELETE", goal: "B"})
                    }
                }
            }
            editedRelations.value = newRelations
        }else{
            editedRelations.value = []
        }
    }

    function refreshEditedRelationsByMultiple() {
        const { selected } = selector.multiple.value
        if(selected.length && resolves.actions.value.length) {

        }else{
            editedRelations.value = []
        }
    }

    watch(selector.compare, () => {
        //compare模式下compare变化时，重刷所有relations
        if(selector.selectMode.value === "COMPARE") {
            refreshExistedRelationsByCompare()
            refreshEditedRelationsByCompare()
        }
    })

    watch(selector.multiple, () => {
        //multiple模式下multiple变化时，重刷所有relations
        if(selector.selectMode.value === "MULTIPLE") {
            refreshEditedRelationsByMultiple()
            existedRelations.value = []
        }
    })

    watch(data, () => {
        //data变化时，按照模式重刷existed relations
        if(selector.selectMode.value === "COMPARE") {
            refreshExistedRelationsByCompare()
        }
    })

    watch(resolves.actions, () => {
        //actions变化时，按照模式重刷edited relations
        if(selector.selectMode.value === "COMPARE") {
            refreshEditedRelationsByCompare()
        }else{
            refreshEditedRelationsByMultiple()
        }
    }, {deep: true})

    return {existedRelations, editedRelations}

     */
}

function resultCompare(a: FindSimilarResultImage, b: FindSimilarResultImage): number {
    return a.id !== b.id ? (a.id < b.id ? -1 : 1) : 0
}

export function useFindSimilarCompareData(id: Ref<number | null>) {

    const { data } = useFetchEndpoint({
        path: id,
        get: client => async path => {
            const metadata = await client.illust.image.get(path)
            if(!metadata.ok) return metadata

            const relatedItems = await client.illust.image.relatedItems.get(path, {limit: 9})
            if(!relatedItems.ok) return relatedItems

            const sourceData = await client.illust.image.sourceData.get(path)
            if(!sourceData.ok) return sourceData

            return {
                ok: true,
                status: 200,
                data: <FindSimilarCompareData>{
                    filePath: metadata.data.filePath.thumbnail,
                    metadata: {
                        id: metadata.data.id,
                        file: null,
                        extension: metadata.data.extension,
                        size: metadata.data.size,
                        resolutionWidth: metadata.data.resolutionWidth,
                        resolutionHeight: metadata.data.resolutionHeight,
                        videoDuration: metadata.data.videoDuration,
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
                    sourceData: sourceData.data.source,
                    relatedItems: {
                        collection: relatedItems.data.collection?.id,
                        books: relatedItems.data.books,
                        folders: relatedItems.data.folders
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
    filePath: string | null
    metadata: {
        id: number | null
        file: string | null
        extension: string
        size: number
        resolutionWidth: number
        resolutionHeight: number
        videoDuration: number
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
    sourceData: SourceDataPath | null,
    relatedItems: {
        collection: number | string | null,
        books: SimpleBook[],
        folders: SimpleFolder[]
    }
}
