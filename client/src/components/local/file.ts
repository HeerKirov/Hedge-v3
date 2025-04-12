import path from "path"
import fs from "fs"
import FormData from "form-data"
import { net } from "electron"
import { AxiosRequestConfig } from "axios"
import { AppDataDriver, AppDataStatus } from "@/components/appdata"
import { ServerManager } from "@/components/server"
import { StateManager } from "@/components/state"
import { LevelManager } from "@/components/level"
import { DATA_FILE } from "@/constants/file"
import { existsFile, mkdir, statOrNull, unzip } from "@/utils/fs"
import { lazy } from "@/utils/primitive"
import { IResponse } from "@/utils/types"
import { LocalOptions } from "."

export interface FileManager {
    /**
     * 执行文件模块的初始化。初始化操作主要为清理过期缓存。
     */
    load(): Promise<void>
    /**
     * 将本地指定位置的文件上传到服务器。
     * @param form 本地文件路径
     */
    importFile(form: {filepath: string, moveFile?: boolean}): Promise<IResponse<undefined, "FILE_NOT_FOUND" | "STORAGE_NOT_ACCESSIBLE" | "ILLEGAL_FILE_EXTENSION">>
    /**
     * 通过客户端的缓存机制访问一项来自server的文件资源。该访问首先将文件资源下载到本地缓存目录，随后提供缓存文件的本地路径。
     * @param filepath 文件资源地址，以type开头
     * @return 此文件的本地路径
     */
    loadFile(filepath: string): Promise<IResponse<string, "FILE_NOT_FOUND">>
    /**
     * 通过客户端的缓存机制访问一项来自server的文件资源。该访问首先将文件资源下载到本地缓存目录，随后提供此文件的流。
     * 该方法相比loadFile存在range机制。
     * @param filepath 文件资源地址，以type开头
     * @param range 选取范围
     * @return 此文件的流
     */
    loadStream(filepath: string, range?: {start: number, end: number}): Promise<IResponse<Promise<Response>, "FILE_NOT_FOUND">>
    /**
     * 预检一个文件是否已在本地存在缓存。如果该文件不存在，返回false，并立刻load此文件(不等待文件load完成)。
     * 此方法的用途是video组件在播放之前预检测src是否已在本地，如果不在本地则需要先使用网络流，并后台预载文件。
     * @param filepath 文件资源地址，以type开头
     * @return 是否可以立即使用此文件。true表示可以使用此本地文件，false表示暂时无法准备完毕。
     */
    checkAndLoadFile(filepath: string): Promise<IResponse<boolean, "FILE_NOT_FOUND">>
    /**
     * 根据提供的参数，将导出的文件下载到指定位置。
     * @param form location: 导出位置; zip: 导出并保存为zip文件，该参数指定zip文件名称
     */
    downloadExportFile(form: { imageIds?: number[], bookId?: number, location: string, zip?: string }): Promise<IResponse<undefined, "FILE_NOT_FOUND" | "FILE_ALREADY_EXISTS" | "LOCATION_NOT_ACCESSIBLE">>
    /**
     * 清理所有的本地缓存。
     */
    cleanAllCacheFiles(): Promise<void>
    /**
     * 查看与缓存相关的讯息。
     */
    cacheStatus(): Promise<CacheStatus>
}

export interface CacheStatus {
    cacheDir: string
    cacheSize: number
}

export function createFileManager(appdata: AppDataDriver, state: StateManager, level: LevelManager, server: ServerManager, options: LocalOptions): FileManager {
    const cacheDir = path.resolve(options.userDataPath, DATA_FILE.APPDATA.CHANNEL_FOLDER, options.channel, DATA_FILE.APPDATA.CHANNEL.CACHES_DIR)

    const subLevel = lazy(() => level.getLevel().sublevel<string, {lastAccess: number}>("ARCHIVE_FILE_CACHE", { valueEncoding: "json" }))

    const downloading = new Map<string, ((r: IResponse<string, "FILE_NOT_FOUND">) => void|Promise<void>)[]>()

    const getCacheFileSize = async () => {
        if(!await existsFile(cacheDir)) return 0
        let sum = 0
        const queue: string[] = [cacheDir]
        while(queue.length > 0) {
            const dir = queue.shift()!
            for(const f of await fs.promises.readdir(dir)) {
                const p = path.join(dir, f)
                const stat = await statOrNull(p)
                if(stat?.isDirectory()) {
                    queue.push(p)
                }else if(stat?.isFile()) {
                    sum += stat.size
                }
            }
        }
        return sum
    }

    const cleanExpiredFiles = async () => {
        const now = Date.now()

        const toBeDeleted: string[] = []
        for await(const [k, v] of subLevel().iterator()) {
            if(now - v.lastAccess >= appdata.getAppData().storageOption.cacheCleanIntervalDay * 1000 * 60 * 60 * 24) {
                toBeDeleted.push(k)
            }
        }
        if(toBeDeleted.length > 0) {
            for(const filepath of toBeDeleted) {
                await fs.promises.rm(path.join(cacheDir, filepath), { force: true })
            }
            await level.getLevel().batch(toBeDeleted.map(k => ({type: "del", sublevel: subLevel(), key: k})))
            console.log(`[FileManager] ${toBeDeleted.length} expired cache files are cleaned.`)
        }
    }

    const cleanAllCacheFiles = async () => {
        await fs.promises.rm(cacheDir, { recursive: true, force: true })
        await subLevel().clear()
    }

    let module: Pick<FileManager, "importFile" | "loadFile" | "downloadExportFile">

    const load: FileManager["load"] = async () => {
        if(appdata.status() === AppDataStatus.LOADED) {
            module = appdata.getAppData().loginOption.mode === "remote" ? createRemoteMode(server, cacheDir) : createLocalMode(server)
            cleanExpiredFiles().catch(e => console.error("[FileManager] cleanExpiredFiles throws an Error.", e))
        }else{
            const onInitialized = () => {
                module = appdata.getAppData().loginOption.mode === "remote" ? createRemoteMode(server, cacheDir) : createLocalMode(server)
                state.stateChangedEvent.removeEventListener(onInitialized)
            }
            state.stateChangedEvent.addEventListener(onInitialized)
        }
    }

    const loadFile: FileManager["loadFile"] = async (filepath) => {
        //1. 在内存中的下载池中，检查并添加此文件的信息。如果已有文件在下载池，就不应该重复下载
        //2. 调用archive或archive-local API，将文件下载到localCachePath.downloading的位置
        //3. 在文件下载完成后，将文件移到localCachePath位置，设置访问时间，从下载池中移除
        const localCachePath = path.join(cacheDir, filepath)
        if(downloading.has(filepath)) {
            const queue = downloading.get(filepath)!
            return new Promise((resolve, _) => {
                queue.push(resolve)
            })
        }else{
            try {
                const stat = await statOrNull(localCachePath)
                if(stat === null || stat.size <= 0) {
                    const queue: ((r: IResponse<string, "FILE_NOT_FOUND">) => void)[] = []
                    downloading.set(filepath, queue)
                    const r = await module.loadFile(filepath)
                    if(!r.ok) {
                        return r
                    }
                    await fs.promises.rename(`${localCachePath}.downloading`, localCachePath)
                    if(downloading.get(filepath) === queue) {
                        downloading.delete(filepath)
                    }
                    if(queue.length > 0) {
                        queue.forEach(i => i({ok: true, data: localCachePath}))
                    }
                }
            }catch(err) {
                const e: IResponse<string, "FILE_NOT_FOUND"> = {ok: false, code: undefined, message: err instanceof Error ? err.message : typeof err === "string" ? err : err?.toString() ?? "unknown error"}
                if(downloading.has(filepath)) {
                    const queue = downloading.get(filepath)!
                    downloading.delete(filepath)
                    if(queue.length > 0) {
                        queue.forEach(i => i(e))
                    }
                }
                return e
            }

            subLevel().put(filepath, {lastAccess: Date.now()}).catch(e => console.error("[FileManager] Cache file record failed.", e))

            return {ok: true, data: localCachePath}
        }
    }

    const loadStream: FileManager["loadStream"] = async (filepath, range) => {
        const r = await loadFile(filepath)
        if(r.ok) {
            return await localFileToStream(r.data, range)
        }else{
            return r
        }
    }

    const checkAndLoadFile: FileManager["checkAndLoadFile"] = async (filepath) => {
        if(downloading.has(filepath)) {
            //如果此文件正在下载池中，那么必然是没有准备完毕的，返回false
            return {ok: true, data: false}
        }
        const localCachePath = path.join(cacheDir, filepath)
        const stat = await statOrNull(localCachePath)
        if(stat !== null && stat.size > 0) {
            //如果此文件存在，则其已准备完成，返回true
            return {ok: true, data: true}
        }

        const extname = path.extname(filepath).substring(1).toLowerCase()
        if(["mp4", "webm", "ogv"].includes(extname)) {
            //如果此文件是视频，且其大小超过一个阈值，则此文件一时半会下载不下来，需要返回false，告知使用网络流
            const response = await server.service.axiosRequest({
                url: path.join("archives", filepath),
                headers: {"Range": `bytes=0-10`},
                method: "GET",
                responseType: "stream"
            })
            if(response.status === 206 || response.status === 200) {
                const matcher = (response.headers["content-range"] as string | undefined)?.match(/^bytes (\d+)-(\d+)\/(\d+)$/)
                if(matcher) {
                    const max = parseInt(matcher[3])
                    if(max > 1024 * 1024 * 10) {
                        //这表示文件超出10M的大小，不应该等它下载完成，而是应该直连
                        loadFile(filepath).catch(e => console.error("Error occurred in preloadFile.", e))
                        return {ok: true, data: false}
                    }
                }
            }else if(response.status === 404) {
                return {ok: false, code: "FILE_NOT_FOUND"}
            }else{
                return {ok: false, code: undefined, message: response.statusText}
            }
        }

        //其他情况则可以直接使用本地文件了
        return {ok: true, data: true}
    }

    return {
        load,
        async cacheStatus(): Promise<CacheStatus> {
            return {cacheDir, cacheSize: await getCacheFileSize()}
        },
        cleanAllCacheFiles,
        importFile: (f) => module.importFile(f),
        loadFile,
        loadStream,
        checkAndLoadFile,
        downloadExportFile: f => module.downloadExportFile(f)
    }
}

function createRemoteMode(server: ServerManager, cacheDir: string) {
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

    const importFile: FileManager["importFile"] = async ({ filepath, moveFile }) => {
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

    const loadFile: FileManager["loadFile"] = async (filepath) => {
        const localCachePath = path.join(cacheDir, filepath)
        await mkdir(path.dirname(localCachePath))
        const r = await downloadFile(path.join("archives", filepath), `${localCachePath}.downloading`)
        if(!r.ok) return r
        else return {ok: true, data: filepath}
    }

    const downloadExportFile: FileManager["downloadExportFile"] = async (form) => {
        const formData = {imageIds: form.imageIds, bookId: form.bookId}
        if(!await existsFile(form.location)) return {ok: false, code: "LOCATION_NOT_ACCESSIBLE"}
        if(form.zip) {
            try {
                const r = await downloadFile({url: "/api/utils/export/download", method: "POST", data: formData}, path.join(form.location, `${form.zip}.zip`))
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
    }

    return {importFile, loadFile, downloadExportFile}
}

function createLocalMode(server: ServerManager) {
    const downloadFile = async <E = "FILE_ALREADY_EXISTS">(config: string | AxiosRequestConfig): Promise<IResponse<undefined, "FILE_NOT_FOUND" | E>> => {
        const response = await server.service.request(typeof config === "string" ? {url: config, method: "GET"} : config)
        if(response.ok) {
            return {ok: true, data: undefined}
        }else if(response.status === 404) {
            return {ok: false, code: "FILE_NOT_FOUND"}
        }else if(response.status !== undefined) {
            return {ok: false, code: response.code as E, message: response.message, info: response.info}
        }else{
            return {ok: false, code: undefined, message: response.message ?? "Unknown error"}
        }
    }

    const importFile: FileManager["importFile"] = async ({ filepath, moveFile }) => {
        const stat = await statOrNull(filepath)
        if(stat === null) return {ok: false, code: "FILE_NOT_FOUND"}

        const response = await server.service.request({url: "/api/imports/import", method: "POST", data: {filepath, mobileImport: moveFile}})
        if(response.ok) {
            return {ok: true, data: undefined}
        }else if(response.status) {
            return {ok: false, code: response.code as any, message: response.message}
        }else{
            return {ok: false, code: undefined, message: response.message ?? "Unknown error"}
        }
    }

    const loadFile: FileManager["loadFile"] = async (filepath) => {
        const r = await downloadFile<never>({url: path.join("archives-for-local", filepath), params: {suffix: "downloading"}})
        if(r.ok) return {ok: true, data: filepath}
        else return r
    }

    const downloadExportFile: FileManager["downloadExportFile"] = async (form) => {
        const formData = {imageIds: form.imageIds, bookId: form.bookId, location: form.location, packageName: form.zip}
        if(!await existsFile(form.location)) return {ok: false, code: "LOCATION_NOT_ACCESSIBLE"}
        try {
            const r = await downloadFile({url: "/api/utils/export/download-local", method: "POST", data: formData})
            if(!r.ok) return r
        }catch(err) {
            return {ok: false, code: undefined, message: err instanceof Error ? err.message : typeof err === "string" ? err : err?.toString() ?? "unknown error"}
        }
        return {ok: true, data: undefined}
    }

    return {importFile, loadFile, downloadExportFile}
}

async function localFileToStream(localCachePath: string, range: {start: number, end: number} | undefined, stat: fs.Stats | null = null): Promise<IResponse<Promise<Response>, "FILE_NOT_FOUND">> {
    const extname = path.extname(localCachePath).substring(1).toLowerCase()
    if(range && VIDEO_EXTENSIONS.includes(extname)) {
        if(stat === null) stat = await statOrNull(localCachePath)
        const size = stat!.size
        const { start, end } = validateRange(range, size)
        const stream = fs.createReadStream(localCachePath, {start, end})
        const headers = new Headers()
        headers.set("Accept-Ranges", "bytes")
        headers.set("Content-Type", `video/${extname}`)
        headers.set("Content-Length", `${end - start + 1}`)
        headers.set("Content-Range", `bytes ${start}-${end}/${size}`)
        return {ok: true, data: new Promise(resolve => resolve(new Response(stream as any, {headers, status: 206})))}
    }else{
        return {ok: true, data: net.fetch(`file://${localCachePath}`)}
    }
}

function validateRange(range: {start: number, end: number}, size: number): {start: number, end: number} {
    if(isNaN(range.start)) {
        if(isNaN(range.end)) {
            return {start: NaN, end: NaN}
        }else{
            const start = size - range.end
            return {start: start < 0 ? 0 : start, end: size - 1}
        }
    }else{
        if(isNaN(range.end)) {
            // const end = range.start + DEFAULT_CHUNK_SIZE
            // return {start: range.start, end: end >= size ? size - 1 : end}
            return {start: range.start, end: size - 1}
        }else{
            return {start: range.start, end: range.end >= size ? size - 1 : range.end}
        }
    }
}

const VIDEO_EXTENSIONS = ["mp4", "webm", "ogv"]
