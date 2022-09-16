import { systemPreferences } from "electron"
import { AppDataDriver } from "../appdata"
import { ResourceManager, ResourceStatus } from "../resource"
import { ServerManager } from "../server"
import { panic } from "../../exceptions"
import { createEmitter, Emitter } from "../../utils/emitter"
import { AppState, AppInitializeForm, LoginForm, InitializeState } from "./model"
import { ThemeManager } from "../../application/theme"

/**
 * 对客户端app的状态进行管理。处理从加载到登录的一系列状态和伴生操作。
 */
export interface StateManager {
    /**
     * 加载此模块，也开启app的加载流程。加载流程是用户态的，因此不会异步等待。
     * 如果app已经初始化，就执行加载流程。
     */
    load(): void

    /**
     * 查看当前state状态。
     */
    state(): AppState

    /**
     * 执行对整个App的初始化操作。
     * 此方法将：初始化client的存储; 第一次加载resource; 启动server并执行对server的初始化。
     * 只能在NOT_INITIALIZED状态下调用，否则调用是无效的。
     */
    appInitialize(form: AppInitializeForm): void

    /**
     * 登录。
     * 只能在NOT_LOGIN状态下调用，否则总是返回false。
     */
    login(form: LoginForm): Promise<boolean>

    /**
     * app state状态变化的事件。
     */
    stateChangedEvent: Emitter<{ state: AppState }>

    /**
     * app初始化过程中的更新事件通知。
     */
    initializeEvent: Emitter<{ state: InitializeState }>
}

export function createStateManager(appdata: AppDataDriver, theme: ThemeManager, resource: ResourceManager, server: ServerManager): StateManager {
    const stateChangedEvent = createEmitter<{ state: AppState }>()
    const initializeEvent = createEmitter<{ state: InitializeState }>()
    const awaiter = createServerAwaiter(server)

    let _state: AppState = "NOT_INITIALIZED"

    function setState(state: AppState) {
        if(state !== _state) {
            _state = state
            stateChangedEvent.emit({ state })
        }
    }

    function state(): AppState {
        return _state
    }

    async function asyncLoad() {
        //此方法异步执行标准流程下的App加载操作

        //首先检查resource，是否是需要升级的或者未初始化的
        if(resource.status() == ResourceStatus.NEED_UPDATE || resource.status() == ResourceStatus.NOT_INIT) {
            setState("LOADING_RESOURCE")
            await resource.update()
        }

        //然后进行登录验证检查
        if(!appdata.getAppData().loginOption.password) {
            //没有密码的情况下，直接走afterLogin登录
            await afterLogin()
        }else{
            if(appdata.getAppData().loginOption.fastboot) {
                //fastboot模式下，server会直接启动
                server.connection.desired(true)
            }

            setState("NOT_LOGIN")
        }
    }

    async function asyncInitialize(form: AppInitializeForm) {
        //执行初始化流程

        try {
            //初始化appdata数据存储
            initializeEvent.emit({state: "INITIALIZING_APPDATA"})
            await appdata.init()
            await appdata.saveAppData(d => d.loginOption.password = form.password)
            if(form.theme !== null) await theme.setTheme(form.theme)

            //初始化资源
            initializeEvent.emit({state: "INITIALIZING_RESOURCE"})
            await resource.update()

            //启动server
            initializeEvent.emit({state: "INITIALIZING_SERVER"})
            server.connection.desired(true)

            //等待server connection状态切换至可用
            await awaiter.waitForConnectionReady()

            //初始化server
            initializeEvent.emit({state: "INITIALIZING_SERVER_DATABASE"})
            await server.service.appInitialize({storagePath: form.storagePath ?? undefined})

            //等待server service状态切换至可用
            await awaiter.waitForServiceReady()

            setState("READY")
            initializeEvent.emit({state: "FINISH"})
        }catch (e) {
            console.error("[AppState] Initializing app failed. ", e)
            initializeEvent.emit({state: "ERROR"})
        }
    }

    async function afterLogin() {
        //此方法确认登录成功状态，并在登录成功后，处理状态相关变化

        //启动一次server。不需要在意重复调用
        server.connection.desired(true)

        setState("LOADING_SERVER")

        //等待server状态完全切换至可用，然后设置state为READY
        await awaiter.waitForServiceReady()
        setState("READY")
    }

    function load() {
        if(appdata.status() === "LOADED") {
            setState("LOADING")
            asyncLoad().catch(e => panic(e))
        }
    }

    function appInitialize(form: AppInitializeForm) {
        if(_state === "NOT_INITIALIZED") {
            asyncInitialize(form).catch(e => panic(e))
        }
    }

    async function login(form: LoginForm): Promise<boolean> {
        if(_state === "NOT_LOGIN") {
            if(form.password !== undefined) {
                const truePassword = appdata.getAppData().loginOption.password
                if(truePassword == null || form.password === truePassword) {
                    afterLogin().finally()
                    return true
                }
            }else if(form.touchId && systemPreferences.canPromptTouchID()) {
                try {
                    await systemPreferences.promptTouchID("进行登录认证")
                }catch (e) {
                    return false
                }
                afterLogin().finally()
                return true
            }
        }
        return false
    }

    return {load, state, appInitialize, login, stateChangedEvent, initializeEvent}
}

function createServerAwaiter(server: ServerManager) {
    const connectionCache: (() => void)[] = []
    const serviceCache: (() => void)[] = []

    function execute(elements: (() => void)[]) {
        if(elements.length) {
            for (const element of elements) {
                element()
            }
            elements.splice(0, elements.length)
        }
    }

    server.connection.statusChangedEvent.addEventListener(({ status }) => {
        if(status === "OPEN") {
            execute(connectionCache)
        }
    })
    server.service.statusChangedEvent.addEventListener(({ status }) => {
        if(status === "READY") {
            execute(serviceCache)
        }
    })

    async function waitForConnectionReady(): Promise<void> {
        if(server.connection.status() === "OPEN") {
            return
        }

        return new Promise(resolve => {
            if(server.connection.status() === "OPEN") {
                resolve()
            }else{
                connectionCache.push(resolve)
            }
        })
    }

    async function waitForServiceReady(): Promise<void> {
        if(server.service.status() === "READY") {
            return
        }

        return new Promise(resolve => {
            if(server.service.status() === "READY") {
                resolve()
            }else{
                serviceCache.push(resolve)
            }
        })
    }

    return {waitForConnectionReady, waitForServiceReady}
}
