import { app } from "electron"
import { WindowManager } from "@/application/window"
import { ServerManager } from "@/components/server"
import { LocalManager } from "@/components/local"
import { Platform } from "@/utils/process"

export function registerAppEvents(windowManager: WindowManager, serverManager: ServerManager, localManager: LocalManager, platform: Platform) {
    app.on("activate", () => {
        if (windowManager.getAllWindows().length === 0) {
            windowManager.createWindow()
        }
    })

    app.on("window-all-closed", () => {
        if (platform !== 'darwin') {
            app.quit()
        }
    })

    let isQuitting = false

    app.on("before-quit", (e) => {
        if (isQuitting) return
        e.preventDefault()
        isQuitting = true

        ;(async () => {
            await localManager.fileDragManager.cleanAllCacheFiles().catch(console.error)
            app.quit()
        })()
    })

    app.on("quit", () => {
        //此事件将同步完成，在同步执行完成后app就已经退出，等不到异步返回
        serverManager.connection.desired(false)
    })
}

export function registerErrorHandler() {
    process.on("uncaughtException", (error) => {
        if (error.message.includes("ReadableStream is already closed")) {
            console.log(`忽略 ReadableStream 关闭错误: ${error.message}`)
            return
        }
        console.error("未捕获的异常:", error)
    })
    
    process.on("unhandledRejection", (reason, promise) => {
        if (reason instanceof Error && reason.message.includes("ReadableStream is already closed")) {
            console.log(`忽略 ReadableStream Promise 拒绝: ${reason.message}`)
            return
        }
        console.error("未处理的 Promise 拒绝:", reason)
    })
}