import * as path from "path"
import { BrowserWindow, BrowserWindowConstructorOptions } from "electron"
import { Platform } from "../utils/process"
import { StateManager } from "../components/state"
import { APP_FILE, RESOURCE_FILE } from "../constants/file"
import { registerWindowIpcRemoteEvent } from "./ipc"
import { ThemeManager } from "./theme"

/**
 * electron的窗口管理器。管控窗口的建立。
 * 窗口管理器会区分不同业务的窗口。
 */
export interface WindowManager {
    /**
     * 初始化加载。并没有什么业务要加载，主要是告知window manager程序已经可用。
     */
    load(): void
    /**
     * 创建一个承载一般业务的普通窗口。
     */
    createWindow(url?: string): BrowserWindow | null
    /**
     * 打开guide窗口。
     */
    openGuideWindow(): BrowserWindow | null
    /**
     * 打开设置窗口。
     */
    openSettingWindow(): BrowserWindow | null
    /**
     * 获得全部窗口列表。
     */
    getAllWindows(): BrowserWindow[]
}

export interface WindowManagerOptions {
    platform: Platform
    debug?: {
        frontendFromURL?: string
        frontendFromFolder?: string
    }
}

export function createWindowManager(state: StateManager, theme: ThemeManager, options: WindowManagerOptions): WindowManager {
    let ready = false
    let guideWindow: BrowserWindow | null = null
    let settingWindow: BrowserWindow | null = null

    const icon = createNativeIcon(options.platform, !!options.debug)

    function newBrowserWindow(hashURL: string, configure: BrowserWindowConstructorOptions = {}): BrowserWindow {
        const win = new BrowserWindow({
            icon,
            title: "Hedge",
            height: 720,
            width: options.debug ? 1440 : 1080,
            minHeight: 480,
            minWidth: 640,
            webPreferences: {
                sandbox: false,
                devTools: true,
                preload: path.join(__dirname, 'ipc/preload.js'),
            },
            autoHideMenuBar: true,
            backgroundColor: theme.getRuntimeTheme() === "dark" ? "#111417" : "#FFFFFF",
            ...configure
        })

        if(options.debug) {
            win.webContents.openDevTools()
        }

        registerWindowIpcRemoteEvent(win)

        if(options.debug?.frontendFromURL) {
            win.loadURL(options.debug.frontendFromURL + (hashURL ? `#${hashURL}` : '')).finally(() => {})
        }else if(options.debug?.frontendFromFolder) {
            win.loadFile(path.join(options.debug.frontendFromFolder, RESOURCE_FILE.FRONTEND.INDEX), {hash: hashURL}).finally(() => {})
        }else{
            win.loadFile(path.join(APP_FILE.FRONTEND_FOLDER, RESOURCE_FILE.FRONTEND.INDEX), {hash: hashURL}).finally(() => {})
        }
        return win
    }

    function load() {
        //在load之前，禁止通过任何方式打开窗口，防止在loaded之前的意外的前端加载。
        ready = true
        //load时，打开第一个默认窗口
        createWindow()
    }

    function createWindow(url?: string): BrowserWindow | null {
        if(!ready || state.state() !== "READY") {
            //在未登录时，只允许开启一个主要窗口。开启第二窗口只会去唤醒已有窗口。
            for (const window of BrowserWindow.getAllWindows()) {
                if(window != guideWindow && window != settingWindow) {
                    window.show()
                    return window
                }
            }
        }
        return newBrowserWindow(url || "")
    }

    function openSettingWindow(): BrowserWindow | null {
        if(!ready || state.state() !== "READY") {
            return null
        }
        if(settingWindow == null) {
            settingWindow = newBrowserWindow('/setting')
            settingWindow.on("closed", () => {
                settingWindow = null
            })
        }else{
            settingWindow.show()
        }
        return settingWindow
    }

    function openGuideWindow(): BrowserWindow | null {
        if(!ready) {
            return null
        }
        if(guideWindow == null) {
            guideWindow = newBrowserWindow('/guide')
            guideWindow.on("closed", () => {
                guideWindow = null
            })
        }else{
            guideWindow.show()
        }
        return guideWindow
    }

    return {
        load,
        createWindow,
        openGuideWindow,
        openSettingWindow,
        getAllWindows: BrowserWindow.getAllWindows
    }
}

function createNativeIcon(platform: Platform, debug: boolean) {
    if(platform === "linux") {
        return debug ? path.join(__dirname, "../../build/linux/files/hedge.png") : path.join(__dirname, "../../../hedge.png")
    }else if(platform === "win32") {
        return debug ? path.join(__dirname, "../../build/win32/files/hedge.ico") : path.join(__dirname, "../../../hedge.ico")
    }else{
        return undefined
    }
}
