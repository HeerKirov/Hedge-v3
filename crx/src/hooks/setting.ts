import { useAsyncLoading } from "@/utils/reactivity"
import { Setting, settings } from "@/functions/setting"
import { useCallback } from "react"

export function useSetting() {
    const [setting, setSetting] = useAsyncLoading(settings.get)

    const saveSetting = useCallback(async (newSetting: Setting) => {
        setSetting(newSetting)
        await settings.set(newSetting, setting ?? undefined)
    }, [setting, setSetting])

    return { setting, saveSetting }
}