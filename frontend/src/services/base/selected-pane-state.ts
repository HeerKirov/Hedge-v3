import { computed } from "vue"
import { useLocalStorage } from "@/functions/app"
import { SelectedState } from "@/services/base/selected-state"
import { toRef } from "@/utils/reactivity"

/**
 * 提供一组selected view视图控制器。此控制器基于selectedState的状态来控制无/单项/多项的不同状态显示，并不能手动控制状态类型。
 */
export type SelectedPaneState<T> = {
    type: "none"
} | {
    type: "single",
    value: T
} | {
    type: "multiple",
    values: T[],
    latest: T
}

export function useSelectedPaneState<T>(sidePaneName: string, selectedState: SelectedState<T>) {
    const storage = useLocalStorage<{visible: boolean}>(`side-pane/${sidePaneName}`, () =>({visible: false}), true)

    const visible = toRef(storage, "visible")

    const state = computed<SelectedPaneState<T>>(() => {
        if(!visible.value || selectedState.selected.value.length === 0) {
            return {type: "none"}
        }else if(selectedState.selected.value.length === 1) {
            return {type: "single", value: selectedState.selected.value[0]}
        }else{
            return {
                type: "multiple",
                values: selectedState.selected.value,
                latest: selectedState.lastSelected.value ?? (selectedState.selected.value[selectedState.selected.value.length - 1])
            }
        }
    })

    return {visible, state}
}
