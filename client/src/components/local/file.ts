import path from "path"
import fs from "fs"
import FormData from "form-data"
import { AxiosRequestConfig } from "axios"
import { AppDataDriver } from "../appdata"
import { ServerManager } from "../server"
import { LevelManager } from "../level"
import { DATA_FILE } from "../../constants/file"
import { existsFile, mkdir, statOrNull, unzip } from "../../utils/fs"
import { lazy } from "../../utils/primitive"
import { IResponse } from "../../utils/types"
import { LocalOptions } from "."

const CACHE_EXPIRED_INTERVAL = 1000 * 5

export interface FileManager {
    /**
     * 执行文件模块的初始化。初始化操作主要为清理过期缓存。
     */
    load(): Promise<void>
    /**
     * 将本地指定位置的文件上传到服务器。
     * @param form 本地文件路径
     */
    importFile(form: {filepath: string, moveFile?: boolean}): Promise<IResponse<undefined, "FILE_NOT_FOUND" | "LOCATION_NOT_ACCESSIBLE" | "ILLEGAL_FILE_EXTENSION">>
    /**
     * 通过客户端的缓存机制访问一项来自server的文件资源。该访问首先将文件资源下载到本地缓存目录，随后提供缓存文件的本地路径。
     * @param filepath 文件资源地址，以type开头
     * @return 此文件的本地路径
     */
    loadFile(filepath: string): Promise<IResponse<string, "FILE_NOT_FOUND">>
    /**
     * 根据提供的参数，将导出的文件下载到指定位置。
     * @param form location: 导出位置; zip: 导出并保存为zip文件，该参数指定zip文件名称
     */
    downloadExportFile(form: { imageIds?: number[], bookId?: number, location: string, zip?: string }): Promise<IResponse<undefined, "FILE_NOT_FOUND" | "LOCATION_NOT_ACCESSIBLE">>
    /**
     * 清理所有的本地缓存。
     */
    cleanAllCacheFiles(): Promise<void>
}

export function createFileManager(appdata: AppDataDriver, level: LevelManager, server: ServerManager, options: LocalOptions): FileManager {
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

    const downloadFile = async (config: string | AxiosRequestConfig, dest: string): Promise<IResponse<undefined, "FILE_NOT_FOUND">> => {
        const writer = fs.createWriteStream(dest)
        const response = await server.service.axiosRequest(typeof config === "string" ? {
            url: config,
            method: "GET",
            responseType: "stream"
        } : {...config, responseType: "stream"})
        if(response.status === 200) {
            response.data.pipe(writer)
            return new Promise((resolve, reject) => {
                writer.on("finish", () => resolve({ok: true, data: undefined}))
                writer.on("error", reject)
            })
        }else if(response.status === 404) {
            return {ok: false, code: "FILE_NOT_FOUND"}
        }else{
            return {ok: false, code: undefined, message: response.statusText}
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

    const importFile = async ({ filepath, moveFile }: {filepath: string, moveFile?: boolean}): Promise<IResponse<undefined, "FILE_NOT_FOUND" | "LOCATION_NOT_ACCESSIBLE" | "ILLEGAL_FILE_EXTENSION">> => {
        const stat = await statOrNull(filepath)
        if(stat === null) return {ok: false, code: "FILE_NOT_FOUND"}

        const data = new FormData()
        data.append("file", fs.createReadStream(filepath))
        data.append("creationTime", stat.birthtime.toISOString())
        data.append("modificationTime", stat.mtime.toISOString())

        const response = await server.service.request({url: "/api/imports/upload", method: "POST", data})
        if(response.ok) {
            if(moveFile) await fs.promises.rm(filepath, {force: true})
            return {ok: true, data: undefined}
        }else if(response.status) {
            return {ok: false, code: response.code as any, message: response.message}
        }else{
            return {ok: false, code: undefined, message: response.message ?? "Unknown error"}
        }
    }

    return {
        async load() {
            cleanExpiredFiles().catch(e => console.error("[FileManager] cleanExpiredFiles throws an Error.", e))
        },
        async loadFile(filepath) {
            const localCachePath = path.join(cachesDir, filepath)
            try {
                if(!await existsFile(localCachePath)) {
                    await mkdir(path.dirname(localCachePath))
                    const r = await downloadFile(path.join("archives", filepath), localCachePath)
                    if(!r.ok) return r
                }
            }catch(err) {
                return {ok: false, code: undefined, message: err instanceof Error ? err.message : typeof err === "string" ? err : err?.toString() ?? "unknown error"}
            }

            subLevel().put(filepath, {lastAccess: Date.now()}).catch(e => console.error("[FileManager] Cache file record failed.", e))

            return {ok: true, data: localCachePath}
        },
        async downloadExportFile(form) {
            const formData = {imageIds: form.imageIds, bookId: form.bookId}
            if(!await existsFile(form.location)) return {ok: false, code: "LOCATION_NOT_ACCESSIBLE"}
            if(form.zip) {
                try {
                    const r = await downloadFile({url: "/api/utils/export/download", method: "POST", data: formData}, path.join(form.location, form.zip))
                    if(!r.ok) return r
                }catch(err) {
                    return {ok: false, code: undefined, message: err instanceof Error ? err.message : typeof err === "string" ? err : err?.toString() ?? "unknown error"}
                }
            }else{
                try {
                    await downloadAndUnzip({url: "/api/utils/export/download", method: "POST", data: formData}, form.location)
                }catch(err) {
                    return {ok: false, code: undefined, message: err instanceof Error ? err.message : typeof err === "string" ? err : err?.toString() ?? "unknown error"}
                }
            }
            return {ok: true, data: undefined}
        },
        importFile,
        cleanAllCacheFiles
    }
}