import path from "path"
import { kill as killProcess } from "process"
import { spawn } from "child_process"
import { AxiosRequestConfig } from "axios"
import { AppDataDriver } from "../appdata"
import { DATA_FILE, RESOURCE_FILE } from "../../constants/file"
import { createEmitter, Emitter } from "../../utils/emitter"
import { request, Ws, Response } from "../../utils/request"
import { sleep } from "../../utils/process"
import { readFile } from "../../utils/fs"
import {
    AppInitializeForm,
    ServerConnectionStatus,
    ServerServiceStatus,
    ServerPIDFile,
    ServerConnectionInfo,
    ServerConnectionError,
    ServerStaticInfo,
    WsToastResult
} from "./model"

/**
 * 对接后台服务部分的管理器。负责监视本频道对应的后台服务的运行状态，获取其运行参数，提供后台服务的管理功能，提供部分后台服务的功能接口。
 * 管理器分为期望状态和实际状态两部分。
 *  - 实际状态是和实际的server运行状态几乎同步的。它会反映server的CLOSE、READY、OPEN、ERROR状态，以及server的连接信息，并通过事件告知变化。
 *  - 期望状态则指是否期望server在运行的状态。
 * 管理器的工作逻辑通过ws连接实现。
 *  - 在连接期望为true时，管理器会尝试建立同server的连接。如果建立不能成功，则开始尝试修复连接。
 *  - 如果server未启动/无法检测到server的运行，则尝试启动server。
 *  - 如果server已启动，但始终无法成功连接，则认为存在某种连接问题需要报告。
 * 在实际状态为已连接的情况下，与server的交互可以展开。
 *  - 可以获知server的健康检查状态(初始化状态)，以及调用API对server进行初始化。
 *  - 可以通过事件侦听器访问server的ws事件。
 */
export interface ServerManager {
    connection: ConnectionManager
    service: ServiceManager
}

interface ConnectionManager {
    /**
     * 获得或设定管理器的期望状态。
     * @param value
     */
    desired(value?: boolean): boolean

    /**
     * 获得当前连接的实际状态。
     */
    status(): ServerConnectionStatus

    /**
     * 获得当前连接的连接信息。
     */
    connectionInfo(): ServerConnectionInfo | null

    /**
     * 获得服务的一些静态信息。
     */
    staticInfo(): ServerStaticInfo

    /**
     * 强制关闭后台服务。
     */
    kill(): void

    /**
     * 连接状态发生改变的事件。
     */
    statusChangedEvent: Emitter<{ status: ServerConnectionStatus, info: ServerConnectionInfo | null, error: ServerConnectionError | null, appLoadStatus?: ServerServiceStatus }>

    /**
     * server ws接口所发送的事件。
     */
    wsToastEvent: Emitter<WsToastResult>
}

interface ServiceManager {
    /**
     * 获得当前server的加载状态。
     */
    status(): ServerServiceStatus

    /**
     * 对server进行初始化。
     * @param form
     */
    appInitialize(form: AppInitializeForm): Promise<void>

    /**
     * 向服务器发送一个请求。
     * @param config
     */
    request<T>(config: AxiosRequestConfig): Promise<Response<T>>

    /**
     * 加载状态发生改变的事件。
     */
    statusChangedEvent: Emitter<{ status: ServerServiceStatus }>
}

/**
 * 启动参数。
 */
interface ServerManagerOptions {
    /**
     * app数据目录。
     */
    userDataPath: string
    /**
     * app频道。
     */
    channel: string
    /**
     * 在调试模式运行。
     */
    debug?: {
        /**
         * 使用此Host提供的后台服务，用于后台业务开发。此时后台服务启动管理的功能大部分被禁用。
         */
        serverFromHost?: string
        /**
         * 使用此文件夹下的后台服务，用于管理器的调试。此时不从userData目录下寻找后台服务程序。
         */
        serverFromFolder?: string
    }
}

export function createServerManager(appdata: AppDataDriver, options: ServerManagerOptions): ServerManager {
    const connectionManager = createConnectionManager(appdata, options)
    const serviceManager = createServiceManager(connectionManager)

    return {
        connection: connectionManager,
        service: serviceManager
    }
}

function createConnectionManager(appdata: AppDataDriver, options: ServerManagerOptions) {
    const debugMode = !!options.debug
    const serverBinPath = options.debug?.serverFromFolder
        ? path.resolve(options.debug?.serverFromFolder, RESOURCE_FILE.SERVER.BIN)
        : path.resolve(options.userDataPath, DATA_FILE.RESOURCE.SERVER_FOLDER, RESOURCE_FILE.SERVER.BIN)
    const serverDir = path.resolve(options.userDataPath, DATA_FILE.APPDATA.CHANNEL_FOLDER, options.channel, DATA_FILE.APPDATA.CHANNEL.SERVER_DIR)
    const serverPIDPath = path.resolve(serverDir, DATA_FILE.APPDATA.CHANNEL.SERVER_PID)

    const statusChangedEvent = createEmitter<{ status: ServerConnectionStatus, info: ServerConnectionInfo | null, error: ServerConnectionError | null, appLoadStatus?: ServerServiceStatus }>()
    const wsToastEvent = createEmitter<WsToastResult>()

    let _desired: boolean = false
    let _status: ServerConnectionStatus = "CLOSE"
    let _connectionInfo: ServerConnectionInfo | null = null
    let _error: ServerConnectionError | null = null
    let _ws: Ws | null = null

    async function startConnectionListener() {
        if(!_desired) {
            setStatus({status: "CLOSE", info: null})
            return
        }

        setStatus({status: "CONNECTING", info: null, error: null})

        console.log("[ServerManager] Trying connect to server.")

        let serverStarted = false
        let pid: ServerConnectionInfo | null
        let health: ServerServiceStatus | null
        while(true) {
            if(!serverStarted) {
                //在不具备serverStarted标记的情况下，首先检查PID文件。如果不存在此文件，则尝试启动server
                pid = await checkForPIDFile(serverPIDPath)
                if(pid == null) {
                    startServerProcess(serverDir, debugMode, serverBinPath)
                    serverStarted = true
                }
            }
            if(serverStarted) {
                //已有serverStarted标记时，则直接检查PID文件，开始等待PID文件准备完毕
                //此处逻辑不与上一个if组合，因为上一个逻辑流程有可能在检查PID文件时直接将serverStarted置为true，从而复用这个流程
                pid = await waitingForPIDFile(serverPIDPath, 10000)
                if(pid == null) {
                    setStatus({status: "FAILED", info: null, error: {code: "PID_WAITING_TIMEOUT"}})
                    return
                }
            }

            if(!_desired) {
                setStatus({status: "CLOSE", info: null})
                return
            }

            //根据PID地址，尝试请求连接server的/app/health地址，以做连接检查
            try {
                health = await waitingForHealth(pid!.host, pid!.token, serverStarted ? 10000 : 5000)
            }catch (e) {
                setStatus({status: "FAILED", info: null, error: {code: "SERVER_REQUEST_ERROR", message: e instanceof Error ? e.message : `${e}`}})
                return
            }
            if(health == null) {
                if(serverStarted) {
                    //如果无法连接，且server是确定已经启动过的，那么报告错误
                    setStatus({ status: "FAILED", info: null, error: {code: "SERVER_WAITING_TIMEOUT"} })
                    return
                }else{
                    //如果无法连接，但还没尝试过启动server，那么先尝试启动server，然后从第1步重新开始
                    startServerProcess(serverDir, debugMode, serverBinPath)
                    serverStarted = true
                }
            }else{
                //已成功验证连接，则主动退出loop，进入下一步
                console.log(`[ServerManager] Successfully verified connection to server ${pid!.pid} (${pid!.host}). Server status is ${health}.`)
                break
            }
        }

        if(!_desired) {
            setStatus({status: "CLOSE", info: null})
            return
        }

        //通过之后，尝试建立ws连接。如果无法连接，则报告错误
        if(_ws != null) {
            _ws.terminate()
            _ws = null
        }
        try {
            _ws = await waitingForWsClient(pid!.host, pid!.token, { onMessage: onWsMessage, onClose: onWsClose })
            setStatus({status: "OPEN", info: pid!, error: null, appLoadStatus: health})
            console.log(`[ServerManager] Ws connection established.`)
        }catch (e) {
            setStatus({status: "FAILED", info: null, error: {code: "SERVER_CONNECT_ERROR", message: e instanceof Error ? e.message : `${e}`}})
        }
    }

    async function startConnectionListenerForRemote() {
        if(!_desired) {
            setStatus({status: "CLOSE", info: null})
            return
        }

        setStatus({status: "CONNECTING", info: null, error: null})

        if(!options.debug?.serverFromHost) {
            console.log(`[ServerManager] Trying connect to remote server (${appdata.getAppData().loginOption.remote!.host}).`)
        }else{
            console.log("[ServerManager] Trying connect to server. Module is working in debug mode.")
        }

        let health: ServerServiceStatus | null
        while(true) {
            //根据提供的debug地址，尝试请求连接server的/app/health地址，以做连接检查
            const host = options.debug?.serverFromHost ?? appdata.getAppData().loginOption.remote!.host
            const token = options.debug?.serverFromHost ? "dev" : appdata.getAppData().loginOption.remote!.token
            try {
                health = await waitingForHealth(host, token, 1000)
            }catch (e) {
                setStatus({status: "FAILED", info: null, error: {code: "SERVER_REQUEST_ERROR", message: e instanceof Error ? e.message : `${e}`}})
                console.log("[ServerManager] Trying connect to server failed. SERVER_REQUEST_ERROR.", e)
                return
            }
            if(health == null) {
                setStatus({ status: "FAILED", info: null, error: {code: "SERVER_WAITING_TIMEOUT"} })
                console.log("[ServerManager] Trying connect to server failed. SERVER_WAITING_TIMEOUT. try again.")
            }else{
                console.log(`[ServerManager] Successfully verified connection to server (${host}). Server status is ${health}.`)
                break
            }
        }

        //通过之后，尝试建立ws连接。如果无法连接，则报告错误
        if(_ws != null) {
            _ws.terminate()
            _ws = null
        }
        try {
            const host = options.debug?.serverFromHost ?? appdata.getAppData().loginOption.remote!.host
            const token = options.debug?.serverFromHost ? "dev" : appdata.getAppData().loginOption.remote!.token
            _ws = await waitingForWsClient(host, token, { onMessage: onWsMessage, onClose: startConnectionListenerForRemote })
            const info: ServerConnectionInfo = {pid: NaN, host, token, startTime: Date.now()}
            setStatus({status: "OPEN", info, error: null, appLoadStatus: health!})
            console.log(`[ServerManager] Ws connection established.`)
        }catch (e) {
            setStatus({status: "FAILED", info: null, error: {code: "SERVER_CONNECT_ERROR", message: e instanceof Error ? e.message : `${e}`}})
        }
    }

    function stopConnectionListener() {
        if(_ws != null) {
            _ws.terminate()
            _ws = null
        }
        setStatus({status: "CLOSE", info: null})
    }

    function onWsMessage(data: string) {
        wsToastEvent.emit(JSON.parse(data))
    }

    function onWsClose() {
        //监听到关闭消息时，尝试重连
        if(!_desired) {
            setStatus({status: "CLOSE", info: null})
            return
        }
        console.log("[ServerManager] Ws connection disconnected.")
        if(options.debug?.serverFromHost || (appdata.status() === "LOADED" && appdata.getAppData().loginOption.mode === "remote")) {
            startConnectionListenerForRemote().finally()
        }else{
            startConnectionListener().finally()
        }
    }

    function setStatus(s: {status?: ServerConnectionStatus, info?: ServerConnectionInfo | null, error?: ServerConnectionError | null, appLoadStatus?: ServerServiceStatus}) {
        const oldStatus = {status: _status, info: _connectionInfo, error: _error}
        const newStatus = {
            status: s.status !== undefined ? s.status : _status,
            info: s.info !== undefined ? s.info : _connectionInfo,
            error: s.error !== undefined ? s.error : _error,
            appLoadStatus: s.appLoadStatus
        }
        _status = newStatus.status
        _connectionInfo = newStatus.info
        _error = newStatus.error
        if(newStatus.status !== oldStatus.status || newStatus.info !== oldStatus.info || newStatus.error !== oldStatus.error) {
            statusChangedEvent.emit(newStatus)
        }
    }

    function status(): ServerConnectionStatus {
        return _status
    }

    function desired(value?: boolean): boolean {
        if(value !== undefined && value !== _desired) {
            _desired = value
            if(_desired) {
                if(options.debug?.serverFromHost || (appdata.status() === "LOADED" && appdata.getAppData().loginOption.mode === "remote")) {
                    startConnectionListenerForRemote().finally()
                }else{
                    startConnectionListener().finally()
                }
            }else{
                stopConnectionListener()
            }
        }
        return _desired
    }

    function connectionInfo(): ServerConnectionInfo | null {
        return _connectionInfo
    }

    function staticInfo(): ServerStaticInfo {
        return {logPath: path.resolve(serverDir, DATA_FILE.APPDATA.CHANNEL.SERVER_LOG)}
    }

    function kill() {
        if(_connectionInfo !== null && !isNaN(_connectionInfo.pid)) {
            killProcess(_connectionInfo.pid)
        }
    }

    return {
        desired,
        status,
        connectionInfo,
        staticInfo,
        kill,
        statusChangedEvent,
        wsToastEvent
    }
}

function createServiceManager(connectionManager: ConnectionManager): ServiceManager {
    let _status: ServerServiceStatus = "NOT_CONNECTED"

    const statusChangedEvent = createEmitter<{ status: ServerServiceStatus }>()

    function setStatus(status: ServerServiceStatus) {
        if(status !== _status) {
            _status = status
            statusChangedEvent.emit({ status })
        }
    }

    function status(): ServerServiceStatus {
        return _status
    }

    async function appInitialize(data: AppInitializeForm): Promise<void> {
        if(_status === "NOT_INITIALIZED" && connectionManager.status() === "OPEN" && connectionManager.connectionInfo() !== null) {
            const info = connectionManager.connectionInfo()!
            const res = await request({url: `http://${info.host}/app/initialize`, method: 'POST', headers: {'Authorization': `Bearer ${info.token}`}, data})
            if(!res.ok) {
                throw new Error(`App initialize failed. ${res.message}`)
            }
        }else{
            throw new Error("App cannot be initialized.")
        }
    }

    async function requestToServer<T>(config: AxiosRequestConfig): Promise<Response<T>> {
        const token = connectionManager.connectionInfo()!.token
        const host = connectionManager.connectionInfo()!.host
        return request({...config, baseURL: `http://${host}`, headers: {'Authorization': `Bearer ${token}`}})
    }

    connectionManager.statusChangedEvent.addEventListener(({ status, info, appLoadStatus  }) => {
        if(status === "OPEN" && info !== null) {
            //connection可用时，主动请求一次状态
            if(appLoadStatus !== undefined) {
                setStatus(appLoadStatus)
            }else{
                console.warn("[ServerManager] Connection is opened but appLoadStatus is undefined.")
            }
        }else{
            //connection不可用时，总是将状态重置为NOT_CONNECTED
            setStatus("NOT_CONNECTED")
        }
    })
    connectionManager.wsToastEvent.addEventListener(e => {
        //接收来自ws通知的appStatus变更事件。仅在connection状态可用时响应
        if(e.type === "EVENT" && connectionManager.status() === "OPEN") {
            if(e.data.eventType === "app/app-status/changed") {
                setStatus((<{status: ServerServiceStatus}>e.data.events[e.data.events.length - 1].event).status)
            }
        }
    })

    return {
        status,
        statusChangedEvent,
        appInitialize,
        request: requestToServer
    }
}

/**
 * 检查并收集pid文件内容。
 */
async function checkForPIDFile(filepath: string): Promise<ServerConnectionInfo | null> {
    const serverPID = await readFile<ServerPIDFile>(filepath)
    return serverPID != null && serverPID.port != null && serverPID.token != null ? {pid: serverPID!.pid, host: `127.0.0.1:${serverPID!.port}`, token: serverPID!.token, startTime: serverPID!.startTime} : null
}

/**
 * 轮询等待，直到pid文件可用，或者超出最大等待时间。
 */
async function waitingForPIDFile(filepath: string, timeout: number = 10000): Promise<ServerConnectionInfo | null> {
    let interval = 0
    for(let i = 0; i < timeout; i += interval) {
        await sleep(interval)
        const result = await checkForPIDFile(filepath)
        if(result != null) return result
        if(interval < 200) interval += 50
    }
    return null
}

/**
 * 检查server服务是否可用，并报告server的健康检查状态。
 * @throws Error 如果接口返回API错误，则构造一个Error异常并抛出。
 */
async function checkForHealth(host: string, token: string): Promise<ServerServiceStatus | null> {
    const res = await request({url: `http://${host}/app/health`, method: 'GET', headers: {'Authorization': `Bearer ${token}`}})
    if(res.ok) {
        return (<{status: ServerServiceStatus}>res.data).status
    }else if(res.status) {
        throw new Error(`[${res.status}] ${res.code}: ${res.message}`)
    }else{
        return null
    }
}

/**
 * 轮询等待，直到server服务可用，或超出最大等待时间。
 * @throws Error 如果接口返回API错误，则构造一个Error异常并抛出。
 */
async function waitingForHealth(host: string, token: string, timeout: number = 10000): Promise<ServerServiceStatus | null> {
    let interval = 0
    for(let i = 0; i < timeout; i += interval) {
        await sleep(interval)
        const result = await checkForHealth(host, token)
        if(result != null) return result
        if(interval < 200) interval += 50
    }
    return null
}

/**
 * 与Ws建立连接，并直到open事件发生之后，返回客户端。
 */
function waitingForWsClient(host: string, token: string, events?: WsClientEvent): Promise<Ws | null> {
    return new Promise((resolve, reject) => {
        let ws: Ws
        try {
            const base = host.startsWith("http://") ? `ws://${host.substring("http://".length)}` : host.startsWith("https://") ? `wss://${host.substring("wss://".length)}` : host.startsWith("ws://") || host.startsWith("wss://") ? host : `ws://${host}`
            ws = new Ws(`${base}/websocket?access_token=${token}`)
        }catch (e) {
            reject(e)
            return
        }
        if(events?.onMessage) ws.on("message", (data) => events.onMessage!((<Buffer>data).toString()))
        if(events?.onClose) ws.on("close", events.onClose)
        if(events?.onError) ws.on("error", events.onError)
        ws.on("open", () => resolve(ws))
    })
}

/**
 * 启动server进程。
 */
function startServerProcess(serverDir: string, debugMode: boolean, serverBinPath: string) {
    const baseArgs = ['--dir', serverDir]
    const debugModeArgs = debugMode ? ['--force-token', 'dev'] : []
    const args = [...baseArgs, ...debugModeArgs]
    const s = spawn(serverBinPath, args, {
        detached: true,
        stdio: ["ignore", "ignore", "ignore"]
    })
    s.unref()

    console.log(`[ServerManager] Start server process: ${serverBinPath} ${args.join(" ")}`)
}

interface WsClientEvent {
    onMessage?(data: string): void
    onError?(e: Error): void
    onClose?(code: number): void
}
