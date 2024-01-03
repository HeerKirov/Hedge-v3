import { app, Menu, shell } from "electron"
import { WindowManager } from "./window"
import { ServerManager } from "../components/server"
import { Platform } from "../utils/process"
import { createEmitter, Emitter, SendEmitter } from "../utils/emitter"

export interface MenuManager {
    load(): void
    tabs: {
        controlEvent: Emitter<TabControlEvent>
    }
}

export type TabControlEvent = "NEW_TAB" | "CLONE_TAB" | "PREV_TAB" | "NEXT_TAB" | "CLOSE_TAB" | "ROUTE_BACK" | "ROUTE_FORWARD"

type GeneralEvent = {type: "TOGGLE_AUTO_IMPORT", value: boolean}

export function createMenuManager(server: ServerManager, windowManager: WindowManager, platform: Platform): MenuManager {
    const isDarwin = platform === "darwin"

    const tabControlEvent = createEmitter<TabControlEvent>()

    const generalEvent = createEmitter<GeneralEvent>()

    const menu = registerAppMenu(windowManager, tabControlEvent, generalEvent, isDarwin)

    registerImportModule(server, menu, generalEvent)

    return {
        load() {
            registerDockMenu(windowManager, isDarwin)
        },
        tabs: {
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
                {label: "便签", accelerator: isDarwin ? "Command+Y" : "Ctrl+Y", click() { windowManager.openNoteWindow() }},
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
            id: "TAB",
            submenu: [
                {label: "选择上一个标签页", accelerator: "Ctrl+Shift+Tab", click() { tabControlEvent.emit("PREV_TAB") }},
                {label: "选择下一个标签页", accelerator: "Ctrl+Tab", click() { tabControlEvent.emit("NEXT_TAB") }},
                {label: "复制标签页", click() { tabControlEvent.emit("CLONE_TAB") }},
                {label: "新建标签页", accelerator: isDarwin ? "Command+T" : "Ctrl+T", click() { tabControlEvent.emit("NEW_TAB") }},
                {label: "关闭标签页", accelerator: isDarwin ? "Command+W" : "Ctrl+W", click() { tabControlEvent.emit("CLOSE_TAB") }},
                {type: "separator"},
                {label: "后退", accelerator: isDarwin ? "Command+Left" : "Ctrl+Left", click() { tabControlEvent.emit("ROUTE_BACK") }},
                {label: "前进", accelerator: isDarwin ? "Command+Right" : "Ctrl+Right", click() { tabControlEvent.emit("ROUTE_FORWARD") }}
            ]
        },
        {
            label: "窗口",
            role: "windowMenu",
            submenu: [
                {label: "最小化", role: "minimize"},
                {label: "缩放", role: "zoom"},
                {label: "关闭窗口", role: "close", accelerator: isDarwin ? "Command+Shift+W" : "Ctrl+Shift+W"},
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

function registerImportModule(server: ServerManager, menu: Menu, generalEvent: SendEmitter<GeneralEvent>) {
    let isPathWatcherOpen: boolean = false

    generalEvent.addEventListener(async e => {
        if(e.type === "TOGGLE_AUTO_IMPORT" && e.value !== isPathWatcherOpen && server.service.status() === "READY") {
            const res = await server.service.request({url: "/api/imports/watcher", method: "POST", data: {isOpen: e.value}})
            if(res.ok) {
                menu.getMenuItemById("AUTO_IMPORT")!.checked = isPathWatcherOpen = e.value
                Menu.setApplicationMenu(menu)
            }
        }
    })

    server.service.statusChangedEvent.addEventListener(async e => {
        if(e.status === "READY") {
            const res = await server.service.request({url: "/api/imports/watcher", method: "GET"})
            if(res.ok) {
                isPathWatcherOpen = (res.data as {isOpen: boolean}).isOpen
                if(isPathWatcherOpen) {
                    menu.getMenuItemById("AUTO_IMPORT")!.checked = true
                    Menu.setApplicationMenu(menu)
                }
            }
        }
    })

    server.connection.wsToastEvent.addEventListener(e => {
        if(e.type === "EVENT" && e.data.eventType === "app/path-watcher/status-changed") {
            const newIsPathWatcherOpen: boolean = e.data.events[0].event.isOpen
            if(newIsPathWatcherOpen !== isPathWatcherOpen) {
                menu.getMenuItemById("AUTO_IMPORT")!.checked = isPathWatcherOpen = newIsPathWatcherOpen
                Menu.setApplicationMenu(menu)
            }
        }
    })
}