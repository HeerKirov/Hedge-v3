import { app, protocol } from "electron"
import { WindowManager } from "@/application/window"
import { StateManager, AppState } from "@/components/state"
import { LocalManager } from "@/components/local"
import { maps } from "@/utils/types"
import { getNodePlatform } from "@/utils/process"

export function registerProtocol(stateManager: StateManager, windowManager: WindowManager) {
    app.setAsDefaultProtocolClient("hedge")

    let cachePool: string[] | undefined

    function processDeepLink(originUrl: string) {
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
    }

    if(getNodePlatform() === "darwin") {
        app.on("open-url", (_, originUrl) => processDeepLink(originUrl))
    }else{
        const gotTheLock = app.requestSingleInstanceLock()
        if (!gotTheLock) {
            app.quit()
            return
        } else {
            app.on('second-instance', (_, commandLine, __) => {
                const originUrl = commandLine.pop()!
                processDeepLink(originUrl)
            })
        }
    }

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
            if(getNodePlatform() !== "darwin") {
                if(existWin.isMinimized()) existWin.restore()
                existWin.focus()
            }
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
        const rangeText = req.headers.get("range")
        const range = rangeText ? parseRangeRequests(rangeText) : null
        const r = await local.file.loadStream(url, range ?? undefined)
        if(r.ok) {
            //ISSUE: https://github.com/electron/electron/issues/38749
            //Electron的handle API存在bug，无法正确对视频进行seek，因此进行手动处理
            return r.data
        }else if(r.code === "FILE_NOT_FOUND") {
            return new Response("File not found.", {
                status: 404,
                headers: { 'content-type': 'text/plain' }
            })
        }else{
            return new Response(r.message, {
                status: 500,
                headers: { 'content-type': 'text/plain' }
            })
        }
    })
}

function parseRangeRequests(text: string): {start: number, end: number} | null {
    const token = text.split("=")
    if (token.length !== 2 || token[0] !== "bytes") return null

    function parseRange(text: string) {
        const token = text.split("-")
        if (token.length !== 2) return [NaN, NaN]

        const startText = token[0].trim()
        const endText = token[1].trim()

        return [startText === "" ? NaN : Number(startText), endText === "" ? NaN : Number(endText)]
    }

    //此处只取了ranges中的首段
    const first = token[1].split(",")[0]
    const [start, end] = parseRange(first)

    return (isNaN(start) && isNaN(end)) ? null : {start, end}
}
