import { IResponse, IpcClient, AppEnvironment, AppEnvironmentChangedEvent, AppInitializeUpdatedEvent, OpenDialogOptions, MessageOptions } from "./constants"
import { Platform, NativeTheme, ServerConnectionStatus, ServerServiceStatus, ServerConnectionInfo, AppState, InitializeState, LoginForm, AppInitializeForm, FileWatcherStatus, CacheStatus  } from "./constants-model"
import { platform, remoteIpcClient } from "./impl"

export {
    platform,
    remoteIpcClient
}

export type {
    IResponse,
    Platform,
    NativeTheme,
    ServerConnectionStatus,
    ServerServiceStatus,
    ServerConnectionInfo,
    AppState,
    InitializeState,
    LoginForm,
    AppInitializeForm,
    IpcClient,
    AppEnvironment,
    AppEnvironmentChangedEvent,
    AppInitializeUpdatedEvent,
    OpenDialogOptions,
    MessageOptions,
    FileWatcherStatus,
    CacheStatus
}
