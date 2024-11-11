/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_DEBUG_MODE: boolean | undefined
    readonly VITE_CHANNEL: string | undefined
    readonly VITE_LOCAL_DATA_PATH: string | undefined

    readonly VITE_SERVER_FROM_RESOURCE: string | undefined
    readonly VITE_SERVER_FROM_FOLDER: string | undefined
    readonly VITE_SERVER_FROM_HOST: string | undefined

    readonly VITE_FRONTEND_FROM_FOLDER: string | undefined
    readonly VITE_FRONTEND_FROM_URL: string | undefined

    readonly SERVER_VERSION: string | undefined
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}