import { Ref } from "vue"
import { Tab } from "@/modules/browser"
import { installation } from "@/utils/reactivity"

interface DraggingContextOptions {
    activeTab(index: number): void
    moveTab(args: {id?: number, index?: number, toIndex: number}): void
}

export const [installDraggingContext, useDraggingContext] = installation(function (options: DraggingContextOptions) {
    let dragToTab: Tab | undefined
    let dragTimer: NodeJS.Timeout | undefined
    let dragDistance: {lastX: number, lastY: number, distance: number} | undefined

    let draggingTab: Tab | undefined
    let draggingCD: boolean = false

    const dragComplete = () => {
        if(dragToTab !== undefined) options.activeTab(dragToTab.index)
        dragToTab = undefined
        dragTimer = undefined
        dragDistance = undefined
    }

    const dragEnter = (_: DragEvent, tab: Tab) => {
        if(draggingTab === undefined && !tab.active) {
            if(dragToTab?.id === tab.id) return
            if(dragTimer !== undefined) clearTimeout(dragTimer)
            dragToTab = tab
            dragTimer = setTimeout(dragComplete, 300)
            dragDistance = undefined
        }
    }

    const dragLeave = (_: DragEvent, tab: Tab) => {
        if(draggingTab === undefined && !tab.active) {
            if(dragTimer !== undefined) clearTimeout(dragTimer)
            dragToTab = undefined
            dragTimer = undefined
            dragDistance = undefined
        }
    }

    const dragOver = (e: DragEvent, tab: Tab) => {
        if(draggingTab !== undefined) {
            if(!draggingCD && draggingTab.id !== tab.id) {
                const hoveredTab = e.currentTarget as HTMLElement

                const tabRect = hoveredTab.getBoundingClientRect()
                const hoverPosition = e.clientX - tabRect.left
                const tabWidth = tabRect.width

                const relativePosition = hoverPosition / tabWidth
                if(relativePosition >= 0.2 && relativePosition <= 0.8) {
                    const toIndex = relativePosition < 0.5 ? (draggingTab.index < tab.index ? tab.index - 1 : tab.index) : (draggingTab.index < tab.index ? tab.index : tab.index + 1)
                    if(draggingTab.index !== toIndex) {
                        options.moveTab({id: draggingTab.id, toIndex})
                        draggingTab.index = toIndex

                        draggingCD = true
                        setTimeout(() => draggingCD = false, 500)
                    }
                }
            }
        }else if(!tab.active) {
            if(dragDistance === undefined) {
                dragDistance = {lastX: e.x, lastY: e.y, distance: 0}
            } else {
                dragDistance.distance += Math.sqrt((e.x - dragDistance.lastX) ** 2 + (e.y - dragDistance.lastY) ** 2)
                if(dragDistance.distance >= 200) {
                    dragComplete()
                } else {
                    dragDistance.lastX = e.x
                    dragDistance.lastY = e.y
                }
            }
        }
        e.preventDefault()
    }

    const dragStart = (tab: Tab) => {
        draggingTab = tab
    }

    const dragEnd = () => {
        draggingTab = undefined
    }

    return {dragEnter, dragLeave, dragOver, dragStart, dragEnd}
})

export function useDraggingTab(tab: Ref<Tab>) {
    const context = useDraggingContext()

    let dragCounter = 0

    const dragEnter = (e: DragEvent) => {
        dragCounter += 1
        if(dragCounter === 1) {
            context.dragEnter(e, tab.value)
        }
    }

    const dragLeave = (e: DragEvent) => {
        dragCounter -= 1
        if(dragCounter === 0) {
            context.dragLeave(e, tab.value)
        }
    }

    const dragOver = (e: DragEvent) => {
        context.dragOver(e, tab.value)
    }

    const dragStart = () => {
        context.dragStart(tab.value)
    }

    const dragEnd = () => {
        context.dragEnd()
    }

    return {dragEnter, dragLeave, dragOver, dragStart, dragEnd}
}