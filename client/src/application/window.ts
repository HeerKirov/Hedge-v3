import * as path from "path"
import { BrowserWindow, BrowserWindowConstructorOptions } from "electron"
import { Platform } from "../utils/process"
import { StateManager } from "../components/state"
import { StorageManager } from "../components/storage"
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
     * 打开note窗口。
     */
    openNoteWindow(): BrowserWindow | null
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

export function createWindowManager(state: StateManager, theme: ThemeManager, storage: StorageManager, options: WindowManagerOptions): WindowManager {
    let ready = false
    let noteWindow: BrowserWindow | null = null
    let guideWindow: BrowserWindow | null = null
    let settingWindow: BrowserWindow | null = null

    const icon = createNativeIcon(options.platform, !!options.debug)
    const boundManager = createWindowBoundManager(storage)

    function newBrowserWindow(hashURL: string, configure: BrowserWindowConstructorOptions = {}): BrowserWindow {
        const pathname = boundManager.getPathname(hashURL)

        const { width, height, ...config } = configure
        const defaultBound = width && height ? {width, height} : undefined
        const windowBound = boundManager.getWindowConfiguration(pathname, defaultBound)

        const win = new BrowserWindow({
            icon,
            title: "Hedge",
            minHeight: 480,
            minWidth: 640,
            webPreferences: {
                sandbox: false,
                devTools: true,
                preload: path.join(__dirname, 'ipc/preload.js'),
            },
            autoHideMenuBar: true,
            backgroundColor: theme.getRuntimeTheme() === "dark" ? "#111417" : "#FFFFFF",
            ...windowBound,
            ...config
        })

        if(options.debug) {
            win.on("ready-to-show", () => {
                win.webContents.openDevTools()
            })
        }

        boundManager.register(win, pathname)

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
        boundManager.load().then(() => {
            //在load之前，禁止通过任何方式打开窗口，防止在loaded之前的意外的前端加载。
            ready = true
            //load时，打开第一个默认窗口
            createWindow()
        })
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
            settingWindow = newBrowserWindow('/setting', {width: 1080, height: 720})
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
            guideWindow = newBrowserWindow('/guide', {width: 1080, height: 640})
            guideWindow.on("closed", () => {
                guideWindow = null
            })
        }else{
            guideWindow.show()
        }
        return guideWindow
    }

    function openNoteWindow(): BrowserWindow | null {
        if(!ready) {
            return null
        }
        if(noteWindow == null) {
            noteWindow = newBrowserWindow('/note', {width: 480, height: 640, minWidth: 240, minHeight: 320, fullscreenable: false, maximizable: false})
            noteWindow.on("closed", () => {
                noteWindow = null
            })
        }else{
            noteWindow.show()
        }
        return noteWindow
    }

    return {
        load,
        createWindow,
        openNoteWindow,
        openGuideWindow,
        openSettingWindow,
        getAllWindows: BrowserWindow.getAllWindows
    }
}

function createWindowBoundManager(storage: StorageManager) {
    let bounds: {[pathname: string]: WindowBound | undefined} = {}

    async function load() {
        const s = storage.isEnabled() ? await storage.get<{[pathname: string]: WindowBound}>("window") : undefined
        if(s !== undefined) bounds = s
    }

    function getPathname(hashURL: string) {
        const idx = hashURL.indexOf("?")
        const p = idx >= 0 ? hashURL.substring(0, idx) : hashURL
        const p2 = p.startsWith("/") ? p.substring(1) : p
        return p2 || "__default__"
    }

    function getWindowConfiguration(pathname: string, defaultBound?: {width?: number, height?: number}): BrowserWindowConstructorOptions {
        const bound = bounds[pathname]
        if(bound !== undefined) {
            return {fullscreen: bound.fullscreen, x: bound.x, y: bound.y, width: bound.width, height: bound.height}
        }else{
            return {width: defaultBound?.width ?? 1280, height: defaultBound?.height ?? 720}
        }
    }

    function register(win: BrowserWindow, pathname: string) {
        const bound = bounds[pathname]
        if(bound !== undefined) {
            win.setBounds({})
            if(bound.fullscreen) win.setFullScreen(true)
            else if(bound.maximized) win.maximize()
        }

        win.on("close", () => {
            if(storage.isEnabled()) {
                const current = bounds[pathname]
                const newBound = {fullscreen: win.isFullScreen(), maximized: win.isMaximized(), ...win.getNormalBounds()}
                if(current === undefined || newBound.fullscreen !== current.fullscreen || newBound.maximized !== current.maximized || newBound.x !== current.x || newBound.y !== current.y || newBound.width !== current.width || newBound.height !== current.height) {
                    bounds[pathname] = newBound
                    storage.set("window", bounds).finally()
                }
            }
        })
    }

    return {load, getPathname, getWindowConfiguration, register}
}

interface WindowBound {
    fullscreen: boolean
    maximized: boolean
    x: number
    y: number
    width: number
    height: number
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
