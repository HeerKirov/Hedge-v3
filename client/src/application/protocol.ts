import { app, protocol, net } from "electron"
import { WindowManager } from "./window"
import { StateManager } from "../components/state"
import { AppState } from "../components/state/model"
import { LocalManager } from "../components/local"
import { maps } from "../utils/types"

export function registerProtocol(stateManager: StateManager, windowManager: WindowManager) {
    //FUTURE 处理其他平台的协议注册事件
    app.setAsDefaultProtocolClient("hedge")

    let cachePool: string[] | undefined

    app.on("open-url", (_, originUrl) => {
        if(stateManager.state() === "READY") {
            processUrl(originUrl, windowManager)
        }else if(cachePool === undefined) {
            cachePool = [originUrl]
            const changed = ({ state }: {state: AppState}) => {
                if(state === "READY") {
                    stateManager.stateChangedEvent.removeEventListener(changed)
                    cachePool?.forEach(url => processUrl(url, windowManager))
                    cachePool = undefined
                }
            }
            stateManager.stateChangedEvent.addEventListener(changed)
        }else{
            cachePool.push(originUrl)
        }
    })

    protocol.registerSchemesAsPrivileged([
        { scheme: 'archive', privileges: { stream: true } }
    ])
}

function processUrl(originUrl: string, windowManager: WindowManager) {
    const url = new URL(originUrl)
    if(url.pathname === "/new-tab") {
        const existWin = windowManager.getAllWindows().find(win => new URL(win.webContents.getURL()).hash.substring(1) === "/main")
        if(existWin !== undefined) {
            existWin.webContents.send("/remote/tabs/control", {type: "NEW_TAB", ...maps.parse([...url.searchParams.entries()])})
        }else{
            windowManager.createWindow(`/main${url.search}`)
        }
    }else{
        console.log("open url", originUrl)
    }
}

export function registerRendererProtocol(local: LocalManager) {
    const prefix = 'archive://'
    protocol.handle('archive', async req => {
        const url = req.url.substring(prefix.length)
        const r = await local.file.loadFile(url)
        if(r.ok) {
            return net.fetch(r.filepath)
        }else{
            return new Response(r.error, {
                status: 400,
                headers: { 'content-type': 'text/plain' }
            })
        }
    })
}