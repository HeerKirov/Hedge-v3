import { ref } from "vue"
import { optionalInstallation } from "@/utils/reactivity"

export const DEFAULT_WIDTH = 228

export const ATTACH_RANGE = 10

export const MAX_WIDTH = 400

export const MIN_WIDTH = 150

export const [, useSideLayoutState] = optionalInstallation(function (args?: {defaultWidth?: number, defaultSwitch?: boolean}) {
    return {
        width: ref(args?.defaultWidth ?? DEFAULT_WIDTH),
        isOpen: ref(args?.defaultSwitch ?? true)
    }
})
