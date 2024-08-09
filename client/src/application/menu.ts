import { app, BrowserWindow, Menu, shell } from "electron"
import { WindowManager } from "./window"
import { FileWatcher } from "../components/local/file-watcher"
import { StateManager } from "../components/state"
import { LocalManager } from "../components/local"
import { Platform } from "../utils/process"
import { createEmitter, Emitter, SendEmitter } from "../utils/emitter"

export interface MenuManager {
    load(): void
    tabs: {
        updateState(winId: number, state: UpdateStateOptions): void
        controlEvent: Emitter<TabControlEvent>
    }
}

export interface UpdateStateOptions { enabled: boolean }

export type TabControlEvent = {type: "CLONE_TAB" | "PREV_TAB" | "NEXT_TAB" | "CLOSE_TAB" | "ROUTE_BACK" | "ROUTE_FORWARD"}
    | {type: "NEW_TAB", routeName?: string, path?: string, params?: string, initializer?: string}

type GeneralEvent = {type: "TOGGLE_AUTO_IMPORT", value: boolean}

export function createMenuManager(state: StateManager, local: LocalManager, windowManager: WindowManager, platform: Platform): MenuManager {
    const isDarwin = platform === "darwin"

    const tabControlEvent = createEmitter<TabControlEvent>()

    const generalEvent = createEmitter<GeneralEvent>()

    const menu = registerAppMenu(windowManager, tabControlEvent, generalEvent, isDarwin)

    const tabs = registerTabModule(windowManager, tabControlEvent, menu)

    registerImportModule(state, local.fileWatcher, menu, generalEvent)

    return {
        load() {
            registerDockMenu(windowManager, isDarwin)
        },
        tabs: {
            updateState: tabs.updateState,
            controlEvent: tabControlEvent
        }
    }
}

function registerAppMenu(windowManager: WindowManager, tabControlEvent: SendEmitter<TabControlEvent>, generalEvent: SendEmitter<GeneralEvent>, isDarwin: boolean) {
    const menu = Menu.buildFromTemplate([
        {
            label: "Hedge",
            role: "fileMenu",
            submenu: [
                {label: "关于Hedge", role: "about"},
                {type: "separator"},
                {label: "便签", accelerator: isDarwin ? "Command+U" : "Ctrl+U", click() { windowManager.openNoteWindow() }},
                {label: "偏好设置", accelerator: isDarwin ? "Command+," : "Ctrl+,", click() { windowManager.openSettingWindow() }},
                {type: "separator"},
                {label: "启用自动导入", id: "AUTO_IMPORT", type: "checkbox", accelerator: isDarwin ? "Command+Shift+O" : "Ctrl+Shift+O", click(e) { generalEvent.emit({type: "TOGGLE_AUTO_IMPORT", value: e.checked}) }},
                ...(isDarwin ? [
                    {type: "separator"},
                    {label: "服务", role: "services"},
                    {type: "separator"},
                    {label: "隐藏Hedge", role: "hide"},
                    {label: "隐藏其他应用", role: "hideOthers"},
                    {label: "取消隐藏", role: "unhide"},
                ] as const : []),
                {type: "separator"},
                {label: "退出Hedge", role: "quit"},
            ]
        },
        {
            label: "编辑",
            role: "editMenu",
            submenu: [
                {label: "撤销", role: "undo"},
                {label: "重做", role: "redo"},
                {type: "separator"},
                {label: "剪切", role: "cut"},
                {label: "复制", role: "copy"},
                {label: "粘贴", role: "paste"},
                {type: "separator"},
                {label: "删除", role: "delete"},
                {label: "全选", role: "selectAll"}
            ]
        },
        {
            label: "显示",
            role: "viewMenu",
            submenu: [
                {label: "重新加载", accelerator: isDarwin ? "Command+Shift+R" : "Ctrl+Shift+R", role: "reload"},
                {label: "开发者工具", role: "toggleDevTools"},
                {type: "separator"},
                {label: "全屏", role: "togglefullscreen"}
            ]
        },
        {
            label: "标签页",
            submenu: [
                {label: "选择上一个标签页", id: "TAB_PREV", enabled: false, accelerator: "Ctrl+Shift+Tab", click() { tabControlEvent.emit({type: "PREV_TAB"}) }},
                {label: "选择下一个标签页", id: "TAB_NEXT", enabled: false, accelerator: "Ctrl+Tab", click() { tabControlEvent.emit({type: "NEXT_TAB"}) }},
                {label: "复制标签页", id: "TAB_CLONE", enabled: false, click() { tabControlEvent.emit({type: "CLONE_TAB"}) }},
                {label: "新建标签页", id: "TAB_NEW", enabled: false, accelerator: isDarwin ? "Command+T" : "Ctrl+T", click() { tabControlEvent.emit({type: "NEW_TAB"}) }},
                {label: "关闭标签页", accelerator: isDarwin ? "Command+W" : "Ctrl+W", click() { tabControlEvent.emit({type: "CLOSE_TAB"}) }},
                {type: "separator"},
                {label: "后退", id: "TAB_BACK", enabled: false, accelerator: isDarwin ? "Command+Left" : "Ctrl+Left", click() { tabControlEvent.emit({type: "ROUTE_BACK"}) }},
                {label: "前进", id: "TAB_FORWARD", enabled: false, accelerator: isDarwin ? "Command+Right" : "Ctrl+Right", click() { tabControlEvent.emit({type: "ROUTE_FORWARD"}) }}
            ]
        },
        {
            label: "窗口",
            role: "windowMenu",
            submenu: [
                {label: "最小化", role: "minimize"},
                {label: "缩放", role: "zoom"},
                {label: "关闭窗口", visible: false, role: "close", accelerator: isDarwin ? "Command+Shift+W" : "Ctrl+Shift+W"},
                {type: "separator"},
                {label: "新建窗口", accelerator: isDarwin ? "Command+N" : "Ctrl+N", click() { windowManager.createWindow() }}
            ]
        },
        {
            label: "帮助",
            role: "help",
            submenu: [
                {label: "帮助向导", accelerator: isDarwin ? "Command+?" : "Ctrl+?", click() { windowManager.openGuideWindow() }},
                {type: "separator"},
                {label: "Github", async click() { await shell.openExternal("https://github.com/HeerKirov/Hedge-v3") }}
            ]
        }
    ])

    Menu.setApplicationMenu(menu)

    return menu
}

function registerDockMenu(windowManager: WindowManager, isDarwin: boolean) {
    if(isDarwin) {
        app.dock.setMenu(Menu.buildFromTemplate([
            {label: "新建窗口", click() { windowManager.createWindow() }}
        ]))
    }
}

function registerTabModule(windowManager: WindowManager, tabControlEvent: Emitter<TabControlEvent>, menu: Menu) {
    const enabledWindows = new Set<number>()
    let focusWinId: number | null = null

    tabControlEvent.addEventListener(e => {
        if(e.type === "CLOSE_TAB") {
            const win = BrowserWindow.getFocusedWindow()
            if(win !== null && !enabledWindows.has(win.id)) {
                win.close()
            }
        }
    })

    windowManager.windowEvent.addEventListener(e => {
        if(e.type === "CLOSED") {
            enabledWindows.delete(e.windowId)
            if(e.windowId === focusWinId) apply(false)
        }else if(e.type === "FOCUS") {
            focusWinId = e.windowId
            apply(enabledWindows.has(focusWinId))
        }
    })

    function updateState(winId: number, state: UpdateStateOptions) {
        if(!state.enabled) {
            enabledWindows.delete(winId)
            if(winId === focusWinId) apply(false)
        }else if(!enabledWindows.has(winId)) {
            enabledWindows.add(winId)
            if(winId === focusWinId) apply(true)
        }
    }

    function apply(enabled: boolean) {
        menu.getMenuItemById("TAB_PREV")!.enabled = enabled
        menu.getMenuItemById("TAB_NEXT")!.enabled = enabled
        menu.getMenuItemById("TAB_CLONE")!.enabled = enabled
        menu.getMenuItemById("TAB_NEW")!.enabled = enabled
        menu.getMenuItemById("TAB_BACK")!.enabled = enabled
        menu.getMenuItemById("TAB_FORWARD")!.enabled = enabled
    }

    return {updateState}
}

function registerImportModule(state: StateManager, fileWatcher: FileWatcher, menu: Menu, generalEvent: SendEmitter<GeneralEvent>) {
    let isPathWatcherOpen: boolean = false

    generalEvent.addEventListener(async e => {
        if(e.type === "TOGGLE_AUTO_IMPORT" && e.value !== isPathWatcherOpen && state.state() === "READY") {
            fileWatcher.setOpen(e.value)
            menu.getMenuItemById("AUTO_IMPORT")!.checked = isPathWatcherOpen = fileWatcher.status().isOpen
            Menu.setApplicationMenu(menu)
        }
    })

    fileWatcher.fileWatcherChangedEvent.addEventListener(status => {
        if(isPathWatcherOpen !== status.isOpen) {
            menu.getMenuItemById("AUTO_IMPORT")!.checked = isPathWatcherOpen = status.isOpen
            Menu.setApplicationMenu(menu)
        }
    })
}