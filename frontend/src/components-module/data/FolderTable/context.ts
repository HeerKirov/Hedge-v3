import { ComponentPublicInstance, computed, nextTick, ref, Ref, toRaw, watch } from "vue"
import { FolderCreateForm, FolderTreeNode } from "@/functions/http-client/api/folder"
import { useMessageBox } from "@/modules/message-box"
import { useDynamicPopupMenu } from "@/modules/popup-menu"
import { useDraggable, useDroppable } from "@/modules/drag"
import { installation } from "@/utils/reactivity"
import { objects } from "@/utils/primitives"
import { sleep } from "@/utils/process"

interface FolderTreeContextOptions {
    data: Ref<FolderTreeNode[] | undefined>
    createPosition: Ref<{parentId: number | null, ordinal: number} | undefined>
    selected: Ref<number | null>
    editable: Ref<boolean | undefined>
    droppable: Ref<boolean | undefined>
    mode: Ref<"std" | "simple">
    emit: {
        updateCreatePosition(position: {parentId: number | null, ordinal: number} | undefined): void
        updateSelected(folderId: number | null): void
        updatePinned(folder: FolderTreeNode, pin: boolean): void
        enter(folder: FolderTreeNode, parentId: number | null, ordinal: number, at: "newTab" | "newWindow" | undefined): void
        create(form: FolderCreateForm): void
        move(folder: FolderTreeNode, moveToParentId: number | null | undefined, moveToOrdinal: number): void
        delete(folder: FolderTreeNode, parentId: number | null, ordinal: number): void
    }
}

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

export const [installFolderTreeContext, useFolderTreeContext] = installation(function (options: FolderTreeContextOptions) {
    const { emit, editable, droppable, createPosition, selected, mode } = options
    const indexedData = useIndexedData(options.data)

    const expandedState = useExpandedState(indexedData.indexedData)

    const elementRefs = useElementRefs(expandedState)

    const menu = useMenu(options, indexedData.indexedData, expandedState)

    return {expandedState, elementRefs, menu, indexedData, emit, editable, droppable, createPosition, selected, mode}
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
    const expandedState = ref<{[key: number]: boolean}>({})

    const get = (key: number): boolean => expandedState.value[key] ?? true

    const set = (key: number, value: boolean) => expandedState.value[key] = value

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

    return {get, set, setAllForParent, setAllForChildren}
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

function useMenu(options: FolderTreeContextOptions, indexedData: Ref<{[key: number]: IndexedFolder}>, expandedState: ReturnType<typeof useExpandedState>) {
    const message = useMessageBox()

    const openDetail = (folder: FolderTreeNode) => {
        const indexedInfo = indexedData.value[folder.id]
        if(indexedInfo) options.emit.enter(folder, indexedInfo.parentId, indexedInfo.ordinal, undefined)
    }
    const openDetailInNewTab = (folder: FolderTreeNode) => {
        const indexedInfo = indexedData.value[folder.id]
        if(indexedInfo) options.emit.enter(folder, indexedInfo.parentId, indexedInfo.ordinal, "newTab")
    }
    const openDetailInNewWindow = (folder: FolderTreeNode) => {
        const indexedInfo = indexedData.value[folder.id]
        if(indexedInfo) options.emit.enter(folder, indexedInfo.parentId, indexedInfo.ordinal, "newWindow")
    }

    const togglePinned = (folder: FolderTreeNode) => {
        options.emit.updatePinned(folder, !folder.pinned)
    }

    const createChild = (folder: FolderTreeNode) => {
        const indexedInfo = indexedData.value[folder.id]
        if(indexedInfo) {
            options.emit.updateCreatePosition({parentId: folder.id, ordinal: folder.children?.length ?? 0})
            if(options.selected.value !== null) options.emit.updateSelected(null)
        }
    }

    const createBefore = (folder: FolderTreeNode) => {
        const indexedInfo = indexedData.value[folder.id]
        if(indexedInfo) {
            options.emit.updateCreatePosition({parentId: indexedInfo.parentId, ordinal: indexedInfo.ordinal})
            if(options.selected.value !== null) options.emit.updateSelected(null)
        }
    }

    const createAfter = (folder: FolderTreeNode) => {
        const indexedInfo = indexedData.value[folder.id]
        if(indexedInfo) {
            options.emit.updateCreatePosition({parentId: indexedInfo.parentId, ordinal: indexedInfo.ordinal + 1})
            if(options.selected.value !== null) options.emit.updateSelected(null)
        }
    }

    const deleteItem = async (folder: FolderTreeNode) => {
        const indexedInfo = indexedData.value[folder.id]
        if(indexedInfo) {
            const hasChildren = !!indexedInfo.folder.children?.length
            if(await message.showYesNoMessage("warn", "确定要删除此项吗？", hasChildren ? "此操作将级联删除从属的所有子节点，且不可撤回。" : "此操作不可撤回。")) {
                options.emit.delete(folder, indexedInfo.parentId, indexedInfo.ordinal)
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
            ...(folder.type === "NODE" ? [{type: "normal", label: "在节点下新建", click: createChild}] as const : []),
            {type: "normal", label: "在此节点之前新建", click: createBefore},
            {type: "normal", label: "在此节点之后新建", click: createAfter},
            {type: "separator"},
            {type: "normal", label: `删除此${folder.type === "FOLDER" ? "目录" : "节点"}`, click: deleteItem}
        ] as const : [])
    ])

    return menu.popup
}

export function useFolderDraggable(row: Ref<FolderTreeNode>) {
    const { indexedData } = useFolderTreeContext()
    return useDraggable("folder", () => {
        const info = indexedData.indexedData.value[row.value.id]!
        return {id: row.value.id, type: row.value.type, address: info.address.map(a => a.title)}
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
     * @param folderId 指定节点的folder id。
     * @param insertParentId 插入目标节点的id。null表示插入到根列表。
     * @param insertOrdinal 插入目标节点后的排序顺位。null表示默认操作(追加到节点末尾，或者对于相同parent不执行移动)
     */
    const move = (folderId: number, insertParentId: number | null, insertOrdinal: number | null) => {
        const info = indexedData.indexedData.value[folderId]
        if(!info) {
            console.error(`Error occurred while moving folder ${folderId}: cannot find indexed info.`)
            return
        }
        const target = getTarget(info.parentId, info.ordinal, insertParentId, insertOrdinal)

        if(target.parentId === info.parentId && target.ordinal === info.ordinal || folderId === target.parentId) {
            //没有变化，或插入目标是其自身时，跳过操作
            return
        }

        emit.move(info.folder, target.parentId === info.parentId ? undefined : target.parentId, target.ordinal)
    }

    const { dragover: topDragover, ...topDropEvents } = useDroppable("folder", folder => {
        if(droppable.value) {
            const info = indexedData.indexedData.value[row.value.id]
            if(info) {
                move(folder.id, info.parentId, info.ordinal)
            }
        }
    })

    const { dragover: bottomDragover, ...bottomDropEvents } = useDroppable("folder", folder => {
        if(droppable.value) {
            if(row.value.type === "NODE" && expanded.value) {
                move(folder.id, row.value.id, 0)
            }else{
                const info = indexedData.indexedData.value[row.value.id]
                if(info) {
                    move(folder.id, info.parentId, info.ordinal + 1)
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
