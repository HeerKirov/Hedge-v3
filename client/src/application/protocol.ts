import fs from "fs"
import path from "path"
import { app, protocol, net } from "electron"
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
            app.on('second-instance', (_, commandLine, _) => {
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
        const r = await local.file.loadFile(url)
        if(r.ok) {
            //ISSUE: https://github.com/electron/electron/issues/38749
            //Electron的handle API存在bug，无法正确对视频进行seek，因此进行手动处理
            const extname = path.extname(r.data).substring(1).toLowerCase()
            if(VIDEO_EXTNAME.includes(extname)) {
                const headers = new Headers()
                headers.set("Accept-Ranges", "bytes")
                headers.set("Content-Type", `video/${extname}`)

                const stats = await fs.promises.stat(r.data)
                const rangeText = req.headers.get("range")

                let status = 200
                let stream: fs.ReadStream
                if (rangeText) {
                    const ranges = parseRangeRequests(rangeText, stats.size)

                    const [start, end] = ranges[0]
                    headers.set("Content-Length", `${end - start + 1}`)
                    headers.set("Content-Range", `bytes ${start}-${end}/${stats.size}`)
                    status = 206
                    stream = fs.createReadStream(r.data, { start, end })
                } else {
                    headers.set("Content-Length", `${stats.size}`)
                    stream = fs.createReadStream(r.data)
                }

                return new Response(stream as any, {headers, status})
            }else{
                return net.fetch(`file://${r.data}`)
            }
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

const VIDEO_EXTNAME = ["mp4", "webm", "ogv"]

function parseRangeRequests(text: string, size: number) {
    const token = text.split("=")
    if (token.length !== 2 || token[0] !== "bytes") return []

    return token[1]
        .split(",")
        .map((v) => parseRange(v, size))
        .filter(([start, end]) => !isNaN(start) && !isNaN(end) && start <= end)
}

function parseRange(text: string, size: number) {
    const token = text.split("-")
    if (token.length !== 2) return [NaN, NaN]

    const startText = token[0].trim()
    const endText = token[1].trim()

    if (startText === "") {
        if (endText === "") {
            return [NaN, NaN]
        } else {
            const start = size - Number(endText)
            return [start < 0 ? 0 : start, size - 1]
        }
    } else {
        if (endText === "") {
            const start = Number(startText)
            return [start, size - 1]
        } else {
            const end = Number(endText)
            return [Number(startText), end >= size ? size - 1 : end]
        }
    }
}