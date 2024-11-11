import * as echarts from "echarts/core"
import { GraphChart, GraphSeriesOption } from "echarts/charts"
import { CanvasRenderer } from "echarts/renderers"
import { TooltipComponent, TooltipComponentOption } from "echarts/components"
import { computed, onBeforeUnmount, onMounted, ref, Ref, shallowRef, watch } from "vue"
import { installEmbedPreviewService, usePreviewService } from "@/components-module/preview"
import { useDialogService } from "@/components-module/dialog"
import { QueryListview, useFetchEndpoint, useFetchHelper, usePaginationDataView, usePathFetchHelper, usePostFetchHelper, usePostPathFetchHelper, useQueryListview } from "@/functions/fetch"
import { FindSimilarDetailResult, FindSimilarResult, FindSimilarResultDetailImage, FindSimilarResultResolveAction, FindSimilarResultResolveForm, QuickFindResult, SimilarityRelationCoverage } from "@/functions/http-client/api/find-similar"
import { FilePath } from "@/functions/http-client/api/all"
import { CommonIllust } from "@/functions/http-client/api/illust"
import { SimpleBook } from "@/functions/http-client/api/book"
import { flatResponse } from "@/functions/http-client"
import { platform } from "@/functions/ipc-client"
import { useAssets, useLocalStorage } from "@/functions/app"
import { useBrowserTabs, useDocumentTitle, usePath, useTabRoute } from "@/modules/browser"
import { useMessageBox } from "@/modules/message-box"
import { useInterceptedKey } from "@/modules/keyboard"
import { useListViewContext } from "@/services/base/list-view-context"
import { IllustViewController, useIllustViewController } from "@/services/base/view-controller"
import { SelectedState, useSelectedState } from "@/services/base/selected-state"
import { useSelectedPaneState } from "@/services/base/selected-pane-state"
import { installIllustListviewContext, useImageDatasetOperators } from "@/services/common/illust"
import { useSettingSite } from "@/services/setting"
import { installation, toRef } from "@/utils/reactivity"
import { arrays, numbers } from "@/utils/primitives"
import { useListeningEvent } from "@/utils/emitter"
import { onElementResize } from "@/utils/sensors"
import { LocalDate } from "@/utils/datetime"

export function useFindSimilarContext() {
    const router = useTabRoute()

    const listview = useListView()

    useSettingSite()

    const openDetailView = (id: number) => router.routePush({routeName: "FindSimilarDetail", path: id})

    return {listview, openDetailView}
}

function useListView() {
    return useListViewContext({
        request: client => (offset, limit) => client.findSimilar.result.list({offset, limit}),
        keyOf: item => item.id,
        eventFilter: {
            filter: ["entity/find-similar-result/created", "entity/find-similar-result/updated", "entity/find-similar-result/deleted"],
            operation({ event, refresh, updateKey, removeKey }) {
                if(event.eventType === "entity/find-similar-result/created" && event.count > 0) {
                    refresh()
                }else if(event.eventType === "entity/find-similar-result/updated") {
                    updateKey(event.resultId)
                }else if(event.eventType === "entity/find-similar-result/deleted") {
                    removeKey(event.resultId)
                }
            },
            request: client => async items => flatResponse(await Promise.all(items.map(a => client.findSimilar.result.get(a.id))))
        }
    })
}

export function useFindSimilarItemContext(item: FindSimilarResult) {
    const fetchResolve = usePostPathFetchHelper(client => client.findSimilar.result.resolve)
    const fetchDelete = usePathFetchHelper(client => client.findSimilar.result.delete)

    const ignoreIt = () => fetchResolve(item.id, {actions: arrays.windowed(item.images, 2).map(([a, b]) => ({type: "MARK_IGNORED", from: a.id, to: b.id})), clear: true})

    const deleteIt = () => fetchDelete(item.id, undefined)

    return {ignoreIt, deleteIt}
}

export function useQuickFindContext() {
    const path = usePath<number>()
    const listview = useQuickFindListView(path)
    const selector = useSelectedState({queryListview: listview.listview, keyOf: item => item.id})
    const paneState = useSelectedPaneState("illust")
    const listviewController = useIllustViewController()
    const operators = useImageDatasetOperators({listview: listview.listview, paginationData: listview.paginationData, listviewController, selector, embedPreview: "auto"})
    const selfOperators = useQuickFindOperators()

    installIllustListviewContext({listview, selector, listviewController})

    useSettingSite()

    return {paneState, listview, selector, listviewController, operators: {...operators, ...selfOperators}}
}

function useQuickFindListView(path: Ref<number>) {
    const { data } = useFetchEndpoint({
        path,
        get: client => client.findSimilar.quickFind.get,
        eventFilter: c => event => {
            if(event.eventType === "app/quick-find/changed" && event.id === c.path) {
                return true
            }else if((event.eventType === "entity/illust/updated" || event.eventType === "entity/illust/deleted") && c.data?.result.some(i => i.id === event.illustId)) {
                return true
            }
            return false
        }
    })

    const listview = useListViewContext<CommonIllust, number, QuickFindResult | null>({
        request: () => async (offset, limit, _) => data.value !== null ? ({ok: true, status: 200, data: {total: data.value.result.length, result: data.value.result.slice(offset, offset + limit)} }) : ({ok: true, status: 200, data: {total: 0, result: []}}),
        keyOf: item => item.id
    })

    watch(data, listview.listview.refresh)

    return {...listview, data}
}

function useQuickFindOperators() {
    const router = useTabRoute()
    const browserTabs = useBrowserTabs()

    const fetch = useFetchHelper(client => client.illust.get)

    const openImageInPartition = async (currentImageId: number, at?: "NEW_TAB" | "NEW_WINDOW") => {
        const res = await fetch(currentImageId)
        if(res !== undefined) {
            if(at === "NEW_TAB") browserTabs.newTab({routeName: "PartitionDetail", path: res.partitionTime, initializer: {locateId: currentImageId}})
            else if(at === "NEW_WINDOW") browserTabs.newWindow({routeName: "PartitionDetail", path: res.partitionTime, initializer: {locateId: currentImageId}})
            else router.routePush({routeName: "PartitionDetail", path: res.partitionTime, initializer: {locateId: currentImageId}})
        }
    }

    return {openImageInPartition}
}

export const [installFindSimilarDetailPanel, useFindSimilarDetailPanel] = installation(function () {
    const router = useTabRoute()

    const path = usePath<number>()

    const storage = useLocalStorage<{viewMode: "grid" | "graph" | "compare"}>("find-similar/detail", () => ({viewMode: "graph"}), true)

    const viewMode = toRef(storage, "viewMode")

    const listviewController = useIllustViewController()

    const { data, setData: resolve, deleteData: clear } = useFetchEndpoint({
        path,
        get: client => client.findSimilar.result.get,
        update: client => client.findSimilar.result.resolve,
        delete: client => client.findSimilar.result.delete,
        eventFilter: c => event => ((event.eventType === "entity/find-similar-result/updated" || event.eventType === "entity/find-similar-result/deleted") && c.path === event.resultId) || (event.eventType === "entity/illust/updated" && event.illustType === "IMAGE" && event.listUpdated && !!c.data?.images?.some(i => i.id === event.illustId)),
        afterRetrieve(path, data) {
            if(path !== null && data === null) {
                router.routeClose()
            }
        }
    })

    const listview = useQueryListview({
        request: () => async (offset, limit) => ({ok: true, status: 200, data: {total: data.value?.images.length ?? 0, result: data.value?.images.slice(offset, offset + limit) ?? []}}),
        keyOf: item => item.id
    })

    watch(data, () => listview.refresh())

    const paginationData = usePaginationDataView({listview, bufferPercent: 0.2})

    const selector = useSelectedState({queryListview: listview, keyOf: item => item.id})

    const operators = useOperators(data, selector, listviewController, listview, resolve, clear)

    installIllustListviewContext({listview: {listview}, selector, listviewController})

    useDocumentTitle(() => viewMode.value === "graph" ? "相似关系图" : viewMode.value === "grid" ? "相似项列表" : "相似项对比")

    return {data, listview, paginationData, selector, listviewController, viewMode, operators}
})

function useOperators(data: Ref<FindSimilarDetailResult | null>, 
                      selector: SelectedState<number>, 
                      listviewController: IllustViewController, 
                      listview: QueryListview<FindSimilarResultDetailImage, number>,
                      resolve: (f: FindSimilarResultResolveForm) => Promise<boolean>, 
                      clear: () => Promise<boolean>) {
    const router = useTabRoute()
    const browserTabs = useBrowserTabs()
    const message = useMessageBox()
    const dialog = useDialogService()
    const preview = installEmbedPreviewService()
    const gridMode = shallowRef<"grid">("grid")

    const fetchStagingPostUpdate = usePostFetchHelper(client => client.stagingPost.update)
    const fetchIllustBatchUpdate = usePostFetchHelper(client => client.illust.batchUpdate)

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
            const set = new Set<number>()
            const ret: SimpleBook[] = []
            data.value.images.forEach(i => i.books.forEach(b => {
                if(!set.has(b.id)) {
                    set.add(b.id)
                    ret.push(b)
                }
            }))
            return ret.sort((a, b) => a.id - b.id)
        }
        return []
    })

    const getEffectedItems = (currentImageId?: number) => {
        return currentImageId === undefined || selector.selected.value.includes(currentImageId) ? selector.selected.value : [currentImageId]
    }

    const modifyFavorite = async (illust: CommonIllust, favorite: boolean) => {
        const items = getEffectedItems(illust.id)
        await fetchIllustBatchUpdate({target: items, favorite})
    }

    const addToStagingPost = async (illust: CommonIllust) => {
        const images = getEffectedItems(illust.id)
        await fetchStagingPostUpdate({action: "ADD", images})
    }

    const addToCollection = async (collectionId: number | "new", currentImageId?: number) => {
        const imageIds = getEffectedItems(currentImageId)
        const checkForm = await dialog.addIllust.checkExistsInCollection(imageIds, collectionId !== "new" ? collectionId : null, true)
        if(checkForm !== undefined) await resolve({actions: [{type: "ADD_TO_COLLECTION", imageIds, collectionId, specifyPartitionTime: checkForm.specifyPartitionTime}], clear: false})
    }

    const addToBook = async (bookId: number, currentImageId?: number) => {
        const imageIds = getEffectedItems(currentImageId)
        await resolve({actions: [{type: "ADD_TO_BOOK", imageIds, bookId}], clear: false})
    }

    const cloneImage = async (currentImageId?: number) => {
        const imageIds = getEffectedItems(currentImageId)
        if(imageIds.length !== 2) {
            message.showOkMessage("warn", "克隆图像属性需要两个选择项。", "请选择两个图像。")
        }else{
            const form = await dialog.cloneImage.getCloneProps({from: imageIds[0], to: imageIds[1]})
            if(form !== undefined) {
                await resolve({actions: [{type: "CLONE_IMAGE", ...form}], clear: false})
            }
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
        const res = await message.showCheckBoxMessage("warn", imageIds.length === 1 ? "确定要删除此项吗？" : `确定要删除${imageIds.length}个已选择项吗？`, "被删除的项将放入「已删除」归档。", [{key: "SHIFT", name: "彻底删除图像"}])
        if(res.ok) {
            await resolve({actions: [{type: "DELETE", imageIds, deleteCompletely: res.checks.includes("SHIFT")}], clear: false})
        }
    }

    const complete = async () => {
        if(data.value?.resolved || await message.showYesNoMessage("confirm", "相似关系并未完全解决。", "此时确认完成，将清除此相似项记录，且仍保留未解决的相似项关系。")) {
            await clear()
        }
    }

    const openPreviewBySpace = (illust?: CommonIllust) => {
        if(illust !== undefined) {
            //如果指定项已选中，那么将最后选中项重新指定为指定项；如果未选中，那么将单独选中此项
            if(selector.selected.value.includes(illust.id)) {
                selector.update(selector.selected.value, illust.id)
            }else{
                selector.update([illust.id], illust.id)
            }
        }
        if(selector.selected.value.length > 0) preview.show({
            preview: "image", 
            type: "listview", 
            listview: listview,
            columnNum: listviewController.columnNum,
            viewMode: gridMode,
            selected: selector.selected,
            selectedIndex: selector.selectedIndex,
            lastSelected: selector.lastSelected,
            updateSelect: selector.update
        })
    }

    const openImageInPartition = async (currentImageId: number, partitionTime: LocalDate, at?: "NEW_TAB" | "NEW_WINDOW") => {
        if(at === "NEW_TAB") browserTabs.newTab({routeName: "PartitionDetail", path: partitionTime, initializer: {locateId: currentImageId}})
        else if(at === "NEW_WINDOW") browserTabs.newWindow({routeName: "PartitionDetail", path: partitionTime, initializer: {locateId: currentImageId}})
        else router.routePush({routeName: "PartitionDetail", path: partitionTime, initializer: {locateId: currentImageId}})
    }

    return {allCollections, allBooks, modifyFavorite, addToStagingPost, addToCollection, addToBook, markIgnored, cloneImage, deleteItem, complete, openPreviewBySpace, openImageInPartition}
}

export function useGraphView({ menu }: {menu: (i: FindSimilarResultDetailImage) => void}) {
    const { data, selector: { selected, update: updateSelect } } = useFindSimilarDetailPanel()

    const { assetsUrl } = useAssets()

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
        
        const ctrl = (platform === "darwin" && e.event?.event.metaKey) || (platform !== "darwin" && e.event?.event.ctrlKey)
        const shift = e.event?.event.shiftKey
        const effectedImageIds = getEffectedImages()
        if(ctrl || shift) {
            const filtered = effectedImageIds.filter(id => !selected.value.includes(id))
            if(filtered.length > 0) {
                updateSelect([...selected.value, ...filtered], filtered[filtered.length - 1])
            }else if(ctrl && effectedImageIds.length > 0) {
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

    const option: EChartsOption = {
        tooltip: {
            type: "item",
            position: "right",
            formatter: params => {
                const p = params instanceof Array ? params[0] : params
                if(p.dataType === "node") {
                    const node = p.data as GraphNodeItem
                    return graphNodeTooltips[node.id!] ?? "unknown node tooltip"
                }else if(p.dataType === "edge") {
                    const link = p.data as GraphLinkItem
                    return graphLinkTooltips[link.id!] ?? "unknown edge tooltip"
                }
                return "unknown tooltip"
            }
        },
        series: [
            {
                name: "相似项关系视图",
                type: "graph",
                layout: "circular",
                data: graphNodes,
                links: graphLinks,
                categories: [{name: "图像"}, {name: "集合"}, {name: "画集"}, {name: "来源集合"}, {name: "来源ID"}],
                roam: true,
                draggable: true,
                legendHoverLink: true,
                cursor: "pointer",
                symbolSize: 50,
                label: {
                    position: "top"
                },
                lineStyle: {
                    width: 8
                },
                emphasis: {
                    focus: "adjacency",
                    lineStyle: {
                        width: 16
                    }
                }
            }
        ],
        animationDuration: 100
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
    const { data, listview, selector, listviewController, viewMode } = useFindSimilarDetailPanel()

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

    const detail = useIllustDetailPaneId(path, listview)

    useInterceptedKey(["Meta+Digit1", "Meta+Digit2", "Meta+Digit3", "Meta+Digit4", "Meta+Digit5"], e => {
        if(e.key === "Digit1") tabType.value = "info"
        else if(e.key === "Digit2") tabType.value = "related"
        else if(e.key === "Digit3") tabType.value = "source"
        else if(e.key === "Digit4") tabType.value = "action"
        else if(e.key === "Digit5") tabType.value = "resolve"
    })

    const openImagePreview = () => {
        if(data.value !== null && selector.selected.value.length > 0) {
            if(viewMode.value === "grid") {
                preview.show({
                    preview: "image", 
                    type: "listview", 
                    listview: listview,
                    columnNum: listviewController.columnNum,
                    viewMode: listviewController.viewMode,
                    selected: selector.selected,
                    selectedIndex: selector.selectedIndex,
                    lastSelected: selector.lastSelected,
                    updateSelect: selector.update
                })
            }else{
                const files = selector.selected.value.map(selectedId => data.value!.images.find(i => i.id === selectedId)?.filePath.original).filter(i => i !== null) as string[]
                const initIndex = selector.lastSelected.value !== null ? selector.selected.value.indexOf(selector.lastSelected.value) : undefined
                preview.show({preview: "image", type: "array", files, initIndex})
            }
        }
    }

    return {tabType, detail, selector, parent, openImagePreview}
}

function useIllustDetailPaneId(path: Ref<number | null>, listview: QueryListview<CommonIllust, number>) {
    const detail = ref<{id: number, type: "IMAGE" | "COLLECTION", filePath: FilePath} | null>(null)

    const fetch = useFetchHelper({
        request: client => client.illust.get, 
        handleErrorInRequest(e) {
            if(e.code !== "NOT_FOUND") {
                return e
            }
        }
    })

    watch(path, async path => {
        if(path !== null) {
            const idx = await listview.proxy.findByKey(path)
            if(idx !== undefined) {
                const item = listview.proxy.sync.retrieve(idx)!
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
                const idx = await listview.proxy.findByKey(path.value)
                if(idx !== undefined) {
                    const item = listview.proxy.sync.retrieve(idx)!
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

export function useDetailPaneTabResolve() {
    const { data, selector } = useFindSimilarDetailPanel()

    const existedRelations = computed(() => {
        if(data.value !== null) {
            if(selector.selected.value.length > 2) {
                return data.value.coverages.filter(coverage => selector.selected.value.every(s => coverage.imageIds.includes(s))).filter(c => !c.ignored).map(c => c.info)
            }else if(selector.selected.value.length === 2) {
                const [a, b] = selector.selected.value
                const filteredEdges = data.value.edges.filter(edge => (edge.a === a && edge.b === b) || (edge.a === b && edge.b === a)).map(edge => edge.types).flat(1)
                const filteredCoverages = data.value.coverages.filter(coverage => coverage.imageIds.includes(a) && coverage.imageIds.includes(b)).filter(c => !c.ignored).map(c => c.info)
                return [...filteredEdges, ...filteredCoverages]
            }
        }
        return []
    })

    return {existedRelations}
}

type EChartsOption = echarts.ComposeOption<GraphSeriesOption | TooltipComponentOption>
export type GraphNodeItem = Exclude<Exclude<GraphSeriesOption["data"], undefined>[number], string | number | Date | (string | number | Date)[]>
export type GraphLinkItem = Exclude<GraphSeriesOption["edges"], undefined>[number]

echarts.use([
    TooltipComponent,
    GraphChart,
    CanvasRenderer
])