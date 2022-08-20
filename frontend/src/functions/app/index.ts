import { createHttpClientConfig, installHttpClient, useHttpClient } from "@/functions/app/http-client"
import { installFullscreen, useFullscreen } from "@/functions/app/fullscreen"
import { installAppBase } from "@/functions/app/app-base"
import { useAppInitializer } from "@/functions/app/app-initialize"
import { useLocalStorage } from "@/functions/app/storage"

interface AppServiceOptions {
    handleError(title: string, message: string): void
}

export function installAppService(options: AppServiceOptions) {
    const httpClientConfig = createHttpClientConfig(options.handleError)
    const httpClient = installHttpClient(httpClientConfig)
    const fullscreen = installFullscreen()
    const { env, state, server} = installAppBase(httpClientConfig)

    return {
        env,
        state,
        server,
        httpClient,
        fullscreen
    }
}

export {
    useHttpClient,
    useFullscreen,
    useLocalStorage,
    useAppInitializer
}
