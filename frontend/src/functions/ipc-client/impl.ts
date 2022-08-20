import { Platform } from "./constants-model"
import { IpcClient } from "./constants"

export const platform: Platform = (window as any)['platform']

export const remoteIpcClient: IpcClient = (window as any)['createRemoteIpcClient']()
