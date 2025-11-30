import { readonly, ref, Ref, unref } from "vue"
import { remoteIpcClient } from "@/functions/ipc-client"
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

/**
 * 它提供一组函数，用于直接实现拖拽功能，同时还负责自动注入拖拽的传递数据。而数据在事件构造时生成。
 */
export function useDraggableDynamic<T extends keyof TypeDefinition>(type: T | Ref<T>) {
    const onDragend = (e: DragEvent) => {
        if(e.dataTransfer) {
            e.dataTransfer.clearData("type")
            e.dataTransfer.clearData("data")
        }
    }

    return (data: TypeDefinition[T] | (() => TypeDefinition[T])) => {
        const onDragstart = (e: DragEvent) => {
            const unrefData = typeof data === "function" ? JSON.stringify(data()) : JSON.stringify(data)
            if(e.dataTransfer) {
                e.dataTransfer.setData("type", unref(type))
                e.dataTransfer.setData("data", unrefData)
            }
        }

        return {onDragstart, onDragend}
    }
}

interface Droppable<P = undefined> {
    dragover: Readonly<Ref<boolean>>
    onDragenter(): void
    onDragleave(): void
    onDrop(e: DragEvent, params?: P): void
    onDragover(e: DragEvent): void
}

interface DroppableOptions {
    elseProcess?(dt: DataTransfer): void
}

/**
 * 提供一组对应的函数，用于直接实现拖放功能，同时还负责解析拖放获得的传递数据。
 */
export function useDroppable<T extends keyof TypeDefinition, P = undefined>(byType: T | T[], event: (data: TypeDefinition[T], type: T, params?: P) => void, options?: DroppableOptions) {
    return useDroppableInternal<T, P>(typeof byType === "string" ? (data, type, params) => {
        if(byType === type) {
            event(<TypeDefinition[T]>data, type, params)
        }
    } : (data, type, params) => {
        if(byType.includes(type)) {
            event(<TypeDefinition[T]>data, type, params)
        }
    }, options)
}

function useDroppableInternal<T extends keyof TypeDefinition, P = undefined>(event: (data: TypeDefinition[T], type: T, params?: P) => void, options?: DroppableOptions): Droppable<P> {
    const fileListener = useOptionalDroppingFile()

    const dragover: Ref<boolean> = ref(false)
    const onDragenter = () => dragover.value = true
    const onDragleave = () => dragover.value = false

    const onDrop = (e: DragEvent, params?: P) => {
        try {
            if(e.dataTransfer) {
                e.preventDefault()
                //阻止向上传递事件，以避免存在上下叠加的dropEvents时，误触上层的drop事件
                //tips: 移除了stopPropagation参数，将阻止传递改为了无条件的
                e.stopImmediatePropagation()
                e.stopPropagation()

                if(fileListener && e.dataTransfer.files.length) {
                    const ret: string[] = []
                    for(let i = 0; i < e.dataTransfer.files.length; ++i) {
                        const file = e.dataTransfer.files.item(i)!
                        const filepath = remoteIpcClient.remote.shell.showFilePath(file)
                        if(filepath) ret.push(filepath)
                    }
                    if(ret.length) fileListener.emit(ret)
                    return
                }
                const type = <T>e.dataTransfer.getData("type")
                if(!type) {
                    //可能发过来的并不是droppable的东西
                    options?.elseProcess?.(e.dataTransfer)
                    return
                }
                let data: any
                try {
                    data = JSON.parse(e.dataTransfer?.getData("data"))
                }catch (error) {
                    //可能发过来的并不是droppable的东西
                    options?.elseProcess?.(e.dataTransfer)
                    return
                }

                event(data, type, params)
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

