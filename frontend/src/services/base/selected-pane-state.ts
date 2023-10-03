import { useLocalStorage } from "@/functions/app"
import { toRef } from "@/utils/reactivity"

/**
 * 提供selected view视图显示与否的控制器。
 */
export function useSelectedPaneState(sidePaneName: string) {
    const storage = useLocalStorage<{visible: boolean}>(`side-pane/${sidePaneName}`, () =>({visible: false}), true)

    const visible = toRef(storage, "visible")

    return {visible}
}
