import { computed, ref, Ref } from "vue"
import { PaginationData, QueryInstance, PaginationViewState } from "@/functions/fetch"
import { useToast } from "@/modules/toast"
import { useInterceptedKey } from "@/modules/keyboard"
import { TypeDefinition, useDraggable, useDroppable } from "@/modules/drag"
import { installation } from "@/utils/reactivity"

const SELECTED_MAX = 500

interface DatasetContextOptions {
    queryInstance: QueryInstance<unknown, unknown> | undefined
    data: Ref<PaginationData<unknown>>
    state: Ref<PaginationViewState | null>
    keyOf(item: unknown): number
    selected: Ref<number[]>
    selectedIndex: Ref<(number | undefined)[]>
    lastSelected: Ref<number | null>
    columnNum: Ref<number | undefined>
    draggable: Ref<boolean>
    droppable: Ref<boolean>
    dragAndDropType: keyof TypeDefinition
    updateState(offset: number, limit: number): void
    navigate(offset: number): void
    select(selected: number[], lastSelected: number | null): void
    rightClick(i: unknown): void
    dblClick(id: number, shift: boolean): void
    enterClick(id: number): void
    spaceClick(id: number): void
    dropData(insertIndex: number | null, images: TypeDefinition[keyof TypeDefinition], mode: "ADD" | "MOVE"): void
}

export interface Selector {
    select(index: number, illustId: number): void
    appendSelect(index: number, illustId: number): void
    shiftSelect(index: number, illustId: number): Promise<void>
    moveSelect(arrow: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight", shift: boolean): Promise<void>
    multiSelect(fromId: number, toId: number): void
    selected: Ref<number[]>
    selectedIndex: Ref<(number | undefined)[]>
    lastSelected: Ref<number | null>
}

interface SelectorOptions<T> {
    queryInstance: QueryInstance<T, number> | undefined
    data: Ref<PaginationData<T>>
    state: Ref<PaginationViewState | null>
    selected: Ref<number[]>
    selectedIndex: Ref<(number | undefined)[]>
    lastSelected: Ref<number | null>
    columnNum: Ref<number | undefined>
    keyOf: (item: T) => number
    navigate(offset: number): void
    select(selected: number[], lastSelected: number | null): void
}

export const [installDatasetContext, useDatasetContext] = installation(function (options: DatasetContextOptions) {
    const draggingFromLocal = ref(false)

    const selector = useSelector({
        queryInstance: options.queryInstance,
        data: options.data,
        state: options.state,
        selected: options.selected,
        selectedIndex: options.selectedIndex,
        lastSelected: options.lastSelected,
        columnNum: options.columnNum,
        keyOf: options.keyOf,
        select: options.select,
        navigate: options.navigate
    })

    const summaryDropEvents = useSummaryDropEvents({
        draggingFromLocal,
        droppable: options.droppable,
        byType: options.dragAndDropType,
        onDrop: options.dropData
    })

    useKeyboardEvents(selector, options.enterClick, options.spaceClick)

    return {
        data: options.data,
        state: options.state,
        queryInstance: options.queryInstance,
        keyOf: options.keyOf,
        updateState: options.updateState,
        summaryDropEvents,
        selector,
        drag: {draggable: options.draggable, droppable: options.droppable, draggingFromLocal, dropData: options.dropData, byType: options.dragAndDropType},
        dblClick: options.dblClick,
        rightClick: options.rightClick
    }
})

function useSelector<T>(options: SelectorOptions<T>): Selector {
    const { toast } = useToast()
    const { state, selected, selectedIndex, lastSelected, queryInstance, columnNum, select: onSelect, keyOf, navigate } = options

    const select = (_: number, illustId: number) => {
        // 单击一个项时，只选择此项
        onSelect([illustId], illustId)
    }

    const appendSelect = (_: number, illustId: number) => {
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

    const shiftSelect = async (_: number, illustId: number) => {
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

    const multiSelect = async (fromIllustId: number, toIllustId: number) => {
        //将from到to的连续illusts全部加入选择项
        if(fromIllustId !== toIllustId) {
            if(queryInstance !== undefined) {
                const result = await getShiftSelectItems(queryInstance, toIllustId, fromIllustId)
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
                onSelect(ret, toIllustId)
            }
        }
    }

    const moveSelect = async (arrow: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight", shift: boolean) => {
        if(queryInstance !== undefined) {
            if(lastSelected.value === null) {
                //在未选择任何选项时，根据scrollView得知当前显示范围内的上下界，并作为选择项
                const index = state.value !== null ? (arrow === "ArrowLeft" || arrow === "ArrowUp" ? (state.value.offset + state.value.limit - 1) : state.value.offset) : 0
                const illustId = await getOffsetSelectItem(queryInstance, index)
                if(illustId !== null) {
                    onSelect([illustId], illustId)
                    navigate(index)
                }
            }else{
                const offset = getMoveOffset(arrow)
                const result = await getArrowSelectItem(queryInstance, lastSelected.value, offset)
                if (result !== null) {
                    if(shift) {
                        await shiftSelect(result.index, result.illustId)
                    }else{
                        onSelect([result.illustId], result.illustId)
                        navigate(result.index)
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

    async function getShiftSelectItems(queryEndpoint: QueryInstance<T, number>, selectId: number, lastSelectId: number) {
        const index1 = await queryEndpoint.findByKey(selectId)
        const index2 = await queryEndpoint.findByKey(lastSelectId)
        if(index1 === undefined || index2 === undefined) {
            return null
        }
        if(index1 <= index2) {
            return (await queryEndpoint.queryRange(index1, index2 - index1 + 1)).map(keyOf)
        }else{
            return (await queryEndpoint.queryRange(index2, index1 - index2 + 1)).map(keyOf)
        }
    }

    async function getArrowSelectItem(queryEndpoint: QueryInstance<T, number>, lastSelectId: number, offset: number) {
        const lastIndex = await queryEndpoint.findByKey(lastSelectId)
        if(lastIndex === undefined) return null
        const index = lastIndex + offset
        const count = await queryEndpoint.count()
        if(index < 0 || (count !== null && index >= count)) return null
        const res = await queryEndpoint.queryOne(index)
        return res === null ? null : {illustId: keyOf(res), index}
    }

    async function getOffsetSelectItem(queryEndpoint: QueryInstance<T, number>, index: number) {
        const res = await queryEndpoint.queryOne(index)
        return res !== null ? keyOf(res) : null
    }

    return {select, appendSelect, shiftSelect, moveSelect, multiSelect, lastSelected, selected, selectedIndex}
}

function useKeyboardEvents({ moveSelect, lastSelected }: Selector, enter: (illustId: number) => void, space: (illustId: number) => void) {
    useInterceptedKey(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Enter", "Space"], e => {
        if(e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
            moveSelect(e.key, e.shiftKey).finally()
        }else if(e.key === "Enter") {
            if(lastSelected.value !== null) {
                enter(lastSelected.value)
            }
        }else if(e.key === "Space") {
            if(lastSelected.value !== null) {
                space(lastSelected.value)
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
    selectedIndex: Ref<(number | undefined)[]>
    byType: T
    queryInstance: QueryInstance<DATA, number> | undefined
    keyOf: (item: DATA) => number
    dataRef(): Ref<DATA>
    dataMap(item: DATA[]): TypeDefinition[T]
}) {
    const { draggable, queryInstance, selected, selectedIndex, byType, keyOf, dataMap, dataRef } = options

    if(draggable && queryInstance !== undefined) {
        const data = dataRef()
        const dragEvents = useDraggable(byType, () => {
            //拖曳行为：与context的复数选择行为一致。当拖曳项是选择项时，拖曳全部选择项；不是时，仅拖曳拖曳项。
            if(selected.value.includes(keyOf(data.value))) {
                const d = selectedIndex.value.filter(i => i !== undefined).map(i => queryInstance.sync.retrieve(i!)!)
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
    elseProcess?(dt: DataTransfer): void
}) {
    const { droppable, draggingFromLocal, byType, onDrop, indexRef } = options

    const index = indexRef()

    const { dragover: leftDragover, ...leftDropEvents } = useDroppable(byType, illusts => {
        if(droppable.value) {
            onDrop!(index.value, illusts, draggingFromLocal.value ? "MOVE" : "ADD")
        }
    }, {elseProcess: options.elseProcess})
    const { dragover: rightDragover, ...rightDropEvents } = useDroppable(byType, illusts => {
        if(droppable.value) {
            onDrop!(index.value + 1, illusts, draggingFromLocal.value ? "MOVE" : "ADD")
        }
    }, {elseProcess: options.elseProcess})
    const isLeftDragover = computed(() => leftDragover.value && droppable.value)
    const isRightDragover = computed(() => rightDragover.value && droppable.value)

    return {isLeftDragover, isRightDragover, leftDropEvents, rightDropEvents}
}

export function useCheckBoxEvents<DATA>(options: {selector: Selector, keyOf: (i: DATA) => number, dataRef: Ref<DATA>, indexRef: Ref<number>}) {

    const isMouseOver = ref(false)

    const onMouseenter = () => { isMouseOver.value = true }

    const onMouseleave = () => { isMouseOver.value = false }

    const onDragstart = (e: DragEvent) => {
        if(e.dataTransfer) {
            e.dataTransfer.setData("dateset-select-box", JSON.stringify({index: options.indexRef.value, key: options.keyOf(options.dataRef.value)}))
        }
        e.stopPropagation()
    }

    const onDragend = (e: DragEvent) => {
        if(e.dataTransfer) {
            e.dataTransfer.clearData("dateset-select-box")
        }
        e.stopPropagation()
    }

    const onClick = (e: MouseEvent) => {
        options.selector.appendSelect(options.indexRef.value, options.keyOf(options.dataRef.value))
        e.stopPropagation()
    }

    const onDblclick = (e: MouseEvent) => {
        e.stopPropagation()
    }

    const checkboxDrop = (dt: DataTransfer) => {
        const d = dt.getData("dateset-select-box")
        if(d) {
            const begin: {index: number, key: number} = JSON.parse(d)
            options.selector.multiSelect(begin.key, options.keyOf(options.dataRef.value))
        }
    }

    return {isMouseOver, checkboxDrop, onMouseenter, onMouseleave, onClick, onDblclick, onDragstart, onDragend, draggable: true}
}

export function isVideoExtension(extension: string): boolean {
    return extension === "mp4" || extension === "webm"
}