import { BrowserWindow, dialog, ipcMain, IpcMainEvent, IpcMainInvokeEvent, Menu, MessageBoxOptions, OpenDialogOptions, shell } from "electron"
import { sleep } from "../../utils/process"
import { Emitter } from "../../utils/emitter"
import { MenuTemplate, MenuTemplateInIpc } from "./constants"
import { AppDataDriver } from "../../components/appdata"
import { Channel } from "../../components/channel"
import { ServerManager } from "../../components/server"
import { StateManager } from "../../components/state"
import { ThemeManager } from "../theme"
import { WindowManager } from "../window"
import { MenuManager } from "../menu"
import { createIpcClientImpl, IpcRemoteOptions } from "./impl"


/**
 * 异步的、有返回的请求。
 */
function ipcHandle<T, R>(channel: string, invoke: (f: T, e: IpcMainInvokeEvent) => Promise<R>) {
    ipcMain.handle(channel, (event, args) => invoke(args, event))
}

/**
 * 同步的、有返回的请求。
 */
function ipcHandleSync<T, R>(channel: string, invoke: (f: T, e: IpcMainEvent) => R) {
    ipcMain.on(channel, (event, args) => {
        event.returnValue = invoke(args, event)
    })
}

/**
 * 从客户端主动发送的ipc通信。发送到所有正在运行的窗口。
 */
function ipcEvent<T>(channel: string, emitter: Emitter<T>) {
    emitter.addEventListener(e => {
        for (const window of BrowserWindow.getAllWindows()) {
            window.webContents.send(channel, e)
        }
    })
}

/**
 * 从客户端主动发送的ipc通信。发送到当前聚焦的窗口。
 */
function ipcEventFocus<T>(channel: string, emitter: Emitter<T>) {
    emitter.addEventListener(e => {
        const window = BrowserWindow.getFocusedWindow()
        if(window !== null) window.webContents.send(channel, e)
    })
}

/**
 * 注册全局的IPC远程事件实现。
 */
export function registerGlobalIpcRemoteEvents(appdata: AppDataDriver, channel: Channel, server: ServerManager, state: StateManager, theme: ThemeManager, menu: MenuManager, window: WindowManager, options: IpcRemoteOptions) {
    const impl = createIpcClientImpl(appdata, channel, server, state, theme, window, options)

    ipcHandleSync("/app/env", impl.app.env)
    ipcHandleSync("/app/initialize", impl.app.initialize)
    ipcHandle("/app/login", impl.app.login)
    ipcHandleSync("/app/server-force-stop", impl.app.serverForceStop)
    ipcEvent("/app/env/on-changed", impl.app.envChangedEvent)
    ipcEvent("/app/initialize/on-updated", impl.app.initializeUpdatedEvent)
    ipcEvent("/app/ws-toast", impl.app.wsToastEvent)
    ipcHandleSync("/window/new-window", impl.window.newWindow)
    ipcHandleSync("/window/open-setting", impl.window.openSetting)
    ipcHandleSync("/window/open-guide", impl.window.openGuide)
    ipcHandleSync("/window/open-note", impl.window.openNote)
    ipcHandle("/setting/appearance", impl.setting.appearance.get)
    ipcHandle("/setting/appearance/set", impl.setting.appearance.set)
    ipcHandle("/setting/auth", impl.setting.auth.get)
    ipcHandle("/setting/auth/set", impl.setting.auth.set)
    ipcHandle("/setting/channel/list", impl.setting.channel.list)
    ipcHandle("/setting/channel/default", impl.setting.channel.getDefault)
    ipcHandle("/setting/channel/default/set", impl.setting.channel.setDefault)
    ipcHandleSync("/setting/channel/current", impl.setting.channel.getCurrent)
    ipcHandleSync("/setting/channel/toggle", impl.setting.channel.toggle)

    ipcEventFocus("/remote/tabs/control", menu.tabs.controlEvent)
    ipcHandleSync("/remote/fullscreen", (_, e) => BrowserWindow.fromWebContents(e.sender)!.isFullScreen())
    ipcHandleSync("/remote/fullscreen/set", (value: boolean, e) => { BrowserWindow.fromWebContents(e.sender)!.setFullScreen(value) })
    ipcHandle("/remote/dialog/open-dialog", (value: OpenDialogOptions, e) => dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender)!, value))
    ipcHandle("/remote/dialog/show-message", (value: MessageBoxOptions, e) => dialog.showMessageBox(BrowserWindow.fromWebContents(e.sender)!, value))
    ipcHandleSync("/remote/dialog/show-error", ({ title, message }: {title: string, message: string}) => { dialog.showErrorBox(title, message) })
    ipcHandleSync("/remote/menu/popup", ({ requestId, items, options }: {requestId: number, items: MenuTemplateInIpc[], options?: { x: number; y: number }}, e) => {
        let clicked = false

        function mapItem(item: MenuTemplateInIpc): MenuTemplate {
            if((item.type === "normal" || item.type === "radio" || item.type === "checkbox") && item.eventId != undefined) {
                const { eventId, ...leave } = item
                return {
                    ...leave,
                    click() {
                        clicked = true
                        e.sender.send(`/remote/menu/popup/response/${requestId}`, eventId)
                    }
                }
            }else if(item.type === "submenu" && item.submenu.length > 0) {
                const { submenu, ...leave} = item
                return {...leave, submenu: submenu.map(mapItem)}
            }else{
                return item
            }
        }

        const finalItems = items.map(mapItem)

        const menu = Menu.buildFromTemplate(finalItems)
        menu.once("menu-will-close", async () => {
            await sleep(500)
            if(!clicked) {
                //在延时之后检测是否clicked，如果没有就发送一个内容为undefined的事件，防止渲染端内存泄露
                e.sender.send(`/remote/menu/popup/response/${requestId}`, undefined)
            }
        })
        const window = BrowserWindow.fromWebContents(e.sender)!
        menu.popup({window, ...(options || {})})
    })
    ipcHandleSync("/remote/shell/open-external", (url: string) => { shell.openExternal(url).catch(reason => dialog.showErrorBox("打开链接时发生错误", reason)) })
    ipcHandleSync("/remote/shell/open-path", (url: string) => { shell.openPath(url).catch(reason => dialog.showErrorBox("打开链接时发生错误", reason)) })
    ipcHandleSync("/remote/shell/open-path-in-folder", (url: string) => { shell.showItemInFolder(url) })
    ipcHandleSync("/remote/shell/start-drag-file", ({ thumbnail, filepath }: {thumbnail: string, filepath: string | string[]}, e) => {
        if(typeof filepath === "string") {
            e.sender.startDrag({file: filepath, icon: thumbnail})
        }else{
            e.sender.startDrag({file: "", files: filepath, icon: thumbnail})
        }
    })
}

/**
 * 为单独的窗口注册IPC远程事件。
 */
export function registerWindowIpcRemoteEvent(win: BrowserWindow) {
    win.on("enter-full-screen", () => win.webContents.send("/remote/fullscreen/on-changed", true))
    win.on("leave-full-screen", () => win.webContents.send("/remote/fullscreen/on-changed", false))
}
