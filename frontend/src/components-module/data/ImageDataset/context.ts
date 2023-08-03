import { computed, ref, Ref } from "vue"
import { IllustType, Tagme } from "@/functions/http-client/api/illust"
import { PaginationData, QueryInstance } from "@/functions/fetch"
import { useVirtualViewNavigation } from "@/components/data"
import { useToast } from "@/modules/toast"
import { useInterceptedKey } from "@/modules/keyboard"
import { TypeDefinition, useDraggable, useDroppable } from "@/modules/drag"
import { installation } from "@/utils/reactivity"
import { LocalDateTime } from "@/utils/datetime"
import { FilePath } from "@/functions/http-client/api/all"

const SELECTED_MAX = 200

export interface SuitableIllust {
    id: number
    filePath: FilePath
    favorite: boolean
    orderTime: LocalDateTime
    type?: IllustType
    childrenCount?: number | null
    tagme: Tagme[]
    score: number | null
    sourceSite: string | null
    sourceId: number | null
    sourcePart: number | null
}

interface DatasetContextOptions {
    queryInstance: QueryInstance<unknown> | undefined
    data: Ref<PaginationData<unknown>>
    keyOf(item: unknown): number
    selected: Ref<number[]>
    lastSelected: Ref<number | null>
    columnNum: Ref<number | undefined>
    draggable: Ref<boolean>
    droppable: Ref<boolean>
    dragAndDropType: keyof TypeDefinition
    dataUpdate(offset: number, limit: number): void
    select(selected: number[], lastSelected: number | null): void
    rightClick(i: unknown): void
    dblClick(id: number, shift: boolean): void
    enterClick(id: number): void
    dropData(insertIndex: number | null, images: TypeDefinition[keyof TypeDefinition], mode: "ADD" | "MOVE"): void
}

export interface Selector {
    select(index: number, illustId: number): void
    appendSelect(index: number, illustId: number): void
    shiftSelect(index: number, illustId: number): Promise<void>
    moveSelect(arrow: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight", shift: boolean): Promise<void>
    selected: Ref<number[]>
    lastSelected: Ref<number | null>
}

interface SelectorOptions<T> {
    queryInstance: QueryInstance<T> | undefined
    data: Ref<PaginationData<T>>
    selected: Ref<number[]>
    lastSelected: Ref<number | null>
    columnNum: Ref<number | undefined>
    keyOf: (item: T) => number
    select(selected: number[], lastSelected: number | null): void
}

export const [installDatasetContext, useDatasetContext] = installation(function (options: DatasetContextOptions) {
    const draggingFromLocal = ref(false)

    const selector = useSelector({
        queryInstance: options.queryInstance,
        data: options.data,
        selected: options.selected,
        lastSelected: options.lastSelected,
        columnNum: options.columnNum,
        keyOf: options.keyOf,
        select: options.select
    })

    const summaryDropEvents = useSummaryDropEvents({
        draggingFromLocal,
        droppable: options.droppable,
        byType: options.dragAndDropType,
        onDrop: options.dropData
    })

    useKeyboardEvents(selector, options.enterClick)

    return {
        data: options.data,
        queryInstance: options.queryInstance,
        keyOf: options.keyOf,
        dataUpdate: options.dataUpdate,
        summaryDropEvents,
        selector,
        drag: {draggable: options.draggable, droppable: options.droppable, draggingFromLocal, dropData: options.dropData, byType: options.dragAndDropType},
        dblClick: options.dblClick,
        rightClick: options.rightClick
    }
})

function useSelector<T>(options: SelectorOptions<T>): Selector {
    const { toast } = useToast()
    const virtualViewNavigation = useVirtualViewNavigation()
    const { selected, lastSelected, queryInstance, data, columnNum, select: onSelect, keyOf } = options

    const select = (index: number, illustId: number) => {
        // 单击一个项时，只选择此项
        onSelect([illustId], illustId)
    }

    const appendSelect = (index: number, illustId: number) => {
        // 按住CTRL/CMD单击一个项时，如果没有选择此项，则将此项加入选择列表；否则将此项从选择列表移除
        const find = selected.value.findIndex(i => i === illustId)
        if(find >= 0) {
            onSelect([...selected.value.slice(0, find), ...selected.value.slice(find + 1)], null)
        }else{
            if(selected.value.length + 1 > SELECTED_MAX) {
                toast("选择上限", "warning", `选择的数量超过上限: 最多可选择${SELECTED_MAX}项。`)
                return
            }
            onSelect([...selected.value, illustId], illustId)
        }
    }

    const shiftSelect = async (index: number, illustId: number) => {
        // 按住SHIFT单击一个项时，
        // - 如果没有last selected(等价于没有选择项)，则选择此项；
        // - 如果last selected不是自己，那么将从自己到last selected之间的所有项加入选择列表；否则无动作
        if(lastSelected.value === null) {
            onSelect([illustId], illustId)
        }else if(lastSelected.value !== illustId) {
            if(queryInstance !== undefined) {
                const result = await getShiftSelectItems(queryInstance, illustId, lastSelected.value)
                if(result === null) {
                    toast("选择失败", "warning", "内部错误: 无法正确获取选择项。")
                    return
                }
                const ret: number[] = []
                for(const id of selected.value) {
                    if(!result.includes(id)) {
                        ret.push(id)
                    }
                }
                ret.push(...result)

                if(ret.length > SELECTED_MAX) {
                    toast("选择上限", "warning", `选择的数量超过上限: 最多可选择${SELECTED_MAX}项。`)
                    return
                }
                onSelect(ret, illustId)
            }
        }
    }

    const moveSelect = async (arrow: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight", shift: boolean) => {
        if(queryInstance !== undefined) {
            if(lastSelected.value === null) {
                //在未选择任何选项时，根据scrollView得知当前显示范围内的上下界，并作为选择项
                const index = arrow === "ArrowLeft" || arrow === "ArrowUp" ? (virtualViewNavigation.state.itemOffset + virtualViewNavigation.state.itemLimit - 1) : virtualViewNavigation.state.itemOffset
                const illustId = await getOffsetSelectItem(queryInstance, index)
                if(illustId !== null) {
                    onSelect([illustId], illustId)
                    virtualViewNavigation.navigateTo(index)
                }
            }else{
                const offset = getMoveOffset(arrow)
                const result = await getArrowSelectItem(queryInstance, lastSelected.value, offset)
                if (result !== null) {
                    if(shift) {
                        await shiftSelect(result.index, result.illustId)
                    }else{
                        onSelect([result.illustId], result.illustId)
                        virtualViewNavigation.navigateTo(result.index)
                    }
                }
            }
        }
    }

    const getMoveOffset = (arrow: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight") => {
        if(columnNum.value === undefined) {
            return arrow === "ArrowLeft" || arrow === "ArrowUp" ? -1 : 1
        }else{
            return arrow === "ArrowLeft" ? -1 : arrow === "ArrowRight" ? 1 : arrow === "ArrowUp" ? -columnNum.value : columnNum.value
        }
    }

    async function getShiftSelectItems(queryEndpoint: QueryInstance<T>, selectId: number, lastSelectId: number) {
        const priorityRange: [number, number] = [data.value.metrics.offset, data.value.metrics.offset + data.value.metrics.limit]
        const index1 = queryEndpoint.syncOperations.find(i => keyOf(i) === selectId, priorityRange)
        const index2 = queryEndpoint.syncOperations.find(i => keyOf(i) === lastSelectId, priorityRange)
        if(index1 === undefined || index2 === undefined) {
            return null
        }
        if(index1 <= index2) {
            return (await queryEndpoint.queryRange(index1, index2 - index1 + 1)).map(keyOf)
        }else{
            return (await queryEndpoint.queryRange(index2, index1 - index2 + 1)).map(keyOf)
        }
    }

    async function getArrowSelectItem(queryEndpoint: QueryInstance<T>, lastSelectId: number, offset: number) {
        const priorityRange: [number, number] = [data.value.metrics.offset, data.value.metrics.offset + data.value.metrics.limit]
        const lastIndex = queryEndpoint.syncOperations.find(i => keyOf(i) === lastSelectId, priorityRange)
        if(lastIndex === undefined) return null
        const index = lastIndex + offset
        const count = await queryEndpoint.count()
        if(index < 0 || (count !== null && index >= count)) return null
        const res = await queryEndpoint.queryOne(index)
        return res === null ? null : {illustId: keyOf(res), index}
    }

    async function getOffsetSelectItem(queryEndpoint: QueryInstance<T>, index: number) {
        const res = await queryEndpoint.queryOne(index)
        return res !== null ? keyOf(res) : null
    }

    return {select, appendSelect, shiftSelect, moveSelect, lastSelected, selected}
}

function useKeyboardEvents({ moveSelect, lastSelected }: Selector, enter: (illustId: number) => void) {
    useInterceptedKey(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter"], e => {
        if(e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
            moveSelect(e.key, e.shiftKey).finally()
        }else if(e.key === "Enter") {
            if(lastSelected.value !== null) {
                enter(lastSelected.value)
            }
        }
    })
}

function useSummaryDropEvents<T extends keyof TypeDefinition>(options: {
    droppable: Ref<boolean> | undefined
    draggingFromLocal: Ref<boolean>
    byType: T
    onDrop?(insertIndex: number | null, illusts: TypeDefinition[T], mode: "ADD" | "MOVE"): void
}) {
    const { droppable, draggingFromLocal, byType, onDrop } = options
    if(droppable !== undefined) {
        const { dragover: _, ...dropEvents } = useDroppable(byType, illusts => {
            if(droppable.value) {
                onDrop!(null, illusts, draggingFromLocal.value ? "MOVE" : "ADD")
            }
        })

        const onDragstart = () => draggingFromLocal.value = true
        const onDragend = () => draggingFromLocal.value = false

        return {...dropEvents, onDragstart, onDragend}
    }else{
        return null
    }
}

export function useDragEvents<T extends keyof TypeDefinition, DATA>(options: {
    draggable: boolean
    selected: Ref<number[]>
    byType: T
    queryInstance: QueryInstance<DATA> | undefined
    keyOf: (item: DATA) => number
    dataRef(): Ref<DATA>
    dataMap(item: DATA[]): TypeDefinition[T]
}) {
    const { draggable, queryInstance, selected, byType, keyOf, dataMap, dataRef } = options

    if(draggable && queryInstance !== undefined) {
        const data = dataRef()
        const dragEvents = useDraggable(byType, () => {
            //拖曳行为：与context的复数选择行为一致。当拖曳项是选择项时，拖曳全部选择项；不是时，仅拖曳拖曳项。
            if(selected.value.includes(keyOf(data.value))) {
                const d = selected.value.map(illustId => {
                    if(illustId !== keyOf(data.value)) {
                        const index = queryInstance.syncOperations.find(i => keyOf(i) === illustId)
                        if(index !== undefined) {
                            return queryInstance.syncOperations.retrieve(index)!
                        }else{
                            return null
                        }
                    }else{
                        return data.value
                    }
                }).filter(i => i !== null) as DATA[]
                return dataMap(d)
            }else{
                return dataMap([data.value])
            }
        })
        return {...dragEvents, draggable: true}
    }else{
        return {}
    }
}

export function useDropEvents<T extends keyof TypeDefinition>(options: {
    droppable: Ref<boolean>
    draggingFromLocal: Ref<boolean>
    byType: T
    indexRef(): Ref<number>
    onDrop?(insertIndex: number | null, illusts: TypeDefinition[T], mode: "ADD" | "MOVE"): void
}) {
    const { droppable, draggingFromLocal, byType, onDrop, indexRef } = options

    const index = indexRef()

    const { dragover: leftDragover, ...leftDropEvents } = useDroppable(byType, illusts => {
        if(droppable.value) {
            onDrop!(index.value, illusts, draggingFromLocal.value ? "MOVE" : "ADD")
        }
    }, {stopPropagation: true})
    const { dragover: rightDragover, ...rightDropEvents } = useDroppable(byType, illusts => {
        if(droppable.value) {
            onDrop!(index.value + 1, illusts, draggingFromLocal.value ? "MOVE" : "ADD")
        }
    }, {stopPropagation: true})
    const isLeftDragover = computed(() => leftDragover.value && droppable.value)
    const isRightDragover = computed(() => rightDragover.value && droppable.value)

    return {isLeftDragover, isRightDragover, leftDropEvents, rightDropEvents}
}
