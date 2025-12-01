import { app } from "electron"
import { createChannel } from "@/components/channel"
import { createAppDataDriver } from "@/components/appdata"
import { createResourceManager } from "@/components/resource"
import { createServerManager } from "@/components/server"
import { createStateManager } from "@/components/state"
import { createStorageManager } from "@/components/storage"
import { createLocalManager } from "@/components/local"
import { createLevelManager } from "@/components/level"
import { panic } from "@/exceptions"
import { getNodePlatform } from "@/utils/process"
import { registerGlobalIpcRemoteEvents } from "./ipc"
import { createMenuManager } from "./menu"
import { registerAppEvents } from "./event"
import { createThemeManager } from "./theme"
import { createWindowManager } from "./window"
import { registerProtocol, registerRendererProtocol } from "./protocol"


/**
 * app的启动参数。
 */
export interface AppOptions {
    /**
     * app读取的数据频道。
     */
    channel?: string
    /**
     * app以开发调试模式启动。
     */
    debug?: DebugOption
}

/**
 * 以调试模式启动。在调试模式下，软件的配置尽量贴近开发环境并提供调试方法。
 * - 允许前端打开devtool调试。
 * - 使用开发模式的服务后台。
 * - 使用开发模式的前端。
 * - 将数据存放在本地目录下，隔离生产目录。
 */
interface DebugOption {
    /**
     * 本地的开发数据目录。此目录对应的是生产环境下的appData目录。
     */
    localDataPath?: string
    /**
     * 使用此URL提供的前端。此选项主要用于前端的业务开发。
     */
    frontendFromURL?: string
    /**
     * 使用此文件夹下的前端资源。此选项主要用于前端在生产模式下的调试。
     */
    frontendFromFolder?: string
    /**
     * 使用此host地址提供的后台服务。此选项主要用于后台服务的业务开发。
     */
    serverFromHost?: string
    /**
     * 使用此文件夹下的后台服务资源。此选项主要用于后台服务启动管理功能的调试。
     */
    serverFromFolder?: string
    /**
     * 使用此压缩包提供的后台服务资源。此选项主要用于后台服务解压同步功能的调试。
     */
    serverFromResource?: string
}

export async function createApplication(options?: AppOptions) {
    const platform = getNodePlatform()
    const debugMode = !!options?.debug
    const userDataPath = options?.debug?.localDataPath ?? app.getPath("userData")
    const appPath = app.getAppPath()

    try {
        const channelManager = await createChannel({userDataPath, defaultChannel: "default", manualChannel: options?.channel})

        const appDataDriver = createAppDataDriver({userDataPath, channel: channelManager.currentChannel()})

        const storageManager = createStorageManager(appDataDriver, {userDataPath, channel: channelManager.currentChannel()})

        const levelManager = createLevelManager({userDataPath, channel: channelManager.currentChannel()})

        const resourceManager = createResourceManager(appDataDriver, {userDataPath, appPath, debug: options?.debug && {serverFromResource: options.debug.serverFromResource}})

        const serverManager = createServerManager(appDataDriver, {userDataPath, platform, channel: channelManager.currentChannel(), debug: options?.debug && {serverFromHost: options.debug.serverFromHost, serverFromFolder: options.debug.serverFromFolder}})

        const themeManager = createThemeManager(appDataDriver)

        const stateManager = createStateManager(appDataDriver, themeManager, resourceManager, serverManager)

        const windowManager = createWindowManager(stateManager, themeManager, storageManager, {platform, debug: options?.debug && {frontendFromFolder: options.debug.frontendFromFolder, frontendFromURL: options.debug.frontendFromURL}})

        const localManager = createLocalManager(appDataDriver, levelManager, serverManager, stateManager, {userDataPath, channel: channelManager.currentChannel()})

        const menuManager = createMenuManager(stateManager, localManager, windowManager, platform)

        registerProtocol(stateManager, windowManager)
        registerAppEvents(windowManager, serverManager, platform)
        registerGlobalIpcRemoteEvents(appDataDriver, channelManager, serverManager, stateManager, localManager, themeManager, menuManager, windowManager, {debugMode, userDataPath, platform})

        if(debugMode) registerErrorHandler()

        await appDataDriver.load()
        await Promise.all([resourceManager.load(), localManager.file.load()])
        await app.whenReady()

        registerRendererProtocol(localManager)

        menuManager.load()
        themeManager.load()
        stateManager.load()
        windowManager.load()

    }catch (e) {
        panic(e)
    }
}

function registerErrorHandler() {
    process.on("uncaughtException", (error) => {
        if (error.message.includes("ReadableStream is already closed")) {
            console.log(`忽略 ReadableStream 关闭错误: ${error.message}`)
            return
        }
        console.error("未捕获的异常:", error)
    })
    
    process.on("unhandledRejection", (reason, promise) => {
        if (reason instanceof Error && reason.message.includes("ReadableStream is already closed")) {
            console.log(`忽略 ReadableStream Promise 拒绝: ${reason.message}`)
            return
        }
        console.error("未处理的 Promise 拒绝:", reason)
    })
}