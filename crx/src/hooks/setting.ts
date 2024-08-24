import { useAsyncLoading } from "@/utils/reactivity"
import { Setting, settings } from "@/functions/setting"

export function useSetting() {
    const [setting, setSetting] = useAsyncLoading(settings.get)

    const saveSetting = async (newSetting: Setting) => {
        setSetting(newSetting)
        await settings.set(newSetting)
    }

    return { setting, saveSetting }
}