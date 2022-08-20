import { onMounted, onUnmounted, ref } from "vue"
import { AppInitializeForm, AppInitializeUpdatedEvent, InitializeState, remoteIpcClient } from "@/functions/ipc-client"

export function useAppInitializer() {
    const initializeState = ref<InitializeState>()

    onMounted(() => remoteIpcClient.app.initializeUpdatedEvent.addEventListener(onInitializeUpdated))
    onUnmounted(() => remoteIpcClient.app.initializeUpdatedEvent.removeEventListener(onInitializeUpdated))

    function onInitializeUpdated(e: AppInitializeUpdatedEvent) {
        initializeState.value = e.state
    }

    function initialize(form: AppInitializeForm) {
        remoteIpcClient.app.initialize(form)
        initializeState.value = "INITIALIZING"
    }

    return {
        initializeState,
        initialize
    }
}
