import { ref } from "vue"
import { installation } from "@/utils/reactivity"
import { HttpClientConfig } from "@/functions/http-client"
import { LoginForm, remoteIpcClient } from "@/functions/ipc-client"

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
                connectionInfo: e.serverConnection.info,
                staticInfo: server.value.staticInfo
            }
        }
        if(e.serverService) {
            server.value = {
                serviceStatus: e.serverService.status,
                connectionStatus: server.value.connectionStatus,
                connectionInfo: server.value.connectionInfo,
                staticInfo: server.value.staticInfo
            }
        }
        if(e.serverConnection?.info) {
            httpClientConfig.host = e.serverConnection.info.host
            httpClientConfig.token = e.serverConnection.info.token
        }
    })

    const login = async (form: LoginForm) => {
        if(await remoteIpcClient.app.login(form)) {
            state.value = "LOADING"
            return true
        }
        return false
    }

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
        connectionInfo: appEnvironment.server.connectionInfo,
        staticInfo: appEnvironment.server.staticInfo
    })

    httpClientConfig.host = appEnvironment.server.connectionInfo?.host
    httpClientConfig.token = appEnvironment.server.connectionInfo?.token

    return { env, state, server, login }
})

function useAppEnv() {
    return useAppBase().env
}

function useAppState() {
    const { state, login } = useAppBase()
    return { state, login }
}

function useServerStatus() {
    return useAppBase().server
}

export { installAppBase, useAppEnv, useAppState, useServerStatus }
