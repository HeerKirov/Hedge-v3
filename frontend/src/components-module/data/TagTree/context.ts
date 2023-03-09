import { ComponentPublicInstance, computed, nextTick, ref, Ref, toRaw, watch } from "vue"
import { installation } from "@/utils/reactivity"
import { TagTreeNode } from "@/functions/http-client/api/tag"
import { usePopupMenu } from "@/modules/popup-menu"
import { useMessageBox } from "@/modules/message-box"
import { useDroppable } from "@/modules/drag"
import { UsefulColors } from "@/constants/ui"
import { objects } from "@/utils/primitives"
import { sleep } from "@/utils/process"

interface TagTreeContextOptions {
    data: Ref<TagTreeNode[] | undefined>
    createPosition: Ref<{parentId: number | null, ordinal: number} | undefined>
    editable: Ref<boolean | undefined>
    droppable: Ref<boolean | undefined>
    draggable: Ref<boolean | ((tag: TagTreeNode) => boolean) | undefined>
    emit: {
        click(tag: TagTreeNode, parentId: number | null, ordinal: number, event: MouseEvent): void
        dblclick(tag: TagTreeNode, parentId: number | null, ordinal: number, event: MouseEvent): void
        delete(tag: TagTreeNode, parentId: number | null, ordinal: number): void
        create(parentId: number | null, ordinal: number): void
        move(tag: TagTreeNode, moveToParentId: number | null | undefined, moveToOrdinal: number): void
    }
}

export interface IndexedTag {
    /**
     * 原始tag对象的引用。
     */
    tag: TagTreeNode
    /**
     * tag的地址段。
     */
    address: {id: number, name: string}[]
    /**
     * tag的父标签的id。
     */
    parentId: number | null
    /**
     * tag在其父标签下的顺位，从0开始。
     */
    ordinal: number
    /**
     * tag是否是group的成员。
     */
    isGroupMember: IsGroupMember
}

/**
 * 在indexedInfo中，有关group成员的类型。在此处并不关心它是否是force的，因此只有另外几种类型。
 */
type IsGroupMember = "YES" | "SEQUENCE" | "NO"

export const [installTagTreeContext, useTagTreeContext] = installation(function (options: TagTreeContextOptions) {
    const { emit, editable, droppable, draggable, createPosition } = options
    const indexedData = useIndexedData(options.data)

    const expandedState = useExpandedState(indexedData.indexedData)

    const elementRefs = useElementRefs(expandedState)

    const menu = useMenu(options, indexedData.indexedData, expandedState)

    const isDraggable = (t: TagTreeNode): boolean => {
        if(draggable.value === undefined) {
            return false
        }else if(typeof draggable.value === "boolean") {
            return draggable.value
        }else{
            return draggable.value(t)
        }
    }

    return {expandedState, elementRefs, menu, indexedData, emit, editable, droppable, isDraggable, createPosition}
})

function useIndexedData(requestedData: Ref<TagTreeNode[] | undefined>) {
    const data = ref<TagTreeNode[]>([])
    const indexedData = ref<{[key: number]: IndexedTag}>({})

    watch(requestedData, requestedData => {
        data.value = requestedData ?? []
        const newIndexedInfo: {[key: number]: IndexedTag} = {}
        if(requestedData) {
            for(let i = 0; i < requestedData.length; ++i) {
                loadTagNode(newIndexedInfo, requestedData[i], i)
            }
        }
        indexedData.value = newIndexedInfo
    }, {immediate: true})

    function loadTagNode(info: {[key: number]: IndexedTag}, tag: TagTreeNode, ordinal: number, isGroupMember: IsGroupMember = "NO", address: {id: number, name: string}[] = []) {
        const parentId = address.length ? address[address.length - 1].id : null

        info[tag.id] = {tag, address, parentId, ordinal, isGroupMember}

        if(tag.children?.length) {
            const nextAddress = [...address, {id: tag.id, name: tag.name}]
            const isGroupMember: IsGroupMember
                = tag.group === "FORCE_AND_SEQUENCE" || tag.group === "SEQUENCE" ? "SEQUENCE"
                : tag.group === "YES" || tag.group === "FORCE" ? "YES"
                    : "NO"
            for (let i = 0; i < tag.children.length; ++i) {
                loadTagNode(info, tag.children[i], i, isGroupMember, nextAddress)
            }
        }
    }

    function plusIndexedOrdinal(items: TagTreeNode[]) {
        //使列表中的节点在indexed info中的ordinal数值 + 1。
        for(const item of items) {
            const info = indexedData.value[item.id]
            if(info) info.ordinal += 1
        }
    }

    function minusIndexedOrdinal(items: TagTreeNode[]) {
        //使列表中的节点在indexed info中的ordinal数值 - 1。
        for(const item of items) {
            const info = indexedData.value[item.id]
            if(info) info.ordinal -= 1
        }
    }

    /**
     * 向标签树中的位置追加节点。同步生成其indexed data。
     */
    const add = (node: TagTreeNode, parentId: number | null, ordinal: number) => {
        if(parentId == null) {
            //首先更新其后的兄弟元素的ordinal
            plusIndexedOrdinal(data.value.slice(ordinal))
            //将新node插入到根列表下
            data.value.splice(ordinal, 0, node)
            //然后更新其在indexed info中的索引
            loadTagNode(indexedData.value, node, ordinal)
        }else{
            const parentInfo = indexedData.value[parentId]
            if(parentInfo) {
                const nextAddress = [...toRaw(parentInfo.address), {id: parentInfo.tag.id, name: parentInfo.tag.name}]
                const isGroupMember: IsGroupMember
                    = parentInfo.tag.group === "FORCE_AND_SEQUENCE" || parentInfo.tag.group === "SEQUENCE" ? "SEQUENCE"
                    : parentInfo.tag.group === "YES" || parentInfo.tag.group === "FORCE" ? "YES"
                        : "NO"
                if(parentInfo.tag.children == null) {
                    parentInfo.tag.children = []
                }
                //首先更新其后的兄弟元素的ordinal
                plusIndexedOrdinal(parentInfo.tag.children.slice(ordinal))
                //将新node插入到其父节点的孩子列表下
                parentInfo.tag.children.splice(ordinal, 0, node)
                //然后更新其在indexed info中的索引
                //从列表再取一次是为了使其获得响应性
                const nodeRef = parentInfo.tag.children[ordinal]
                loadTagNode(indexedData.value, nodeRef, ordinal, isGroupMember, nextAddress)
            }else{
                console.error(`Error occurred while adding tag ${node.id}: cannot find parent tag ${parentId} in indexed info.`)
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
                if(info.tag.children?.length) {
                    for(const child of info.tag.children) {
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
                if(parentInfo && parentInfo.tag.children != null) {
                    parentInfo.tag.children.splice(info.ordinal, 1)
                    minusIndexedOrdinal(parentInfo.tag.children.slice(info.ordinal))
                }else{
                    console.error(`Error occurred while deleting tag ${id}: cannot find parent tag ${info.parentId} in indexed info.`)
                }
            }else{
                //没有parent时，从根列表移除
                data.value.splice(info.ordinal, 1)
                minusIndexedOrdinal(data.value.slice(info.ordinal))
            }
            processNode(id)
        }else{
            console.error(`Error occurred while deleting tag ${id}: not exist.`)
        }
    }

    /**
     * 移动一个节点，同步更新其indexed data。
     */
    const move = (id: number, parentId: number | null, ordinal: number) => {
        function processInfo(info: IndexedTag, address: {id: number, name: string}[] | undefined, color: UsefulColors | null | undefined) {
            if(address !== undefined) {
                info.address = address
            }
            if(color !== undefined) {
                info.tag.color = color
            }
            if(info.tag.children?.length) {
                const nextAddress = address !== undefined ? [...address, {id: info.tag.id, name: info.tag.name}] : undefined
                for(const child of info.tag.children) {
                    const childInfo = indexedData.value[child.id]
                    if(childInfo) {
                        processInfo(childInfo, nextAddress, color)
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
                    data.value.splice(ordinal - 1, 0, info.tag)
                    info.ordinal = ordinal - 1
                }else{
                    plusIndexedOrdinal(data.value.slice(ordinal, info.ordinal))
                    data.value.splice(ordinal, 0, info.tag)
                    info.ordinal = ordinal
                }
            }else{
                const parentInfo = indexedData.value[parentId]
                if(parentInfo) {
                    const children = parentInfo.tag.children ?? (parentInfo.tag.children = [])
                    children.splice(info.ordinal, 1)
                    if(ordinal > info.ordinal) {
                        //向后移动
                        minusIndexedOrdinal(children.slice(info.ordinal, ordinal - 1))
                        children.splice(ordinal - 1, 0, info.tag)
                        info.ordinal = ordinal - 1
                    }else{
                        //向前移动
                        plusIndexedOrdinal(children.slice(ordinal, info.ordinal))
                        children.splice(ordinal, 0, info.tag)
                        info.ordinal = ordinal
                    }
                }
            }
        }else{
            //如果parent变化，那么在新旧parent下分别处理

            //将tag从旧的parent下移除，同时处理它后面的tag的ordinal
            if(info.parentId === null) {
                data.value.splice(info.ordinal, 1)
                minusIndexedOrdinal(data.value.slice(info.ordinal))
            }else{
                const parentInfo = indexedData.value[info.parentId]
                if(parentInfo) {
                    const children = parentInfo.tag.children ?? (parentInfo.tag.children = [])
                    children.splice(info.ordinal, 1)
                    minusIndexedOrdinal(children.slice(info.ordinal))
                }
            }

            //将tag放置到新的parent下，同时处理它与它后面的tag的ordinal
            if(parentId === null) {
                plusIndexedOrdinal(data.value.slice(ordinal))
                data.value.splice(ordinal, 0, info.tag)
            }else{
                const parentInfo = indexedData.value[parentId]
                if(parentInfo) {
                    const children = parentInfo.tag.children ?? (parentInfo.tag.children = [])
                    plusIndexedOrdinal(children.slice(ordinal))
                    children.splice(ordinal, 0, info.tag)
                }
            }

            //更新此tag及其所有子节点的color, address, group props
            const parentInfo = parentId != null ? indexedData.value[parentId]! : null
            info.parentId = parentId
            info.ordinal = ordinal
            info.isGroupMember = parentInfo == null ? "NO"
                : parentInfo.tag.group === "FORCE_AND_SEQUENCE" || parentInfo.tag.group === "SEQUENCE" ? "SEQUENCE"
                    : parentInfo.tag.group === "YES" || parentInfo.tag.group === "FORCE" ? "YES"
                        : "NO"

            const address = parentInfo == null ? [] : [...toRaw(parentInfo.address), {id: parentInfo.tag.id, name: parentInfo.tag.name}]
            const color = parentInfo == null ? info.tag.color : parentInfo.tag.color

            //监测这两项属性是否有修改。如果有，递归修改全部子标签
            const newAddress = objects.deepEquals(address, info.address) ? undefined : address
            const newColor = color === info.tag.color ? undefined : color
            if(newAddress !== undefined || newColor !== undefined) processInfo(info, newAddress, newColor)
        }
    }

    return {data, indexedData, add, remove, move}
}

function useExpandedState(indexedData: Ref<{[key: number]: IndexedTag}>) {
    const expandedState = ref<{[key: number]: boolean}>({})

    const get = (key: number): boolean => expandedState.value[key] ?? false

    const set = (key: number, value: boolean) => expandedState.value[key] = value

    const setAllForParent = (key: number, value: boolean) => {
        const deepSet = (tag: IndexedTag, value: boolean) => {
            set(tag.tag.id, value)
            if(tag.parentId) {
                const p = indexedData.value[tag.parentId]
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
        const deepSet = (tag: TagTreeNode, value: boolean) => {
            set(tag.id, value)
            if(tag.children) {
                for(const child of tag.children) {
                    deepSet(child, value)
                }
            }
        }

        const info = indexedData.value[key]
        if(info) deepSet(info.tag, value)
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
        async jumpTo(tagId: number) {
            const el = elements[tagId]
            if(el) {
                //目前已经存在目标的ref，则直接采取操作
                await nextTick()
                scrollIntoView(el)
            }else{
                //不存在目标的ref，则尝试展开目标的折叠，同时把target存起来，等待异步完成
                targetKey = tagId
                expandedState.setAllForParent(tagId, true)
            }
            jumpTarget.value = tagId
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

function useMenu(options: TagTreeContextOptions, indexedData: Ref<{[key: number]: IndexedTag}>, expandedState: ReturnType<typeof useExpandedState>) {
    const message = useMessageBox()

    const createChild = (tag: TagTreeNode) => {
        const indexedInfo = indexedData.value[tag.id]
        if(indexedInfo) options.emit.create(tag.id, tag.children?.length ?? 0)
    }

    const createBefore = (tag: TagTreeNode) => {
        const indexedInfo = indexedData.value[tag.id]
        if(indexedInfo) options.emit.create(indexedInfo.parentId, indexedInfo.ordinal)
    }

    const createAfter = (tag: TagTreeNode) => {
        const indexedInfo = indexedData.value[tag.id]
        if(indexedInfo) options.emit.create(indexedInfo.parentId, indexedInfo.ordinal + 1)
    }

    const deleteItem = async (tag: TagTreeNode) => {
        const indexedInfo = indexedData.value[tag.id]
        if(indexedInfo) {
            const hasChildren = !!indexedInfo.tag.children?.length
            if(await message.showYesNoMessage("warn", "确定要删除此项吗？", hasChildren ? "此操作将级联删除从属的所有子标签，且不可撤回。" : "此操作不可撤回。")) {
                options.emit.delete(tag, indexedInfo.parentId, indexedInfo.ordinal)
            }
        }
    }

    const menu = usePopupMenu<TagTreeNode>(() => [
        {type: "normal", label: "折叠全部标签", click: tag => expandedState.setAllForChildren(tag.id, false)},
        {type: "normal", label: "展开全部标签", click: tag => expandedState.setAllForChildren(tag.id, true)},
        ...(options.editable.value ? [
            {type: "separator"},
            {type: "normal", label: "新建子标签", click: createChild},
            {type: "normal", label: "在此标签之前新建", click: createBefore},
            {type: "normal", label: "在此标签之后新建", click: createAfter},
            {type: "separator"},
            {type: "normal", label: "删除此标签", click: deleteItem}
        ] as const : [])
    ])

    return menu.popup
}

export function useTagDroppable(parentId: Ref<number | null>, ordinal: Ref<number | null> | null) {
    const { indexedData, droppable, emit } = useTagTreeContext()

    function getTarget(currentParentId: number | null, currentOrdinal: number, insertParentId: number | null, insertOrdinal: number | null): {parentId: number | null, ordinal: number} {
        if(insertOrdinal === null) {
            //省略insert ordinal表示默认操作
            if(currentParentId === insertParentId) {
                //parent不变时的默认操作是不移动
                return {parentId: insertParentId, ordinal: currentOrdinal}
            }else{
                //parent变化时的默认操作是移动到列表末尾，此时需要得到列表长度
                const count = insertParentId !== null ? (indexedData.indexedData.value[insertParentId]!.tag.children?.length ?? 0) : indexedData.data.value.length
                return {parentId: insertParentId, ordinal: count}
            }
        }else{
            return {parentId: insertParentId, ordinal: insertOrdinal}
        }
    }

    /**
     * 将指定的节点移动到标定的插入位置。
     * @param sourceId 指定节点的tag id。
     * @param insertParentId 插入目标节点的id。null表示插入到根列表。
     * @param insertOrdinal 插入目标节点后的排序顺位。null表示默认操作(追加到节点末尾，或者对于相同parent不执行移动)
     */
    const move = (sourceId: number, insertParentId: number | null, insertOrdinal: number | null) => {
        //FIXED: 前后端API含义不同问题已修复

        const info = indexedData.indexedData.value[sourceId]
        if(!info) {
            console.error(`Error occurred while moving tag ${sourceId}: cannot find indexed info.`)
            return
        }
        const target = getTarget(info.parentId, info.ordinal, insertParentId, insertOrdinal)

        if(target.parentId === info.parentId && target.ordinal === info.ordinal || sourceId === target.parentId) {
            //没有变化，或插入目标是其自身时，跳过操作
            return
        }

        emit.move(info.tag, target.parentId === info.parentId ? undefined : target.parentId, target.ordinal)
    }

    const { dragover: originIsDragover, ...dropEvents } = useDroppable("tag", tag => {
        if(droppable.value) {
            move(tag.id, parentId.value, ordinal?.value ?? null)
        }
    })
    const dragover: Ref<boolean> = computed(() => (droppable.value ?? false) && originIsDragover.value)

    return {dragover, ...dropEvents}
}
