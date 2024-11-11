import path from "path"
import fs from "fs/promises"
import { AppDataDriver, AppDataStatus } from "@/components/appdata"
import { DATA_FILE } from "@/constants/file"
import { existsFile, readFile, writeFile } from "@/utils/fs"

/**
 * 提供不限定格式的自由读写存储器。用于在client提供类似localStorage的快速存储。
 */
export interface StorageManager {
    isEnabled(): boolean
    get<T>(filepath: string): Promise<T | undefined>
    set<T>(filepath: string, value: T): Promise<void>
    remove(filepath: string): Promise<void>
}

export interface StorageManagerOptions {
    /**
     * app数据目录。
     */
    userDataPath: string
    /**
     * app频道。
     */
    channel: string
}

export function createStorageManager(appdata: AppDataDriver, options: StorageManagerOptions): StorageManager {
    const channelPath = path.join(options.userDataPath, DATA_FILE.APPDATA.CHANNEL_FOLDER, options.channel)

    function isEnabled(): boolean {
        return appdata.status() === AppDataStatus.LOADED
    }

    async function get<T>(filepath: string): Promise<T | undefined> {
        if(!isEnabled()) throw new Error("Cannot access storage manager before appdata initializing.")
        const storageFilePath = path.join(channelPath, `client.${filepath}.storage`)
        return await readFile(storageFilePath) ?? undefined
    }

    async function set<T>(filepath: string, value: T): Promise<void> {
        if(!isEnabled()) throw new Error("Cannot access storage manager before appdata initializing.")
        const storageFilePath = path.join(channelPath, `client.${filepath}.storage`)
        await writeFile(storageFilePath, value)
    }

    async function remove(filepath: string): Promise<void> {
        if(!isEnabled()) throw new Error("Cannot access storage manager before appdata initializing.")
        const storageFilePath = path.join(channelPath, `client.${filepath}.storage`)
        if(await existsFile(storageFilePath)) {
            await fs.rm(storageFilePath, {})
        }
    }

    return {isEnabled, get, set, remove}
}
