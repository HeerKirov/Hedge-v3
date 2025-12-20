import { ComponentPublicInstance, computed, nextTick, ref, Ref, toRaw, watch } from "vue"
import { useLocalStorage } from "@/functions/app"
import { FolderCreateForm, FolderTreeNode, FolderType, SimpleFolder } from "@/functions/http-client/api/folder"
import { useMessageBox } from "@/modules/message-box"
import { useDynamicPopupMenu } from "@/modules/popup-menu"
import { useDraggable, useDroppable } from "@/modules/drag"
import { useToast } from "@/modules/toast"
import { useInterceptedKey } from "@/modules/keyboard"
import { installation } from "@/utils/reactivity"
import { objects } from "@/utils/primitives"
import { sleep } from "@/utils/process"

const SELECTED_MAX = 100

interface FolderTreeContextOptions {
    data: Ref<FolderTreeNode[] | undefined>
    editPosition: Ref<EditPosition | undefined>
    selected: Ref<number[]>
    selectedIndex: Ref<(number | undefined)[]>
    lastSelected: Ref<number | null>
    editable: Ref<boolean | undefined>
    droppable: Ref<boolean | undefined>
    mode: Ref<"std" | "simple">
    emit: {
        updateEditPosition(position: EditPosition | undefined): void
        select(selected: number[], lastSelected: number | null): void
        updatePinned(folder: FolderTreeNode, pin: boolean): void
        enter(folder: FolderTreeNode, at: "newTab" | "newWindow" | undefined): void
        create(form: FolderCreateForm): void
        move(folderIds: number[], moveToParentId: number | null | undefined, moveToOrdinal: number | undefined): void
        rename(folderId: number, newTitle: string): void
        delete(folderIds: number[], parentId: number | null, ordinal: number): void
    }
}

export type EditPosition = {action: "create", parentId: number | null, ordinal: number, type?: FolderType}
    | {action: "edit", parentId: number | null, id: number}

export interface IndexedFolder {
    /**
     * 原始folder对象的引用。
     */
    folder: FolderTreeNode
    /**
     * folder的地址段。
     */
    address: {id: number, title: string}[]
    /**
     * 父级节点的id。
     */
    parentId: number | null
    /**
     * folder在其父节点下的顺位，从0开始。
     */
    ordinal: number
}

interface SelectorOptions {
    data: Ref<FolderTreeNode[] | undefined>
    indexedData: Ref<Record<number, IndexedFolder>>
    expandedState: ReturnType<typeof useExpandedState>
    selected: Ref<number[]>
    selectedIndex: Ref<(number | undefined)[]>
    lastSelected: Ref<number | null>
    navigate(offset: number): void
    select(selected: number[], lastSelected: number | null): void
}

export interface Selector {
    select(illustId: number): void
    appendSelect(illustId: number): void
    shiftSelect(illustId: number): Promise<void>
    moveSelect(arrow: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight", shift: boolean): Promise<void>
    selected: Ref<number[]>
    selectedIndex: Ref<(number | undefined)[]>
    lastSelected: Ref<number | null>
}

export const [installFolderTreeContext, useFolderTreeContext] = installation(function (options: FolderTreeContextOptions) {
    const { emit, editable, droppable, editPosition, selected, data, lastSelected, selectedIndex, mode } = options
    const indexedData = useIndexedData(options.data)

    const expandedState = useExpandedState(indexedData.indexedData)

    const elementRefs = useElementRefs(expandedState)

    const selector = useSelector({data, indexedData: indexedData.indexedData, expandedState, selected, lastSelected, selectedIndex, select: emit.select, navigate: () => {}  })

    const menu = useMenu(options, indexedData.indexedData, expandedState)

    useKeyboardEvents(selector, indexedData.indexedData, options.emit.enter)

    return {expandedState, elementRefs, menu, indexedData, emit, editable, droppable, editPosition, selected, selector, mode}
})

function useIndexedData(requestedData: Ref<FolderTreeNode[] | undefined>) {
    const data = ref<FolderTreeNode[]>([])
    const indexedData = ref<{[key: number]: IndexedFolder}>({})

    watch(requestedData, requestedData => {
        data.value = requestedData ?? []
        const newIndexedInfo: {[key: number]: IndexedFolder} = {}
        if(requestedData) {
            for(let i = 0; i < requestedData.length; ++i) {
                loadFolderNode(newIndexedInfo, requestedData[i], i)
            }
        }
        indexedData.value = newIndexedInfo
    }, {immediate: true})

    function loadFolderNode(info: {[key: number]: IndexedFolder}, folder: FolderTreeNode, ordinal: number, address: {id: number, title: string}[] = []) {
        const parentId = address.length ? address[address.length - 1].id : null

        info[folder.id] = {folder, address, parentId, ordinal}

        if(folder.children?.length) {
            const nextAddress = [...address, {id: folder.id, title: folder.title}]
            
            for (let i = 0; i < folder.children.length; ++i) {
                loadFolderNode(info, folder.children[i], i, nextAddress)
            }
        }
    }

    function plusIndexedOrdinal(items: FolderTreeNode[]) {
        //使列表中的节点在indexed info中的ordinal数值 + 1。
        for(const item of items) {
            const info = indexedData.value[item.id]
            if(info) info.ordinal += 1
        }
    }

    function minusIndexedOrdinal(items: FolderTreeNode[]) {
        //使列表中的节点在indexed info中的ordinal数值 - 1。
        for(const item of items) {
            const info = indexedData.value[item.id]
            if(info) info.ordinal -= 1
        }
    }

    /**
     * 向标签树中的位置追加节点。同步生成其indexed data。
     */
    const add = (node: FolderTreeNode, parentId: number | null, ordinal: number) => {
        if(parentId == null) {
            //首先更新其后的兄弟元素的ordinal
            plusIndexedOrdinal(data.value.slice(ordinal))
            //将新node插入到根列表下
            data.value.splice(ordinal, 0, node)
            //然后更新其在indexed info中的索引
            loadFolderNode(indexedData.value, node, ordinal)
        }else{
            const parentInfo = indexedData.value[parentId]
            if(parentInfo) {
                const nextAddress = [...toRaw(parentInfo.address), {id: parentInfo.folder.id, title: parentInfo.folder.title}]
                if(parentInfo.folder.children == null) {
                    parentInfo.folder.children = []
                }
                //首先更新其后的兄弟元素的ordinal
                plusIndexedOrdinal(parentInfo.folder.children.slice(ordinal))
                //将新node插入到其父节点的孩子列表下
                parentInfo.folder.children.splice(ordinal, 0, node)
                //然后更新其在indexed info中的索引
                //从列表再取一次是为了使其获得响应性
                const nodeRef = parentInfo.folder.children[ordinal]
                loadFolderNode(indexedData.value, nodeRef, ordinal, nextAddress)
            }else{
                console.error(`Error occurred while adding folder ${node.id}: cannot find parent folder ${parentId} in indexed info.`)
            }
        }
    }

    /**
     * 移除一个节点及其所有子节点，同步移除其indexed data。
     */
    const remove = (id: number) => {
        function processNode(id: number) {
            const info = indexedData.value[id]
            if(info) {
                delete indexedData.value[id]
                if(info.folder.children?.length) {
                    for(const child of info.folder.children) {
                        processNode(child.id)
                    }
                }
            }
        }

        const info = indexedData.value[id]
        if(info) {
            if(info.parentId != null) {
                //有parent时，将其从parent的子标签列表移除
                const parentInfo = indexedData.value[info.parentId]
                if(parentInfo && parentInfo.folder.children != null) {
                    parentInfo.folder.children.splice(info.ordinal, 1)
                    minusIndexedOrdinal(parentInfo.folder.children.slice(info.ordinal))
                }else{
                    console.error(`Error occurred while deleting folder ${id}: cannot find parent folder ${info.parentId} in indexed info.`)
                }
            }else{
                //没有parent时，从根列表移除
                data.value.splice(info.ordinal, 1)
                minusIndexedOrdinal(data.value.slice(info.ordinal))
            }
            processNode(id)
        }else{
            console.error(`Error occurred while deleting folder ${id}: not exist.`)
        }
    }

    /**
     * 移动一个节点，同步更新其indexed data。
     */
    const move = (id: number, parentId: number | null, ordinal: number) => {
        function processInfo(info: IndexedFolder, address: {id: number, title: string}[] | undefined) {
            if(address !== undefined) {
                info.address = address
            }
            if(info.folder.children?.length) {
                const nextAddress = address !== undefined ? [...address, {id: info.folder.id, title: info.folder.title}] : undefined
                for(const child of info.folder.children) {
                    const childInfo = indexedData.value[child.id]
                    if(childInfo) {
                        processInfo(childInfo, nextAddress)
                    }
                }
            }
        }

        const info = indexedData.value[id]
        if(!info) return

        if(parentId === info.parentId) {
            //如果parent没有变化，那么在同一个parent下处理
            if(parentId === null) {
                data.value.splice(info.ordinal, 1)
                if(ordinal > info.ordinal) {
                    minusIndexedOrdinal(data.value.slice(info.ordinal, ordinal - 1))
                    data.value.splice(ordinal - 1, 0, info.folder)
                    info.ordinal = ordinal - 1
                }else{
                    plusIndexedOrdinal(data.value.slice(ordinal, info.ordinal))
                    data.value.splice(ordinal, 0, info.folder)
                    info.ordinal = ordinal
                }
            }else{
                const parentInfo = indexedData.value[parentId]
                if(parentInfo) {
                    const children = parentInfo.folder.children ?? (parentInfo.folder.children = [])
                    children.splice(info.ordinal, 1)
                    if(ordinal > info.ordinal) {
                        //向后移动
                        minusIndexedOrdinal(children.slice(info.ordinal, ordinal - 1))
                        children.splice(ordinal - 1, 0, info.folder)
                        info.ordinal = ordinal - 1
                    }else{
                        //向前移动
                        plusIndexedOrdinal(children.slice(ordinal, info.ordinal))
                        children.splice(ordinal, 0, info.folder)
                        info.ordinal = ordinal
                    }
                }
            }
        }else{
            //如果parent变化，那么在新旧parent下分别处理

            //将folder从旧的parent下移除，同时处理它后面的folder的ordinal
            if(info.parentId === null) {
                data.value.splice(info.ordinal, 1)
                minusIndexedOrdinal(data.value.slice(info.ordinal))
            }else{
                const parentInfo = indexedData.value[info.parentId]
                if(parentInfo) {
                    const children = parentInfo.folder.children ?? (parentInfo.folder.children = [])
                    children.splice(info.ordinal, 1)
                    minusIndexedOrdinal(children.slice(info.ordinal))
                }
            }

            //将folder放置到新的parent下，同时处理它与它后面的folder的ordinal
            if(parentId === null) {
                plusIndexedOrdinal(data.value.slice(ordinal))
                data.value.splice(ordinal, 0, info.folder)
            }else{
                const parentInfo = indexedData.value[parentId]
                if(parentInfo) {
                    const children = parentInfo.folder.children ?? (parentInfo.folder.children = [])
                    plusIndexedOrdinal(children.slice(ordinal))
                    children.splice(ordinal, 0, info.folder)
                }
            }

            //更新此folder及其所有子节点的color, address, group props
            const parentInfo = parentId != null ? indexedData.value[parentId]! : null
            info.parentId = parentId
            info.ordinal = ordinal

            const address = parentInfo == null ? [] : [...toRaw(parentInfo.address), {id: parentInfo.folder.id, title: parentInfo.folder.title}]

            const newAddress = objects.deepEquals(address, info.address) ? undefined : address

            if(newAddress !== undefined) processInfo(info, newAddress)
        }
    }

    return {data, indexedData, add, remove, move}
}

function useExpandedState(indexedData: Ref<{[key: number]: IndexedFolder}>) {
    const expandedState = useLocalStorage<{[key: number]: boolean}>("folder-table/expanded-state", {})

    const get = (key: number): boolean => expandedState.value[key] ?? true

    const set = (key: number, value: boolean) => expandedState.value[key] = value

    const clear = (keys: number[]) => {
        for(const key of keys) {
            delete expandedState.value[key]
            const node = indexedData.value[key]
            if(node.folder.children?.length) {
                clear(node.folder.children.map(i => i.id))
            }
        }
    }

    const setAllForParent = (key: number, value: boolean) => {
        const deepSet = (folder: IndexedFolder, value: boolean) => {
            set(folder.folder.id, value)
            if(folder.parentId) {
                const p = indexedData.value[folder.parentId]
                if(p) deepSet(p, value)
            }
        }

        const info = indexedData.value[key]
        if(info && info.parentId) {
            const p = indexedData.value[info.parentId]
            if(p) deepSet(p, value)
        }
    }

    const setAllForChildren = (key: number, value: boolean) => {
        const deepSet = (folder: FolderTreeNode, value: boolean) => {
            set(folder.id, value)
            if(folder.children) {
                for(const child of folder.children) {
                    deepSet(child, value)
                }
            }
        }

        const info = indexedData.value[key]
        if(info) deepSet(info.folder, value)
    }

    return {get, set, clear, setAllForParent, setAllForChildren}
}

function useElementRefs(expandedState: ReturnType<typeof useExpandedState>) {
    const elements: Record<number, Element | ComponentPublicInstance | null> = {}

    const jumpTarget = ref<number | null>(null)

    let targetKey: number | null = null

    function scrollIntoView(el: Element | ComponentPublicInstance | null) {
        if(typeof (el as any).scrollIntoView === "function") {
            (el as any).scrollIntoView({block: "nearest"})
        }
    }

    return {
        jumpTarget,
        async jumpTo(folderId: number) {
            const el = elements[folderId]
            if(el) {
                //目前已经存在目标的ref，则直接采取操作
                await nextTick()
                scrollIntoView(el)
            }else{
                //不存在目标的ref，则尝试展开目标的折叠，同时把target存起来，等待异步完成
                targetKey = folderId
                expandedState.setAllForParent(folderId, true)
            }
            jumpTarget.value = folderId
        },
        async setElement(key: number, el: Element | ComponentPublicInstance | null | undefined) {
            if(elements[key] !== el) {
                if(el) {
                    elements[key] = el
                    if(targetKey === key) {
                        //目前存在操作目标，那么采取操作
                        await nextTick()
                        targetKey = null
                        //sleep是等待是为了等待目标展开的动画结束。这是一个magic行为
                        await sleep(150)
                        scrollIntoView(el)
                    }
                }else{
                    delete elements[key]
                }
            }
        }
    }
}

function useMenu(options: FolderTreeContextOptions, indexedData: Ref<{[key: number]: IndexedFolder}>, expandedState: ReturnType<typeof useExpandedState>) {
    const message = useMessageBox()

    const openDetail = (folder: FolderTreeNode) => {
        options.emit.enter(folder, undefined)
    }
    const openDetailInNewTab = (folder: FolderTreeNode) => {
        options.emit.enter(folder, "newTab")
    }
    const openDetailInNewWindow = (folder: FolderTreeNode) => {
        options.emit.enter(folder, "newWindow")
    }

    const togglePinned = (folder: FolderTreeNode) => {
        options.emit.updatePinned(folder, !folder.pinned)
    }

    const createChild = (folder: FolderTreeNode, type: FolderType) => {
        const indexedInfo = indexedData.value[folder.id]
        if(indexedInfo) {
            options.emit.updateEditPosition({action: "create", parentId: folder.id, ordinal: folder.children?.length ?? 0, type})
            if(options.selected.value !== null) options.emit.select([], null)
            if(!expandedState.get(folder.id)) expandedState.set(folder.id, true)
        }
    }

    const createAfter = (folder: FolderTreeNode, type: FolderType) => {
        const indexedInfo = indexedData.value[folder.id]
        if(indexedInfo) {
            options.emit.updateEditPosition({action: "create", parentId: indexedInfo.parentId, ordinal: indexedInfo.ordinal + 1, type})
            if(options.selected.value !== null) options.emit.select([], null)
        }
    }

    const renameItem = (folder: FolderTreeNode) => {
        const indexedInfo = indexedData.value[folder.id]
        if(indexedInfo) {
            options.emit.updateEditPosition({action: "edit", parentId: indexedInfo.parentId, id: folder.id})
        }
    }

    const deleteItem = async (folder: FolderTreeNode) => {
        const items = options.selected.value.includes(folder.id) ? options.selected.value : [folder.id]
        const indexedInfo = indexedData.value[folder.id]
        if(indexedInfo) {
            const hasChildren = !!indexedInfo.folder.children?.length || items.length > 1
            if(await message.showYesNoMessage("warn", "确定要删除此项吗？", hasChildren ? "此操作将级联删除从属的所有子节点，且不可撤回。" : "此操作不可撤回。")) {
                expandedState.clear(items)
                options.emit.delete(items, indexedInfo.parentId, indexedInfo.ordinal)
            }
        }
    }

    const menu = useDynamicPopupMenu<FolderTreeNode>(folder => [
        ...(folder.type === "FOLDER" ? [
            {type: "normal", label: "查看目录内容", click: openDetail},
            {type: "normal", label: "在新标签页查看目录内容", click: openDetailInNewTab},
            {type: "normal", label: "在新窗口查看目录内容", click: openDetailInNewWindow},
            {type: "separator"},
            {type: "normal", label: folder.pinned ? "取消固定到侧边栏" : "固定到侧边栏", click: togglePinned}
        ] as const : [
            {type: "normal", label: "折叠全部节点", click: () => expandedState.setAllForChildren(folder.id, false)},
            {type: "normal", label: "展开全部节点", click: () => expandedState.setAllForChildren(folder.id, true)}
        ] as const),
        ...(options.editable.value ? [
            {type: "separator"},
            ...(folder.type === "NODE" ? [
                {type: "normal", label: "在节点下新建节点", click: () => createChild(folder, "NODE")},
                {type: "normal", label: "在节点下新建目录", click: () => createChild(folder, "FOLDER")},
                {type: "separator"},
            ] as const : []),
            {type: "normal", label: "新建节点", click: () => createAfter(folder, "NODE")},
            {type: "normal", label: "新建目录", click: () => createAfter(folder, "FOLDER")},
            {type: "separator"},
            {type: "normal", label: "重命名", click: renameItem},
            {type: "separator"},
            {type: "normal", label: `删除此${folder.type === "FOLDER" ? "目录" : "节点"}`, click: deleteItem}
        ] as const : [])
    ])

    return menu.popup
}

function useKeyboardEvents({ moveSelect, lastSelected }: Selector, indexedData: Ref<{[key: number]: IndexedFolder}>, enter: (folder: FolderTreeNode, at: "newTab" | "newWindow" | undefined) => void) {
    useInterceptedKey(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Shift+ArrowLeft", "Shift+ArrowRight", "Shift+ArrowUp", "Shift+ArrowDown", "Enter"], e => {
        if(e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "ArrowUp" || e.key === "ArrowDown") {
            moveSelect(e.key, e.shiftKey).finally()
        }else if(e.key === "Enter") {
            if(lastSelected.value !== null) {
                enter(indexedData.value[lastSelected.value].folder, undefined)
            }
        }
    })
}

function useSelector(options: SelectorOptions): Selector {
    const { toast } = useToast()
    const { data, indexedData, expandedState, selected, selectedIndex, lastSelected, select: onSelect, navigate } = options

    const select = (folderId: number) => {
        // 单击一个项时，只选择此项
        onSelect([folderId], folderId)
    }

    const appendSelect = (folderId: number) => {
        // 按住CTRL/CMD单击一个项时，如果没有选择此项，则将此项加入选择列表；否则将此项从选择列表移除
        const find = selected.value.findIndex(i => i === folderId)
        if(find >= 0) {
            onSelect([...selected.value.slice(0, find), ...selected.value.slice(find + 1)], null)
        }else{
            if(selected.value.length + 1 > SELECTED_MAX) {
                toast("选择上限", "warning", `选择的数量超过上限: 最多可选择${SELECTED_MAX}项。`)
                return
            }
            onSelect([...selected.value, folderId], folderId)
        }
    }

    const shiftSelect = async (folderId: number) => {
        // 按住SHIFT单击一个项时，
        // - 如果没有last selected(等价于没有选择项)，则选择此项；
        // - 如果last selected不是自己，那么将从自己到last selected之间的所有项加入选择列表；否则无动作
        if(lastSelected.value === null) {
            onSelect([folderId], folderId)
        }else if(lastSelected.value !== folderId) {
            const result = getShiftSelectItems(folderId, lastSelected.value)
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
            onSelect(ret, folderId)
        }
    }

    const moveSelect = async (arrow: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight", shift: boolean) => {
        if(lastSelected.value !== null) {
            const offset = getMoveOffset(arrow)
            const result = getArrowSelectItem(lastSelected.value, offset)
            if (result !== null) {
                if(shift) {
                    await shiftSelect(result)
                }else{
                    onSelect([result], result)
                    navigate(result)
                }
            }
        }
    }

    const getMoveOffset = (arrow: "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight") => {
        return arrow === "ArrowLeft" ? -1 : arrow === "ArrowRight" ? 1 : arrow === "ArrowUp" ? -1 : 1
    }

    function getShiftSelectItems(selectId: number, lastSelectId: number): number[] {
        if(selectId === lastSelectId) return []
        const current = indexedData.value[selectId], last = indexedData.value[lastSelectId]

        function getPublicParent(current: IndexedFolder, last: IndexedFolder): [number | null, number, number] {
            //比对两者的address，寻找共同祖先节点。如果不存在共同祖先，则共同祖先为根
            const a = [...current.address, {id: current.folder.id, title: current.folder.title}]
            const b = [...last.address, {id: last.folder.id, title: last.folder.title}]
            for(let i = a.length - 1; i >= 0; i--) {
                for(let j = b.length - 1; j >= 0; j--) {
                    if(a[i].id === b[j].id) {
                        return [a[i].id, i >= a.length - 1 ? current.folder.id : a[i + 1].id, j >= b.length - 1 ? last.folder.id : b[j + 1].id]
                    }
                }
            }
            return [null, a.length > 0 ? a[0].id : current.folder.id, b.length > 0 ? b[0].id : last.folder.id]
        }

        //寻找共同祖先节点
        const [publicParentId, aFirstId, bFirstId] = getPublicParent(current, last)
        const parentChildren = publicParentId !== null ? indexedData.value[publicParentId].folder.children! : data.value!
        //判断两个首层子节点的先后顺序
        const aIndex = parentChildren.findIndex(i => i.id === aFirstId), bIndex = parentChildren.findIndex(i => i.id === bFirstId)
        //将a、b节点address中所有未打开的折叠打开
        expandedState.setAllForParent(selectId, true)
        expandedState.setAllForParent(lastSelectId, true)
        //根据先后顺序，使用ArrowSelect逐步迭代所有选择项
        const selectList: number[] = []
        let [startId, endId] = aIndex < bIndex ? [selectId, lastSelectId] : [lastSelectId, selectId]
        selectList.push(startId)
        while(true) {
            const next = getArrowSelectItem(startId, 1)
            if(next === null) {
                if(!selectList.includes(endId)) selectList.push(endId)
                break
            }
            selectList.push(next)
            startId = next
            if(next === endId) {
                if(!selectList.includes(endId)) selectList.push(endId)
                break
            }
        }
        return selectList
    }

    function getArrowSelectItem(lastSelectId: number, offset: number, ignoreChildren: boolean = false): number | null {
        //上: 访问上一个子节点；如果上一个节点开启，则迭代访问上一个节点的最后一个子节点
        //    如果上一个节点关闭，则访问它
        //    如果本身就是第一个子节点，则访问父节点
        const node = indexedData.value[lastSelectId]
        if(offset > 0) {
            if(!ignoreChildren && expandedState.get(lastSelectId) && node.folder.children?.length) {
                //如果当前节点开启且有子节点，则直接返回第一个子节点
                return node.folder.children[0].id
            }else{
                //否则，尝试找到后一个兄弟节点
                const parentChildren = node.parentId !== null ? indexedData.value[node.parentId].folder.children! : data.value!
                if(node.ordinal + 1 < parentChildren.length) {
                    //存在后一个兄弟节点时，直接返回它
                    return parentChildren[node.ordinal + 1].id
                }else{
                    //不存在任何兄弟节点时，寻找其父节点的后一个兄弟节点
                    if(node.parentId !== null) {
                        return getArrowSelectItem(node.parentId, offset, true)
                    }else{
                        return null
                    }
                }
            }
        }else{
            if(node.ordinal <= 0) {
                //如果当前节点没有前一个兄弟节点，则直接返回它的父节点，或者父节点不存在时返回null
                return node.parentId
            }else{
                //查找前一个兄弟节点
                const parentChildren = node.parentId !== null ? indexedData.value[node.parentId].folder.children! : data.value!
                let prev = indexedData.value[parentChildren[node.ordinal - 1].id]
                while(true) {
                    if(expandedState.get(prev.folder.id) && prev.folder.children?.length) {
                        //如果此节点开启，则查找此节点的最后一个子节点，且根据此节点的开启情况迭代
                        prev = indexedData.value[prev.folder.children[prev.folder.children.length - 1].id]
                    }else{
                        //如果此节点关闭，则直接返回此节点
                        return prev.folder.id
                    }
                }
            }
        }
    }

    return {select, appendSelect, shiftSelect, moveSelect, lastSelected, selected, selectedIndex}
}

export function useFolderDraggable(row: Ref<FolderTreeNode>) {
    const { indexedData, selected } = useFolderTreeContext()
    return useDraggable("folders", () => {
        if(selected.value.includes(row.value.id)) {
            return selected.value.map(id => indexedData.indexedData.value[id]!).map(i => ({id: i.folder.id, type: i.folder.type, address: i.address.map(a => a.title)}))
        }else{
            const info = indexedData.indexedData.value[row.value.id]!
            return [{id: row.value.id, type: row.value.type, address: info.address.map(a => a.title)}]
        }
    })
}

export function useFolderDroppable(row: Ref<FolderTreeNode>, indent: Ref<number>, expanded: Ref<boolean>) {
    const { indexedData, droppable, emit } = useFolderTreeContext()

    function getTarget(currentParentId: number | null, currentOrdinal: number, insertParentId: number | null, insertOrdinal: number | null): {parentId: number | null, ordinal: number} {
        if(insertOrdinal === null) {
            //省略insert ordinal表示默认操作
            if(currentParentId === insertParentId) {
                //parent不变时的默认操作是不移动
                return {parentId: insertParentId, ordinal: currentOrdinal}
            }else{
                //parent变化时的默认操作是移动到列表末尾，此时需要得到列表长度
                const count = insertParentId !== null ? (indexedData.indexedData.value[insertParentId]!.folder.children?.length ?? 0) : indexedData.data.value.length
                return {parentId: insertParentId, ordinal: count}
            }
        }else{
            return {parentId: insertParentId, ordinal: insertOrdinal}
        }
    }

    /**
     * 将指定的节点移动到标定的插入位置。
     * @param folders 指定节点组。
     * @param insertParentId 插入目标节点的id。null表示插入到根列表。
     * @param insertOrdinal 插入目标节点后的排序顺位。null表示默认操作(追加到节点末尾，或者对于相同parent不执行移动)
     */
    const move = (folders: SimpleFolder[], insertParentId: number | null, insertOrdinal: number | null) => {
        if(folders.length > 1) {
            emit.move(folders.map(i => i.id), insertParentId, insertOrdinal ?? undefined)
        }else{
            const info = indexedData.indexedData.value[folders[0].id]
            if(!info) {
                console.error(`Error occurred while moving folder ${folders[0].id}: cannot find indexed info.`)
                return
            }
            const target = getTarget(info.parentId, info.ordinal, insertParentId, insertOrdinal)

            if(target.parentId === info.parentId && target.ordinal === info.ordinal || folders[0].id === target.parentId) {
                //没有变化，或插入目标是其自身时，跳过操作
                return
            }

            emit.move([folders[0].id], target.parentId === info.parentId ? undefined : target.parentId, target.ordinal)
        }
    }

    const { dragover: topDragover, ...topDropEvents } = useDroppable("folders", folders => {
        if(droppable.value) {
            const info = indexedData.indexedData.value[row.value.id]
            if(info) {
                move(folders, info.parentId, info.ordinal)
            }
        }
    })

    const { dragover: bottomDragover, ...bottomDropEvents } = useDroppable("folders", folders => {
        if(droppable.value) {
            if(row.value.type === "NODE" && expanded.value) {
                move(folders, row.value.id, 0)
            }else{
                const info = indexedData.indexedData.value[row.value.id]
                if(info) {
                    move(folders, info.parentId, info.ordinal + 1)
                }
            }
        }
    })

    const gapState = computed(() => {
        if(droppable.value) {
            if(topDragover.value) {
                //放到上半时，插入到当前节点之前
                return {position: "top", indent: indent.value}
            }else if(bottomDragover.value) {
                //放到下半时，根据折叠情况决定。展开时插入到次级，作为首个节点；折叠时插入到当前节点之后。对应的gap长度也会变化。
                return {position: "bottom", indent: (row.value.type === "NODE" && expanded.value) ? (indent.value + 1) : indent.value}
            }
        }
        return null
    })

    return {gapState, topDropEvents, bottomDropEvents}
}
