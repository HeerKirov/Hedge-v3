import { computed, onMounted, ref, toRaw, watch } from "vue"
import { remoteIpcClient } from "@/functions/ipc-client"
import { AppearanceSetting } from "@/functions/ipc-client/constants"
import { installation } from "@/utils/reactivity"
import { useAppEnv } from "./app-base"

export const [installFullscreen, useFullscreen] = installation(function () {
    const fullscreen = ref(remoteIpcClient.remote.fullscreen.get())

    remoteIpcClient.remote.fullscreen.onFullscreenChanged(v => fullscreen.value = v)

    return computed({
        get() { return fullscreen.value },
        set(value) {
            fullscreen.value = value
            remoteIpcClient.remote.fullscreen.set(value)
        }
    })
})

export function useAppearance() {
    const appearance = ref<AppearanceSetting>()

    onMounted(async () => appearance.value = await remoteIpcClient.setting.appearance.get())

    watch(appearance, async (_, o) => {
        if (o !== undefined && appearance.value !== undefined) {
            await remoteIpcClient.setting.appearance.set(toRaw(appearance.value))
        }
    }, {deep: true})

    return appearance
}


export function useDarwinWindowed() {
    const { platform } = useAppEnv()

    const fullscreen = useFullscreen()

    return computed(() => platform === "darwin" && !fullscreen.value)
}