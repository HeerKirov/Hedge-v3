import { systemPreferences } from "electron"
import { ThemeManager } from "@/application/theme"
import { WindowManager } from "@/application/window"
import { AppDataDriver, AppDataStatus } from "@/components/appdata"
import { Channel } from "@/components/channel"
import { ServerManager } from "@/components/server"
import { StateManager } from "@/components/state"
import { LocalManager } from "@/components/local"
import { Platform, sleep } from "@/utils/process"
import { createProxyEmitter } from "@/utils/emitter"
import { AppEnvironmentChangedEvent, IpcClient } from "./constants"

export interface IpcRemoteOptions {
    platform: Platform
    userDataPath: string
    debugMode: boolean
}

type IpcClientWithoutRemote = Exclude<IpcClient, "remote">

export function createIpcClientImpl(appdata: AppDataDriver, channel: Channel, server: ServerManager, state: StateManager, local: LocalManager, theme: ThemeManager, window: WindowManager, options: IpcRemoteOptions): IpcClientWithoutRemote {
    return {
        app: {
            env() {
                return {
                    platform: options.platform,
                    debugMode: options.debugMode,
                    userDataPath: options.userDataPath,
                    channel: channel.currentChannel(),
                    canPromptTouchID: appdata.status() === AppDataStatus.LOADED && appdata.getAppData().loginOption.touchID && systemPreferences.canPromptTouchID(),
                    app: {
                        state: state.state()
                    },
                    server: {
                        serviceStatus: server.service.status(),
                        connectionStatus: server.connection.status(),
                        connectionInfo: server.connection.connectionInfo(),
                        staticInfo: server.connection.staticInfo(),
                    }
                }
            },
            initialize: state.appInitialize,
            login: state.login,
            serverForceStop: server.connection.kill,
            envChangedEvent: createProxyEmitter(func => {
                //此处的实现使用了一个简单的缓冲池结构，将三种不同的组件状态尽可能收纳在同一个事件中发出。
                //实现方式基于同步/异步结构。因为组件状态相互依赖且依赖方式为同步通知，因此将发送动作推延到1ms的异步后，确保同步周期内收集到所有事件。
                let e: AppEnvironmentChangedEvent | undefined = undefined
                state.stateChangedEvent.addEventListener(({ state }) => {
                    if(e === undefined) e = {}
                    e.app = { state }
                    waitForSend().finally()
                })
                server.connection.statusChangedEvent.addEventListener(({ status, info }) => {
                    if(e === undefined) e = {}
                    e.serverConnection = { status, info }
                    waitForSend().finally()
                })
                server.service.statusChangedEvent.addEventListener(({ status }) => {
                    if(e === undefined) e = {}
                    e.serverService = { status }
                    waitForSend().finally()
                })

                async function waitForSend() {
                    await sleep(1)
                    if(e !== undefined) {
                        func(e)
                        e = undefined
                    }
                }
            }),
            initializeUpdatedEvent: state.initializeEvent,
            wsToastEvent: server.connection.wsToastEvent
        },
        local: {
            importFile: f => local.file.importFile({filepath: f}),
            loadFile: local.file.loadFile,
            checkAndLoadFile: local.file.checkAndLoadFile,
            downloadExportFile: local.file.downloadExportFile,
            cacheStatus: local.file.cacheStatus,
            cleanAllCacheFiles: local.file.cleanAllCacheFiles,
            fileWatcherStatus: async isOpen => {
                if(isOpen !== undefined) local.fileWatcher.setOpen(isOpen)
                return local.fileWatcher.status()
            },
            fileWatcherChangedEvent: local.fileWatcher.fileWatcherChangedEvent
        },
        window: {
            newWindow(url?: string) {
                window.createWindow(url)
            },
            openSetting() {
                window.openSettingWindow()
            },
            openGuide() {
                window.openGuideWindow()
            },
            openNote() {
                window.openNoteWindow()
            }
        },
        setting: {
            appearance: {
                async get() {
                    return { theme: theme.getTheme() }
                },
                async set(value) {
                    await theme.setTheme(value.theme)
                }
            },
            behaviour: {
                async get() {
                    return appdata.getAppData().behaviourOption
                },
                async set(value) {
                    await appdata.saveAppData(d => {
                        d.behaviourOption.customBrowserList = value.customBrowserList
                        d.behaviourOption.externalBrowser = value.externalBrowser
                    })
                }
            },
            auth: {
                async get() {
                    return appdata.getAppData().loginOption
                },
                async set(value) {
                    await appdata.saveAppData(d => {
                        d.loginOption.password = value.password
                        d.loginOption.touchID = value.touchID
                        d.loginOption.fastboot = value.fastboot
                        if(d.loginOption.mode === "remote" && value.remote) d.loginOption.remote = value.remote
                    })
                }
            },
            storage: {
                async get() {
                    return appdata.getAppData().storageOption
                },
                async set(value) {
                    await appdata.saveAppData(d => {
                        d.storageOption.cacheCleanIntervalDay = value.cacheCleanIntervalDay
                        d.storageOption.autoFileWatch = value.autoFileWatch
                        d.storageOption.fileWatchInitialize = value.fileWatchInitialize
                        d.storageOption.fileWatchMoveMode = value.fileWatchMoveMode
                        d.storageOption.fileWatchPaths = value.fileWatchPaths
                    })
                }
            },
            channel: {
                list: channel.getChannelList,
                getCurrent: channel.currentChannel,
                getDefault: channel.getDefaultChannel,
                setDefault: channel.setDefaultChannel,
                toggle: channel.restartWithChannel
            }
        },
        remote: <any>undefined
    }
}
