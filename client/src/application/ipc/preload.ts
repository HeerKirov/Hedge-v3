import { ipcRenderer, contextBridge, webUtils } from "electron"
import { getNodePlatform } from "@/utils/process"
import { createProxyEmitter } from "@/utils/emitter"
import { IpcClient, MenuTemplate, MenuTemplateInIpc } from "./constants"

/**
 * IPC API Client在前端的实现。这部分代码通过electron preload注入到前端。
 */
function createRemoteIpcClient(): IpcClient {
    let popupRequestId = 0

    return {
        app: {
            env() {
                return ipcRenderer.sendSync("/app/env")
            },
            initialize(form) {
                ipcRenderer.send("/app/initialize", form)
            },
            async login(form) {
                return await ipcRenderer.invoke("/app/login", form)
            },
            serverForceStop() {
                ipcRenderer.send("/app/server-force-stop")
            },
            envChangedEvent: createProxyEmitter(emit => {
                ipcRenderer.on("/app/env/on-changed", (_, arg) => emit(arg))
            }),
            initializeUpdatedEvent: createProxyEmitter(emit => {
                ipcRenderer.on("/app/initialize/on-updated", (_, arg) => emit(arg))
            }),
            wsToastEvent: createProxyEmitter(emit => {
                ipcRenderer.on("/app/ws-toast", (_, arg) => emit(arg))
            })
        },
        local: {
            async importFile(path) {
                return await ipcRenderer.invoke("/local/import-file", path)
            },
            async loadFile(path) {
                return await ipcRenderer.invoke("/local/load-file", path)
            },
            async checkAndLoadFile(path) {
                return await ipcRenderer.invoke("/local/check-and-load-file", path)
            },
            async downloadExportFile(form) {
                return await ipcRenderer.invoke("/local/download-export-file", form)
            },
            async cacheStatus() {
                return await ipcRenderer.invoke("/local/cache/status")
            },
            async cleanAllCacheFiles() {
                return await ipcRenderer.invoke("/local/cache/clean")
            },
            async fileWatcherStatus(isOpen) {
                return await ipcRenderer.invoke("/local/file-watcher/status", isOpen)
            },
            fileWatcherChangedEvent: createProxyEmitter(emit => {
                ipcRenderer.on("/local/file-watcher/changed", (_, arg) => emit(arg))
            })
        },
        window: {
            newWindow(url) {
                ipcRenderer.send("/window/new-window", url)
            },
            openSetting() {
                ipcRenderer.send("/window/open-setting")
            },
            openGuide() {
                ipcRenderer.send("/window/open-guide")
            },
            openNote() {
                ipcRenderer.send("/window/open-note")
            }
        },
        setting: {
            appearance: {
                async get() {
                    return await ipcRenderer.invoke("/setting/appearance")
                },
                async set(value) {
                    await ipcRenderer.invoke("/setting/appearance/set", value)
                }
            },
            auth: {
                async get() {
                    return await ipcRenderer.invoke("/setting/auth")
                },
                async set(value) {
                    await ipcRenderer.invoke("/setting/auth/set", value)
                }
            },
            storage: {
                async get() {
                    return await ipcRenderer.invoke("/setting/storage")
                },
                async set(value) {
                    await ipcRenderer.invoke("/setting/storage/set", value)
                }
            },
            channel: {
                async list() {
                    return await ipcRenderer.invoke("/setting/channel/list")
                },
                async getDefault() {
                    return await ipcRenderer.invoke("/setting/channel/default")
                },
                async setDefault(channel): Promise<void> {
                    await ipcRenderer.invoke("/setting/channel/default/set", channel)
                },
                getCurrent() {
                    return ipcRenderer.sendSync("/setting/channel/current")
                },
                toggle(channel) {
                    ipcRenderer.send("/setting/channel/toggle", channel)
                }
            }
        },
        remote: {
            tabs: {
                updateState(state) {
                    ipcRenderer.send("/remote/tabs/update-state", state)
                },
                controlEvent: createProxyEmitter(emit => {
                    ipcRenderer.on("/remote/tabs/control", (_, arg) => emit(arg))
                })
            },
            fullscreen: {
                get() {
                    return ipcRenderer.sendSync("/remote/fullscreen")
                },
                set(fullscreen) {
                    ipcRenderer.send("/remote/fullscreen/set", fullscreen)
                },
                onFullscreenChanged(event) {
                    ipcRenderer.on("/remote/fullscreen/on-changed", (_, arg) => event(arg))
                }
            },
            menu: {
                popup(options) {
                    const callbacks: (() => void)[] = []

                    function mapItem(item: MenuTemplate): MenuTemplateInIpc {
                        if((item.type === "normal" || item.type === "radio" || item.type === "checkbox") && item.click !== undefined) {
                            const { click, ...leave } = item
                            callbacks.push(click)
                            return { ...leave, eventId: callbacks.length - 1 }
                        }else if(item.type === "submenu" && item.submenu.length > 0) {
                            const { submenu, ...leave } = item
                            return { ...leave, submenu: submenu.map(mapItem) }
                        }else{
                            return item
                        }
                    }

                    const refItems = options.items.map(mapItem)
                    const refOptions = options && options.x != null && options.y != null ? { x: options.x, y: options.y } : undefined

                    const requestId = ++popupRequestId
                    ipcRenderer.send("/remote/menu/popup", {requestId, items: refItems, options: refOptions})
                    ipcRenderer.once(`/remote/menu/popup/response/${requestId}`, (_, eventId: number | undefined) => {
                        if(eventId !== undefined) {
                            callbacks[eventId]?.()
                        }
                    })
                }
            },
            dialog: {
                async openDialog(options) {
                    const result = await ipcRenderer.invoke("/remote/dialog/open-dialog", options)
                    return result.canceled || result.filePaths.length <= 0 ? null : result.filePaths
                },
                async showMessage(options) {
                    const result = await ipcRenderer.invoke("/remote/dialog/show-message", options)
                    return result.response
                },
                showError(title, message) {
                    ipcRenderer.send("/remote/dialog/show-error", {title, message})
                }
            },
            shell: {
                openExternal(url) {
                    ipcRenderer.send("/remote/shell/open-external", url)
                },
                openPath(url) {
                    ipcRenderer.send("/remote/shell/open-path", url)
                },
                openPathInFolder(url) {
                    ipcRenderer.send("/remote/shell/open-path-in-folder", url)
                },
                startDragFile(thumbnail, filepath) {
                    ipcRenderer.send("/remote/shell/start-drag-file", {thumbnail, filepath})
                },
                showFilePath(file) {
                    return webUtils.getPathForFile(file)
                }
            }
        }
    }
}

contextBridge.exposeInMainWorld("platform", getNodePlatform())
contextBridge.exposeInMainWorld("createRemoteIpcClient", createRemoteIpcClient)

// (window as any)["platform"] = getNodePlatform();
// (window as any)["createRemoteIpcClient"] = createRemoteIpcClient

