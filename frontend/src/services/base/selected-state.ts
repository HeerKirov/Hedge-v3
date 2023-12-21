import { ref, Ref } from "vue"
import { QueryListview } from "@/functions/fetch"
import { useListeningEvent } from "@/utils/emitter"

/**
 * 为列表提供选择器相关上下文，包括一组选择项与最后选择项。
 */
export interface SelectedState<T extends string | number> {
    selected: Readonly<Ref<T[]>>
    lastSelected: Readonly<Ref<T | null>>
    update(selected: T[], lastSelected: T | null): void
    remove(value: T): void
    clear(): void
}

/**
 * 为列表提供选择器相关上下文，包括单一选择项。
 */
export interface SingleSelectedState<T extends string | number> {
    selected: Readonly<Ref<T | null>>
    set(selected: T | null): void
    clear(): void
}

interface SelectedStateOptions<T extends string | number, ITEM> {
    queryListview?: QueryListview<ITEM, T>
    keyOf(item: ITEM): T
}

export function useSelectedState<T extends string | number, ITEM = undefined>(options?: SelectedStateOptions<T, ITEM>): SelectedState<T> {
    const selected = ref([]) as Ref<T[]>
    const lastSelected = ref(null) as Ref<T | null>

    if(options?.queryListview) {
        useListeningEvent(options.queryListview.modifiedEvent, e => {
            if(e.type === "REMOVE") {
                //与queryListview的联动机制。自动监听queryListview的移除事件，并自动移除选择器中的对应项。
                const key = options.keyOf(e.oldValue)
                remove(key)
            }else if(e.type === "FILTER_UPDATED") {
                //与queryListview的联动机制。当列表被更新重置时，自动清空选择器。
                clear()
            }
        })
    }

    const update = (newSelected: T[], newLastUpdated: T | null) => {
        selected.value = newSelected
        lastSelected.value = newLastUpdated
    }

    const remove = (value: T) => {
        const idx = selected.value.findIndex(t => t === value)
        if(idx >= 0) selected.value.splice(idx, 1)
        if(lastSelected.value === value) lastSelected.value = null
    }

    const clear = () => {
        selected.value = []
        lastSelected.value = null
    }

    return {selected, lastSelected, update, remove, clear}
}

export function useSingleSelectedState<T extends string | number, ITEM = undefined>(options?: SelectedStateOptions<T, ITEM>): SingleSelectedState<T> {
    const selected = ref(null) as Ref<T | null>

    if(options?.queryListview) {
        useListeningEvent(options.queryListview.modifiedEvent, e => {
            if(e.type === "REMOVE") {
                //与queryListview的联动机制。自动监听queryListview的移除事件，并自动移除选择器中的对应项。
                if(selected.value !== null && options.keyOf(e.oldValue) === selected.value) {
                    clear()
                }
            }else if(e.type === "FILTER_UPDATED") {
                //与queryListview的联动机制。当列表被更新重置时，自动清空选择器。
                clear()
            }
        })
    }

    const set = (newSelected: T | null) => {
        selected.value = newSelected
    }

    const clear = () => {
        selected.value = null
    }

    return {selected, set, clear}
}
