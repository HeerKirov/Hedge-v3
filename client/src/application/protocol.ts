import { app } from "electron"
import { WindowManager } from "./window"
import { maps } from "../utils/types"

export function registerProtocol(windowManager: WindowManager) {
    //FUTURE 处理其他平台的协议注册事件
    app.setAsDefaultProtocolClient("hedge")

    app.on("open-url", (_, originUrl) => {
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
    })
}