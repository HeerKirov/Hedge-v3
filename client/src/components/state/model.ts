import { NativeTheme } from "../appdata/model"


export type AppState
    = "NOT_INITIALIZED"     //(稳定态)app未初始化
    | "LOADING"             //(瞬间态)加载中，还不知道要做什么
    | "LOADING_RESOURCE"    //加载中，正在处理资源升级
    | "LOADING_SERVER"      //加载中，正在处理核心服务连接
    | "NOT_LOGIN"           //(稳定态)app已加载完成，但是未登录
    | "READY"               //(稳定态)app已加载完成，且已经可用

export type InitializeState
    = "INITIALIZING"
    | "INITIALIZING_APPDATA"
    | "INITIALIZING_RESOURCE"
    | "INITIALIZING_SERVER"
    | "INITIALIZING_SERVER_DATABASE"
    | "FINISH"
    | "ERROR"

export interface AppInitializeForm {
    password: string | null
    connectMode: "local" | "remote"
    storagePath: string | null
    remoteHost: string | null
    remoteToken: string | null
    theme: NativeTheme | null
}

export interface LoginForm {
    password?: string
    touchId?: boolean
}
