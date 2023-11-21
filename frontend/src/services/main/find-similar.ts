import { computed, ref, Ref, watch } from "vue"
import { installVirtualViewNavigation } from "@/components/data"
import { useFetchEndpoint, usePaginationDataView, usePathFetchHelper, usePostPathFetchHelper, useQueryListview } from "@/functions/fetch"
import { flatResponse } from "@/functions/http-client"
import { FindSimilarDetailResult, FindSimilarResult, FindSimilarResultImage } from "@/functions/http-client/api/find-similar"
import { SourceDataPath } from "@/functions/http-client/api/all"
import { RelatedSimpleTag } from "@/functions/http-client/api/tag"
import { RelatedSimpleTopic } from "@/functions/http-client/api/topic"
import { RelatedSimpleAuthor } from "@/functions/http-client/api/author"
import { ImagePropsCloneForm, Tagme } from "@/functions/http-client/api/illust"
import { SimpleBook } from "@/functions/http-client/api/book"
import { SimpleFolder } from "@/functions/http-client/api/folder"
import { platform } from "@/functions/ipc-client"
import { useMessageBox } from "@/modules/message-box"
import { useDetailViewState } from "@/services/base/detail-view-state"
import { useListViewContext } from "@/services/base/list-view-context"
import { useSettingSite } from "@/services/setting"
import { installation, toRef } from "@/utils/reactivity"
import { LocalDate, LocalDateTime } from "@/utils/datetime"
import { arrays } from "@/utils/primitives"
import { useLocalStorage } from "@/functions/app"
import { useSelectedState } from "@/services/base/selected-state"
import { useIllustViewController } from "@/services/base/view-controller"
import { installIllustListviewContext } from "@/services/common/illust"

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
    const message = useMessageBox()
    const { paneState } = useFindSimilarContext()

    const storage = useLocalStorage<{viewMode: "grid" | "graph" | "compare"}>("find-similar/detail", () => ({viewMode: "graph"}), true)

    const viewMode = toRef(storage, "viewMode")

    const listviewController = useIllustViewController()

    const { data, setData: resolveIt, deleteData: deleteIt } = useFetchEndpoint({
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

    const paginationData = usePaginationDataView(listview)

    const selector = useSelectedState({queryListview: listview, keyOf: item => item.id})

    installIllustListviewContext({listview: {listview, paginationData}, selector, listviewController})

    const resolve = async () => {
        // if(resolves.actions.value.length > 0) {
            // await resolveIt({actions: resolves.actions.value})
        // }else if(await message.showYesNoMessage("prompt", "未添加任何操作", "继续操作将清除本条记录，且覆盖的关系不会有任何变化。确定要继续吗？")) {
        //     await deleteIt()
        // }
    }

    return {data, listview, paginationData, selector, listviewController, viewMode, resolve}
})

export function useGridList() {
    const { data, listview, paginationData, selector, listviewController } = useFindSimilarDetailPanel()

    return {listview, paginationData, selector, listviewController}
}

export function useGraphView() {
    const { data, listview, paginationData, selector, listviewController } = useFindSimilarDetailPanel()
    return {}
}

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
