import { IpcClient, AppEnvironment, AppEnvironmentChangedEvent, AppInitializeUpdatedEvent, MenuTemplate, OpenDialogOptions, MessageOptions } from "./constants"
import { Platform, NativeTheme, ServerConnectionStatus, ServerServiceStatus, ServerConnectionInfo, AppState, InitializeState, LoginForm, AppInitializeForm  } from "./constants-model"
import { platform, remoteIpcClient } from "./impl"

export {
    platform,
    remoteIpcClient
}

export type {
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
    MenuTemplate,
    OpenDialogOptions,
    MessageOptions
}
