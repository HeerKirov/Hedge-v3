

export type ServerConnectionStatus
    = "CLOSE"                   //server仍处于关闭状态
    | "CONNECTING"              //正在尝试连接server
    | "FAILED"                  //因各种原因，始终无法与server建立连接
    | "OPEN"                    //server正在正常连接

export type ServerServiceStatus
    = "NOT_CONNECTED"           //尚未建立同server的连接
    | "NOT_INITIALIZED"         //已建立连接，正处于未初始化的状态
    | "INITIALIZING"            //已建立连接，正处于初始化中的状态
    | "LOADING"                 //已建立连接，正处于服务器加载状态
    | "READY"                   //已建立连接，且服务器已就绪

export interface ServerConnectionInfo {
    pid: number
    host: string
    token: string
    startTime: number
}

export interface ServerStaticInfo {
    logPath: string
}

export type WsToastResult = {
    type: "ERROR"
    data: { code: string, message: string | null, info: any }
} | {
    type: "EVENT"
    data: { eventType: string, events: { timestamp: number, event: any & { eventType: string } }[] }
}

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
    storagePath: string | null
    theme: NativeTheme | null
}

export interface LoginForm {
    password?: string
    touchId?: boolean
}

export type NativeTheme = "system" | "light" | "dark"

export type Platform = "win32" | "darwin" | "linux"

export type TabControlEvent = "NEW_TAB" | "CLONE_TAB" | "PREV_TAB" | "NEXT_TAB" | "CLOSE_TAB" | "ROUTE_BACK" | "ROUTE_FORWARD"

export interface UpdateStateOptions { enabled: boolean }
