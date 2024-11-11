import { app } from "electron"
import { WindowManager } from "@/application/window"
import { ServerManager } from "@/components/server"
import { Platform } from "@/utils/process"

export function registerAppEvents(windowManager: WindowManager, serverManager: ServerManager, platform: Platform) {
    app.on('activate', () => {
        if (windowManager.getAllWindows().length === 0) {
            windowManager.createWindow()
        }
    })

    app.on('window-all-closed', () => {
        if (platform !== 'darwin') {
            app.quit()
        }
    })

    app.on('quit', () => {
        //此事件将同步完成，在同步执行完成后app就已经退出，等不到异步返回
        serverManager.connection.desired(false)
    })
}
