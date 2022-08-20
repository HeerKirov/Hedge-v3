export interface ServerPIDFile {
    pid: number
    port?: number
    token?: string
    startTime: number
}

export interface ServerConnectionInfo {
    pid: number
    host: string
    token: string
    startTime: number
}

export interface ServerConnectionError {
    code: ConnectionErrorCode
    message?: string
}

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

export type ConnectionErrorCode
    = "PID_WAITING_TIMEOUT"     //等待PID文件准备完毕超时，没有等到或无法正确读取PID文件
    | "SERVER_WAITING_TIMEOUT"  //等待server连接超时
    | "SERVER_REQUEST_ERROR"    //与server连接时产生API错误
    | "SERVER_CONNECT_ERROR"    //与server建立ws连接时发生错误

export interface AppInitializeForm {
    storagePath?: string
}

export type WsToastResult = {
    type: "ERROR"
    data: { code: string, message: string | null, info: any }
} | {
    type: "EVENT"
    data: { timestamp: number, event: any & { eventType: string } }
}
