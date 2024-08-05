import path from "path"
import fs from "fs"
import { AxiosRequestConfig } from "axios"
import { DATA_FILE } from "../../constants/file"
import { existsFile, mkdir, unzip } from "../../utils/fs"
import { lazy } from "../../utils/primitive"
import { ServerManager } from "../server"
import { LevelManager } from "../level"
import { LocalOptions } from "."

const CACHE_EXPIRED_INTERVAL = 1000 * 5

export interface FileManager {
    load(): Promise<void>
    /**
     * 通过客户端的缓存机制访问一项来自server的文件资源。该访问首先将文件资源下载到本地缓存目录，随后提供缓存文件的本地路径。
     * @param filepath 文件资源地址，以type开头
     * @return 此文件的本地路径
     */
    loadFile(filepath: string): Promise<{ok: true, filepath: string} | {ok: false, error: string}>
    /**
     * 根据提供的参数，将导出的文件下载到指定位置。
     * @param form location: 导出位置; zip: 导出并保存为zip文件，该参数指定zip文件名称
     */
    downloadExportFile(form: { imageIds?: number[], bookId?: number, location: string, zip?: string }): Promise<{ok: true} | {ok: false, error: string}>
    /**
     * 清理所有的本地缓存。
     */
    cleanAllCacheFiles(): Promise<void>
}

export function createFileManager(level: LevelManager, server: ServerManager, options: LocalOptions): FileManager {
    const cachesDir = path.resolve(options.userDataPath, DATA_FILE.APPDATA.CHANNEL_FOLDER, options.channel, DATA_FILE.APPDATA.CHANNEL.CACHES_DIR)

    const subLevel = lazy(() => level.getLevel().sublevel<string, {lastAccess: number}>("ARCHIVE_FILE_CACHE", { valueEncoding: "json" }))

    const cleanExpiredFiles = async () => {
        const now = Date.now()

        const toBeDeleted: string[] = []
        for await(const [k, v] of subLevel().iterator()) {
            if(now - v.lastAccess >= CACHE_EXPIRED_INTERVAL) {
                toBeDeleted.push(k)
            }
        }
        if(toBeDeleted.length > 0) {
            for(const filepath of toBeDeleted) {
                await fs.promises.rm(path.join(cachesDir, filepath), { force: true })
            }
            await level.getLevel().batch(toBeDeleted.map(k => ({type: "del", sublevel: subLevel(), key: k})))
            console.log(`[FileManager] ${toBeDeleted.length} expired cache files are cleaned.`)
        }
    }

    const cleanAllCacheFiles = async () => {
        await fs.promises.rm(cachesDir, { recursive: true, force: true })
        await subLevel().clear()
    }

    const downloadFile = async (config: string | AxiosRequestConfig, dest: string) => {
        const writer = fs.createWriteStream(dest)
        const response = await server.service.axiosRequest(typeof config === "string" ? {
            url: config,
            method: "GET",
            responseType: "stream"
        } : {...config, responseType: "stream"})
        if(response.status === 200) {
            response.data.pipe(writer)
            return new Promise((resolve, reject) => {
                writer.on("finish", resolve)
                writer.on("error", reject)
            })
        }else{
            throw new Error(`Download failed: ${response.statusText}`)
        }
    }

    const downloadAndUnzip = async (config: string | AxiosRequestConfig, dest: string) => {
        const response = await server.service.axiosRequest(typeof config === "string" ? {
            url: config,
            method: "GET",
            responseType: "stream"
        } : {...config, responseType: "stream"})
        if(response.status === 200) {
            await unzip(response.data, dest)
        }else{
            throw new Error(`Download failed: ${response.statusText}`)
        }
    }

    return {
        async load() {
            cleanExpiredFiles().catch(e => console.error("[FileManager] cleanExpiredFiles throws an Error.", e))
        },
        async loadFile(filepath: string): Promise<{ok: true, filepath: string} | {ok: false, error: string}> {
            const localCachePath = path.join(cachesDir, filepath)
            try {
                if(!await existsFile(localCachePath)) {
                    await mkdir(path.dirname(localCachePath))
                    await downloadFile(path.join("archives", filepath), localCachePath)
                }
            }catch(err) {
                return {ok: false, error: err instanceof Error ? err.message : typeof err === "string" ? err : err?.toString() ?? "unknown error"}
            }

            subLevel().put(filepath, {lastAccess: Date.now()}).catch(e => console.error("[FileManager] Cache file record failed.", e))

            return {ok: true, filepath: `file://${localCachePath}`}
        },
        async downloadExportFile(form: { imageIds?: number[], bookId?: number, location: string, zip?: string }): Promise<{ok: true} | {ok: false, error: string}> {
            const formData = {imageIds: form.imageIds, bookId: form.bookId}
            if(!await existsFile(form.location)) return {ok: false, error: `${form.location} is not accessible.`}
            if(form.zip) {
                try {
                    await downloadFile({url: "/api/utils/export/download", method: "POST", data: formData}, path.join(form.location, form.zip))
                }catch(err) {
                    return {ok: false, error: err instanceof Error ? err.message : typeof err === "string" ? err : err?.toString() ?? "unknown error"}
                }
            }else{
                try {
                    await downloadAndUnzip({url: "/api/utils/export/download", method: "POST", data: formData}, form.location)
                }catch(err) {
                    return {ok: false, error: err instanceof Error ? err.message : typeof err === "string" ? err : err?.toString() ?? "unknown error"}
                }
            }
            return {ok: true}
        },
        cleanAllCacheFiles
    }
}