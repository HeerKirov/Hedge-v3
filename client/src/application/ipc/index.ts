import { BrowserWindow, dialog, ipcMain, Menu, MessageBoxOptions, OpenDialogOptions, shell } from "electron"
import { sleep } from "../../utils/process"
import { Emitter } from "../../utils/emitter"
import { MenuTemplate, MenuTemplateInIpc } from "./constants"
import { AppDataDriver } from "../../components/appdata"
import { Channel } from "../../components/channel"
import { ServerManager } from "../../components/server"
import { StateManager } from "../../components/state"
import { ThemeManager } from "../theme"
import { WindowManager } from "../window"
import { createIpcClientImpl, IpcRemoteOptions } from "./impl"


/**
 * 异步的、有返回的请求。
 */
function ipcHandle<T, R>(channel: string, invoke: (f: T) => Promise<R>) {
    ipcMain.handle(channel, (event, args) => invoke(args))
}

/**
 * 同步的、有返回的请求。
 */
function ipcHandleSync<T, R>(channel: string, invoke: (f: T) => R) {
    ipcMain.on(channel, (event, args) => {
        event.returnValue = invoke(args)
    })
}

/**
 * 从客户端主动发送的ipc通信。
 */
function ipcEvent<T>(channel: string, emitter: Emitter<T>) {
    emitter.addEventListener(e => {
        for (const window of BrowserWindow.getAllWindows()) {
            window.webContents.send(channel, e)
        }
    })
}

/**
 * 注册全局的IPC远程事件实现。
 */
export function registerGlobalIpcRemoteEvents(appdata: AppDataDriver, channel: Channel, server: ServerManager, state: StateManager, theme: ThemeManager, window: WindowManager, options: IpcRemoteOptions) {
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

    ipcMain.on("/remote/fullscreen", (e) => {
        e.returnValue = BrowserWindow.fromWebContents(e.sender)!.isFullScreen()
    })
    ipcMain.on("/remote/fullscreen/set", (e, value: boolean) => {
        BrowserWindow.fromWebContents(e.sender)!.setFullScreen(value)
    })
    ipcMain.handle("/remote/dialog/open-dialog", async (e, value: OpenDialogOptions) => {
        return await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender)!, value)
    })
    ipcMain.handle("/remote/dialog/show-message", async (e, value: MessageBoxOptions) => {
        return await dialog.showMessageBox(BrowserWindow.fromWebContents(e.sender)!, value)
    })
    ipcMain.on("/remote/dialog/show-error", (e, { title, message }: {title: string, message: string}) => {
        dialog.showErrorBox(title, message)
    })
    ipcMain.on("/remote/menu/popup", async (e, { requestId, items, options }: {requestId: number, items: MenuTemplateInIpc[], options?: { x: number; y: number }}) => {
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
    ipcMain.on("/remote/shell/open-external", (e, url: string) => {
        shell.openExternal(url).catch(reason => dialog.showErrorBox("打开链接时发生错误", reason))
    })
    ipcMain.on("/remote/shell/open-path", (e, url: string) => {
        shell.openPath(url).catch(reason => dialog.showErrorBox("打开链接时发生错误", reason))
    })
    ipcMain.on("/remote/shell/open-path-in-folder", (e, url: string) => {
        shell.showItemInFolder(url)
    })
    ipcMain.on("/remote/shell/start-drag-file", (e, thumbnail: string, filepath: string | string[]) => {
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
