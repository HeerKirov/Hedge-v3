import { createHttpClientConfig, installHttpClient, useHttpClient, useAssets, useAssetsLocal } from "./http-client"
import { installWsClient, useWsClient, useWsListeningEvent } from "./ws-client"
import { installFullscreen, useFullscreen, useAppearance } from "./app-runtime"
import { installAppBase, useAppState, useAppEnv, useServerStatus } from "./app-base"
import { useAppInitializer } from "./app-initialize"
import { useLocalStorage } from "./storage"

interface AppServiceOptions {
    handleError(title: string, message: string): void
}

export function installAppService(options: AppServiceOptions) {
    const httpClientConfig = createHttpClientConfig(options.handleError)
    const httpClient = installHttpClient(httpClientConfig)
    const wsClient = installWsClient()
    const fullscreen = installFullscreen()
    const {env, state, server} = installAppBase(httpClientConfig)

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
    useLocalStorage,
    useAppInitializer,
    useAppState,
    useAppEnv,
    useServerStatus,
    useAssets,
    useAssetsLocal
}
