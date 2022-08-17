import { showError } from "../utils/notification"

export type ErrorCode = PanicError | CheckedError

export type PanicError = ChannelPanicError | AppdataPanicError | ConfigurationPanicError | ResourcePanicError | ServerPanicError
export type ChannelPanicError = "CHANNEL_READ_ERROR"
export type AppdataPanicError = "APPDATA_LOAD_ERROR"
export type ConfigurationPanicError = "CONFIGURATION_LOAD_ERROR"
export type ResourcePanicError = "RESOURCE_LOAD_ERROR" | "RESOURCE_UPDATE_ERROR"
export type ServerPanicError = "SERVER_EXEC_ERROR" | "SERVER_WAITING_EXIT" | "SERVER_WAITING_TIMEOUT" | "SERVER_REGISTER_ERROR"

export type CheckedError = InitError | AppdataError | ResourceError | ServerError
export type InitError = "ALREADY_INIT"
export type AppdataError = "APPDATA_INIT_ERROR"
export type ResourceError = "RESOURCE_UPDATE_ERROR"
export type ServerError = "SERVER_INIT_ERROR" | "SERVER_DISCONNECTED"

const panicErrorMapping: {[key in PanicError]: string} = {
    "CHANNEL_READ_ERROR": "无法读取channel信息。",
    "APPDATA_LOAD_ERROR": "无法读取app基础数据。",
    "CONFIGURATION_LOAD_ERROR": "无法读取public configuration。",
    "RESOURCE_LOAD_ERROR": "无法加载资源状态信息。",
    "RESOURCE_UPDATE_ERROR": "部署资源时发生错误。",
    "SERVER_EXEC_ERROR": "开启核心服务失败。",
    "SERVER_WAITING_EXIT": "核心服务异常退出，开启核心服务失败。",
    "SERVER_WAITING_TIMEOUT": "等待核心服务可用超时。",
    "SERVER_REGISTER_ERROR": "无法与核心服务建立连接。"
}

/**
 * 客户端的可定义异常。
 */
export class ClientException {
    readonly code: ErrorCode
    readonly e?: any

    constructor(code: ErrorCode, e?: any) {
        this.code = code
        this.e = e
    }
}

/**
 * 根据错误代码，抛出一个致命错误，并使程序退出。
 * 在调试模式下不会退出。
 */
export function panic(e: any, debugMode?: boolean) {
    if(e instanceof ClientException) {
        showError("致命错误", `${panicErrorMapping[<PanicError>e.code] ?? "发生内部错误。"}\n${e.e}`)
    }else {
        showError("致命错误", `发生内部错误。\n${e}`)
    }
    if(!debugMode) {
        process.exit(1)
    }
}
