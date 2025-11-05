import { createHttpClientConfig, installHttpClient, useHttpClient, useAssets } from "./http-client"
import { installWsClient, useWsClient, useWsListeningEvent } from "./ws-client"
import { installFullscreen, useFullscreen, useAppearance, useDarwinWindowed } from "./app-runtime"
import { installAppBase, useAppState, useAppEnv, useServerStatus } from "./app-base"
import { useAppInitializer } from "./app-initialize"
import { 
    createLocalStorage, createSessionStorage, createMemoryStorage, createTabStorage, createRouteStorage, 
    useLocalStorage, useSessionStorage, useMemoryStorage, useTabStorage, useRouteStorage, 
    getLocalStorage, getSessionStorage, getMemoryStorage, getTabStorage, getRouteStorage,
    installMemoryStorageManager
} from "./storage"

interface AppServiceOptions {
    handleError(title: string, message: string): void
}

export function installAppService(options: AppServiceOptions) {
    const httpClientConfig = createHttpClientConfig(options.handleError)
    const httpClient = installHttpClient(httpClientConfig)
    const wsClient = installWsClient()
    const fullscreen = installFullscreen()
    const {env, state, server} = installAppBase(httpClientConfig)
    installMemoryStorageManager()

    return {
        env,
        state,
        server,
        httpClient,
        wsClient,
        fullscreen
    }
}

export {
    useFullscreen,
    useAppearance,
    useHttpClient,
    useWsClient,
    useWsListeningEvent,
    useAppInitializer,
    useAppState,
    useAppEnv,
    useServerStatus,
    useAssets,
    useDarwinWindowed,
    createLocalStorage, createSessionStorage, createMemoryStorage, createTabStorage, createRouteStorage,
    useLocalStorage, useSessionStorage, useMemoryStorage, useTabStorage, useRouteStorage,
    getLocalStorage, getSessionStorage, getMemoryStorage, getTabStorage, getRouteStorage,
}
