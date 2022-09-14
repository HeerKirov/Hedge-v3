import { ref } from "vue"
import { installation } from "@/utils/reactivity"
import { HttpClientConfig } from "@/functions/http-client"
import { remoteIpcClient } from "@/functions/ipc-client"

const [installAppBase, useAppBase] = installation(function (httpClientConfig: HttpClientConfig) {
    const appEnvironment = remoteIpcClient.app.env()

    remoteIpcClient.app.envChangedEvent.addEventListener(e => {
        if(e.app) {
            state.value = e.app.state
        }
        if(e.serverConnection) {
            server.value = {
                serviceStatus: server.value.serviceStatus,
                connectionStatus: e.serverConnection.status,
                connectionInfo: e.serverConnection.info
            }
        }
        if(e.serverService) {
            server.value = {
                serviceStatus: e.serverService.status,
                connectionStatus: server.value.connectionStatus,
                connectionInfo: server.value.connectionInfo
            }
        }
        if(e.serverConnection?.info) {
            httpClientConfig.host = e.serverConnection.info.host
            httpClientConfig.token = e.serverConnection.info.token
        }
    })


    const env = {
        platform: appEnvironment.platform,
        debugMode: appEnvironment.debugMode,
        userDataPath: appEnvironment.userDataPath,
        channel: appEnvironment.channel,
        canPromptTouchID: appEnvironment.canPromptTouchID
    }

    const state = ref(appEnvironment.app.state)

    const server = ref({
        serviceStatus: appEnvironment.server.serviceStatus,
        connectionStatus: appEnvironment.server.connectionStatus,
        connectionInfo: appEnvironment.server.connectionInfo
    })

    httpClientConfig.host = appEnvironment.server.connectionInfo?.host
    httpClientConfig.token = appEnvironment.server.connectionInfo?.token

    return { env, state, server }
})

function useAppEnv() {
    return useAppBase().env
}

function useAppState() {
    const { state } = useAppBase()
    const login = remoteIpcClient.app.login
    return { state, login }
}

function useServerStatus() {
    return useAppBase().server
}

export { installAppBase, useAppEnv, useAppState, useServerStatus }
