import { inject, InjectionKey, provide } from "vue"
import { SendRefEmitter, useListeningEvent, useRefEmitter } from "@/utils/emitter"

const fileInjection: InjectionKey<SendRefEmitter<string[]>> = Symbol()

export function useDroppingFileListener(callback?: (files: string[]) => void) {
    const emitter = inject(fileInjection, null)

    if(emitter) {
        if(callback) useListeningEvent(emitter, callback)
    }else{
        const emitter = useRefEmitter<string[]>()
        provide(fileInjection, emitter)
        if(callback) useListeningEvent(emitter, callback)
    }
}

export function useOptionalDroppingFile() {
    return inject(fileInjection, null)
}

export function useDroppableForFile() {
    const fileListener = useOptionalDroppingFile()
    const onDrop = (e: DragEvent) => {
        if(fileListener && e.dataTransfer && e.dataTransfer.files.length) {
            const ret: string[] = []
            for(let i = 0; i < e.dataTransfer.files.length; ++i) {
                const file = e.dataTransfer.files.item(i)
                //tips: 此处为Electron的额外注入参数。
                const filepath = (file as any)["path"]
                if(filepath) ret.push(filepath)
            }
            if(ret.length) fileListener.emit(ret)
        }
    }

    const onDragover = (e: DragEvent) => {
        e.preventDefault()
    }

    return {onDragover, onDrop}
}
