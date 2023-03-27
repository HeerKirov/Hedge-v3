import { readonly, ref, Ref, unref } from "vue"
import { TypeDefinition } from "./definition"
import { useDroppingFileListener, useOptionalDroppingFile, useDroppableForFile } from "./file"

export type { TypeDefinition }
export { useDroppingFileListener, useDroppableForFile }

/*
 * == 拖放模块 ==
 * 此模块做了以下工作：
 * - 提供了useDraggable/useDroppable两个函数，以composition API的形式提供了元素的拖曳/拖放响应事件。
 * - 结合业务，限定了拖放内容的类型定义，使得在任何位置，拖放内容都是类型明确的。
 * - 还额外提供了文件拖放相关的能力。
 */

/**
 * 它提供一组函数，用于直接实现拖拽功能，同时还负责自动注入拖拽的传递数据。
 */
export function useDraggable<T extends keyof TypeDefinition>(type: T | Ref<T>, data: Ref<TypeDefinition[T]> | (() => TypeDefinition[T])) {
    const onDragstart = typeof data === "function" ? (e: DragEvent) => {
        if(e.dataTransfer) {
            e.dataTransfer.setData("type", unref(type))
            e.dataTransfer.setData("data", JSON.stringify(data()))
        }
    } : (e: DragEvent) => {
        if(e.dataTransfer) {
            e.dataTransfer.setData("type", unref(type))
            e.dataTransfer.setData("data", JSON.stringify(data.value))
        }
    }

    const onDragend = (e: DragEvent) => {
        if(e.dataTransfer) {
            e.dataTransfer.clearData("type")
            e.dataTransfer.clearData("data")
        }
    }

    return {onDragstart, onDragend}
}

interface Droppable {
    dragover: Readonly<Ref<boolean>>
    onDragenter(): void
    onDragleave(): void
    onDrop(e: DragEvent): void
    onDragover(e: DragEvent): void
}

interface DroppableOptions {
    stopPropagation?: boolean
}

/**
 * 提供一组对应的函数，用于直接实现拖放功能，同时还负责解析拖放获得的传递数据。
 */
export function useDroppable<T extends keyof TypeDefinition>(byType: T | T[], event: (data: TypeDefinition[T], type: T) => void, options?: DroppableOptions) {
    return useDroppableInternal<T>(typeof byType === "string" ? (data, type) => {
        if(byType === type) {
            event(<TypeDefinition[T]>data, type)
        }
    } : (data, type) => {
        if(byType.includes(type)) {
            event(<TypeDefinition[T]>data, type)
        }
    }, options)
}

function useDroppableInternal<T extends keyof TypeDefinition>(event: (data: TypeDefinition[T], type: T) => void, options?: DroppableOptions): Droppable {
    const fileListener = useOptionalDroppingFile()

    const dragover: Ref<boolean> = ref(false)
    const onDragenter = () => dragover.value = true
    const onDragleave = () => dragover.value = false

    const onDrop = (e: DragEvent) => {
        try {
            if(e.dataTransfer) {
                if(fileListener && e.dataTransfer.files.length) {
                    const ret: string[] = []
                    for(let i = 0; i < e.dataTransfer.files.length; ++i) {
                        const file = e.dataTransfer.files.item(i)
                        //tips: 此处为Electron的额外注入参数。
                        const filepath = (file as any)["path"]
                        if(filepath) ret.push(filepath)
                    }
                    if(ret.length) fileListener.emit(ret)
                    return
                }
                const type = <T>e.dataTransfer.getData("type")
                if(!type) {
                    //可能发过来的并不是droppable的东西
                    return
                }
                let data: any
                try {
                    data = JSON.parse(e.dataTransfer?.getData("data"))
                }catch (e) {
                    //可能发过来的并不是droppable的东西
                    return
                }

                e.preventDefault()
                if(options?.stopPropagation) {
                    //阻止向上传递事件，以避免存在上下叠加的dropEvents时，误触上层的drop事件
                    e.stopImmediatePropagation()
                    e.stopPropagation()
                }

                event(data, type)
            }
        }finally{
            dragover.value = false
        }
    }

    const onDragover = (e: DragEvent) => {
        e.preventDefault()
    }

    return {dragover: readonly(dragover), onDragenter, onDragleave, onDrop, onDragover}
}

