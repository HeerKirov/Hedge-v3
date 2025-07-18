import { TabControlEvent, UpdateStateOptions } from "@/application/menu"
import { ServerServiceStatus, ServerConnectionStatus, ServerConnectionInfo, WsToastResult, ServerStaticInfo } from "@/components/server"
import { AppInitializeForm, AppState, InitializeState, LoginForm } from "@/components/state"
import { NativeTheme } from "@/components/appdata/model"
import { CacheStatus } from "@/components/local/file"
import { FileWatcherStatus } from "@/components/local/file-watcher"
import { Emitter } from "@/utils/emitter"
import { IResponse } from "@/utils/types"
import { Platform } from "@/utils/process"

/**
 * IPC API Client的定义。这份定义会在客户端和前端通用。
 */
export interface IpcClient {
    app: {
        env(): AppEnvironment
        initialize(form: AppInitializeForm): void
        login(form: LoginForm): Promise<boolean>
        serverForceStop(): void
        envChangedEvent: Emitter<AppEnvironmentChangedEvent>
        initializeUpdatedEvent: Emitter<AppInitializeUpdatedEvent>
        wsToastEvent: Emitter<WsToastResult>
    }
    local: {
        importFile(filepath: string): Promise<IResponse<undefined, "FILE_NOT_FOUND" | "STORAGE_NOT_ACCESSIBLE" | "ILLEGAL_FILE_EXTENSION">>
        loadFile(path: string): Promise<IResponse<string, "FILE_NOT_FOUND">>
        checkAndLoadFile(path: string): Promise<IResponse<boolean, "FILE_NOT_FOUND">>
        downloadExportFile(form: { imageIds?: number[], bookId?: number, location: string, zip?: string }): Promise<IResponse<undefined, "FILE_NOT_FOUND" | "FILE_ALREADY_EXISTS" | "LOCATION_NOT_ACCESSIBLE">>
        cacheStatus(): Promise<CacheStatus>
        cleanAllCacheFiles(): Promise<void>
        fileWatcherStatus(isOpen?: boolean): Promise<FileWatcherStatus>
        fileWatcherChangedEvent: Emitter<FileWatcherStatus>
    }
    window: {
        newWindow(url?: string): void
        openSetting(): void
        openGuide(): void
        openNote(): void
    }
    setting: {
        appearance: {
            get(): Promise<AppearanceSetting>
            set(value: AppearanceSetting): Promise<void>
        }
        behaviour: {
            get(): Promise<BehaviourSetting>
            set(value: BehaviourSetting): Promise<void>
        }
        auth: {
            get(): Promise<AuthSetting>
            set(value: AuthSetting): Promise<void>
        }
        storage: {
            get(): Promise<StorageSetting>
            set(value: StorageSetting): Promise<void>
        }
        channel: {
            list(): Promise<string[]>
            getCurrent(): string
            getDefault(): Promise<string>
            setDefault(channel: string): Promise<void>
            toggle(channel: string): void
        }
    }
    remote: {
        tabs: {
            updateState(state: UpdateStateOptions): void
            controlEvent: Emitter<TabControlEvent>
        }
        fullscreen: {
            get(): boolean
            set(value: boolean): void
            onFullscreenChanged(func: (fullscreen: boolean) => void): void
        }
        menu: {
            popup(options: PopupMenuOptions): void
        }
        dialog: {
            openDialog(options: OpenDialogOptions): Promise<string[] | null>
            showMessage(options: MessageOptions): Promise<number>
            showError(title: string, message: string): void
        }
        shell: {
            openExternal(url: string): void
            openPath(url: string): void
            openPathInFolder(url: string): void
            startDragFile(thumbnail: string, filepath: string | string[]): void
            showFilePath(file: File): string
        }
    }
}

export interface AppEnvironment {
    platform: Platform
    debugMode: boolean
    userDataPath: string
    channel: string
    canPromptTouchID: boolean
    app: {
        state: AppState
    }
    server: {
        serviceStatus: ServerServiceStatus
        connectionStatus: ServerConnectionStatus
        connectionInfo: ServerConnectionInfo | null
        staticInfo: ServerStaticInfo
    }
}

export interface AppEnvironmentChangedEvent {
    app?: {
        state: AppState
    }
    serverConnection?: {
        status: ServerConnectionStatus
        info: ServerConnectionInfo | null
    }
    serverService?: {
        status: ServerServiceStatus
    }
}

export interface AppInitializeUpdatedEvent {
    state: InitializeState
}

export interface AuthSetting {
    password: string | null
    touchID: boolean
    fastboot: boolean
    mode: "local" | "remote"
    remote?: { host: string; token: string }
}

export interface AppearanceSetting {
    theme: NativeTheme
}

interface BehaviourSetting {
    customBrowserList: {name: string, path: string}[]
    externalBrowser: string | null
}

interface StorageSetting {
    cacheCleanIntervalDay: number
    fileWatchPaths: string[]
    autoFileWatch: boolean
    fileWatchMoveMode: boolean
    fileWatchInitialize: boolean
}

export interface PopupMenuOptions {
    items: MenuTemplate[]
    x?: number
    y?: number
}

export interface OpenDialogOptions {
    title?: string
    defaultPath?: string
    filters?: {name: string, extensions: string[]}[]
    properties?: ("openFile" | "openDirectory" | "multiSelections" | "createDirectory"/*macOS*/)[]
}

export interface MessageOptions {
    type: "none"|"info"|"error"|"question"
    buttons?: string[]
    defaultButtonId?: number
    title?: string
    message: string
    detail?: string
}

export type MenuTemplate = NormalMenuTemplate | CheckboxMenuTemplate | RadioMenuTemplate | SeparatorMenuTemplate | SubMenuTemplate

export type MenuTemplateInIpc = Exclude<NormalMenuTemplate, "click"> & {eventId?: number} | Exclude<CheckboxMenuTemplate, "click"> & {eventId?: number} | Exclude<RadioMenuTemplate, "click"> & {eventId?: number} | SeparatorMenuTemplate | SubMenuTemplate

export interface NormalMenuTemplate {
    label: string
    enabled?: boolean
    type: "normal"
    click?(): void
}
export interface CheckboxMenuTemplate {
    label: string
    enabled?: boolean
    type: "checkbox"
    checked?: boolean
    click?(): void
}
export interface RadioMenuTemplate {
    label: string
    enabled?: boolean
    type: "radio"
    checked?: boolean
    click?(): void
}
export interface SeparatorMenuTemplate {
    type: "separator"
}
export interface SubMenuTemplate {
    label: string
    enabled?: boolean
    type: "submenu"
    submenu: MenuTemplate[]
}
