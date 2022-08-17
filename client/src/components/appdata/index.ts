import path from "path"
import { mkdir, readFile, writeFile } from "../../utils/fs"
import { DATA_FILE } from "../../constants/file"
import { ClientException } from "../../exceptions"
import { AppData, defaultValue } from "./model"
import { migrate } from "./migrations"

/**
 * 连接到指定频道的appdata数据。
 * 在频道不存在时，driver会检测并发现，并可以调用函数对其进行初始化。
 * 连接到数据后，允许对client范围内的数据进行读写操作。
 */
export interface AppDataDriver {
    /**
     * 在app的后初始化环节调用，异步地读取appdata的当前状况，并更新到状态。如果appdata可读，将加载数据到内存，并应用可能的更改。
     */
    load(): Promise<void>
    /**
     * 即时返回app内部的初始化状况。
     */
    status(): AppDataStatus
    /**
     * 在appdata没有初始化时可调用，对appdata进行初始化写入。
     */
    init(): Promise<void>
    /**
     * 获得appdata数据。
     */
    getAppData(): AppData
    /**
     * 保存appdata到文件。
     * @param process 在保存时顺手做一次修改。
     */
    saveAppData(process?: (data: AppData) => void): Promise<AppData>
}

export enum AppDataStatus {
    UNKNOWN = "UNKNOWN",
    NOT_INIT = "NOT_INIT",
    LOADING = "LOADING",
    LOADED = "LOADED"
}

/**
 * 构造参数。
 */
export interface AppDataDriverOptions {
    /**
     * app的数据目录。例如对于Linux，它是~/.config/Hedge-v3目录。
     */
    userDataPath: string
    /**
     * app运行所在的频道名称。启动没有指定频道时，默认频道名为default。
     */
    channel: string
}

export function createAppDataDriver(options: AppDataDriverOptions): AppDataDriver {
    const channelPath = path.join(options.userDataPath, DATA_FILE.APPDATA.CHANNEL_FOLDER, options.channel)
    const clientDataPath = path.join(channelPath, DATA_FILE.APPDATA.CHANNEL.CLIENT_DATA)

    let status = AppDataStatus.UNKNOWN
    let appData: AppData | null = null

    async function load() {
        try {
            const data = await readFile<AppData>(clientDataPath)
            if(data != null) {
                status = AppDataStatus.LOADING

                const { appData: newAppData, changed } = await migrate({appData: data})
                if(changed) {
                    await writeFile(clientDataPath, newAppData)
                }
                appData = newAppData

                status = AppDataStatus.LOADED
                console.log("[AppDataDriver] App data is loaded.")
            }else{
                status = AppDataStatus.NOT_INIT
                console.log("[AppDataDriver] App data is not init.")
            }
        }catch (e) {
            throw new ClientException("APPDATA_LOAD_ERROR", e)
        }
    }

    async function init() {
        if(status != AppDataStatus.NOT_INIT) {
            throw new ClientException("ALREADY_INIT")
        }
        status = AppDataStatus.LOADING

        try {
            await mkdir(channelPath)
            await writeFile(clientDataPath, appData = defaultValue())

            const { appData: newAppData, changed } = await migrate({appData})
            if(changed) {
                await writeFile(clientDataPath, appData = newAppData)
            }
        }catch (e) {
            throw new ClientException("APPDATA_INIT_ERROR", e)
        }

        status = AppDataStatus.LOADED
    }

    async function saveAppData(process?: (data: AppData) => void) {
        if(appData == null) {
            throw new Error("AppData is not initialized.")
        }
        if(typeof process === 'function') {
            process(appData)
        }
        await writeFile(clientDataPath, appData)
        return appData
    }

    return {
        load,
        init,
        saveAppData,
        getAppData() {
            return appData!!
        },
        status() {
            return status
        }
    }
}
