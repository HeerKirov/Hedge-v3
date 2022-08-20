import { computed, ref } from "vue"
import { remoteIpcClient } from "@/functions/ipc-client"
import { installation } from "@/utils/reactivity"

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
