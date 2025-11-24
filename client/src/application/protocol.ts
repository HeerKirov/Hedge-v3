import { createReadStream } from "fs"
import { app, protocol } from "electron"
import { lookup } from "mime-types"
import { WindowManager } from "@/application/window"
import { StateManager, AppState } from "@/components/state"
import { LocalManager } from "@/components/local"
import { maps } from "@/utils/types"
import { getNodePlatform } from "@/utils/process"
import { statOrNull } from "@/utils/fs"

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
            app.on("second-instance", (_, commandLine, __) => {
                const originUrl = commandLine.pop()!
                processDeepLink(originUrl)
            })
        }
    }

    protocol.registerSchemesAsPrivileged([
        { scheme: "archive", privileges: { stream: true, supportFetchAPI: true, standard: true } }
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
    const prefix = "archive://"
    protocol.handle("archive", async req => {
        const url = req.url.substring(prefix.length)
        const res = await local.file.loadFile(url)
        if(res.ok) {
            return seekableResponse(res.data, req)
            // return net.fetch(`file://${res.data}`, req)
        }else if(res.code === "FILE_NOT_FOUND") {
            return new Response("File not found.", {
                status: 404,
                headers: { "content-type": "text/plain" }
            })
        }else{
            return new Response(res.message, {
                status: 500,
                headers: { "content-type": "text/plain" }
            })
        }
    })
}

async function seekableResponse(filePath: string, req: Request) {
    try {
        const mimeType = lookup(filePath) || "application/octet-stream"

        const stat = (await statOrNull(filePath))!
        const fileSize = stat.size
        const range = req.headers.get("range")

        const headers: Record<string, string> = {
            "Content-Type": mimeType,
            "Accept-Ranges": "bytes"
        }

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-")
            const start = parseInt(parts[0], 10)
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1

            if (start >= fileSize || end >= fileSize) {
                return new Response(null, { status: 416, headers })
            }

            const chunkSize = end - start + 1

            const stream = createReadStream(filePath, { start, end })

            headers["Content-Range"] = `bytes ${start}-${end}/${fileSize}`
            headers["Content-Length"] = chunkSize.toString()

            return new Response(stream as any, {status: 206, headers})
        } else {
            const stream = createReadStream(filePath)
            headers["Content-Length"] = fileSize.toString()

            return new Response(stream as any, {status: 200, headers})
        }
    } catch (error) {
        return new Response("Internal Server Error: " + (error as Error).message, { status: 500 })
    }
}