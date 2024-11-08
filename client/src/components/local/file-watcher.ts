import path from "path"
import { FSWatcher, watch } from "chokidar"
import { AppDataDriver } from "../appdata"
import { AppState } from "../state/model"
import { readdir, statOrNull } from "../../utils/fs"
import { createEmitter, Emitter } from "../../utils/emitter"
import { FileManager } from "./file"
import { StateManager } from "../state"

export interface FileWatcher {
    /**
     * 改变fileWatcher的开关状态。
     * @param newValue
     */
    setOpen(newValue?: boolean): void
    /**
     * 获得当前状态。
     */
    status(): FileWatcherStatus
    /**
     * 文件监听器状态改变的事件。
     */
    fileWatcherChangedEvent: Emitter<FileWatcherStatus>
}

export interface FileWatcherStatus {
    isOpen: boolean
    statisticCount: number
    errors: {path: string, error: PathWatcherErrorReason}[]
}

export type PathWatcherErrorReason
    = "NO_USEFUL_PATH"
    | "PATH_NOT_EXIST"
    | "PATH_IS_NOT_DIRECTORY"
    | "PATH_WATCH_FAILED"

export function createFileWatcher(appdata: AppDataDriver, state: StateManager, file: FileManager): FileWatcher {
    const fileWatcherChangedEvent = createEmitter<FileWatcherStatus>()

    let isOpen = false
    let statisticCount = 0
    let errors: {path: string, error: PathWatcherErrorReason}[] = []
    let moveMode = false
    let watcher: FSWatcher | null = null

    state.stateChangedEvent.addEventListener(loadWhenStateReady)

    function loadWhenStateReady({ state: s }: {state: AppState}) {
        if(s === "READY" && appdata.getAppData().storageOption.autoFileWatch) {
            if(!isOpen) {
                isOpen = true
                startWatcher().finally()
            }
            state.stateChangedEvent.removeEventListener(loadWhenStateReady)
        }
    }

    async function startWatcher() {
        statisticCount = 0
        errors = []
        moveMode = appdata.getAppData().storageOption.fileWatchMoveMode
        if(appdata.getAppData().storageOption.fileWatchPaths.length <= 0) {
            errors.push({path: "", error: "NO_USEFUL_PATH"})
            return
        }
        const accessPaths: string[] = []
        for(const fileWatchPath of appdata.getAppData().storageOption.fileWatchPaths) {
            const stat = await statOrNull(fileWatchPath)
            if(stat === null) {
                errors.push({path: fileWatchPath, error: "PATH_NOT_EXIST"})
            }else if(!stat.isDirectory()) {
                errors.push({path: fileWatchPath, error: "PATH_IS_NOT_DIRECTORY"})
            }else{
                accessPaths.push(fileWatchPath)
            }
        }
        try {
            watcher = watch(accessPaths, {persistent: true, depth: 0, ignoreInitial: true, awaitWriteFinish: {stabilityThreshold: 500, pollInterval: 250}})
            watcher.on("add", (filepath) => {
                //tips: 有必要再做一层路径检查，chokidar的相关选项不保险。在使用macOS归档工具或其他压缩App解压文件时，事件响应会穿透depth限制。
                if(accessPaths.includes(path.dirname(filepath))) {
                    importFile(filepath)
                }
            })
        }catch(e) {
            console.error("[FileWatcher] File watch failed.", e)
            errors.push({path: "", error: "PATH_WATCH_FAILED"})
        }
        fileWatcherChangedEvent.emit({isOpen, statisticCount, errors})
        if(appdata.getAppData().storageOption.fileWatchInitialize) {
            for(const fileWatchPath of accessPaths) {
                const files = await readdir(fileWatchPath)
                files.filter(f => f.isFile()).map(f => f.name).filter(filename => !filename.startsWith(".")).forEach(filename => importFile(path.join(fileWatchPath, filename)))
            }
        }
    }

    function stopWatcher() {
        watcher?.close()
        fileWatcherChangedEvent.emit({isOpen, statisticCount, errors})
    }

    async function importFile(filepath: string) {
        if(AVAILABLE_EXTNAME.includes(path.extname(filepath).substring(1).toLowerCase())) {
            console.log(`[FileWatcher] import file '${filepath}'.`)
            const r = await file.importFile({filepath, moveFile: moveMode})
            if(r.ok) {
                statisticCount += 1
                fileWatcherChangedEvent.emit({isOpen, statisticCount, errors})
            }else if(r.code === "LOCATION_NOT_ACCESSIBLE" || r.code === "FILE_NOT_FOUND" || r.code === "ILLEGAL_FILE_EXTENSION") {
                //ignore this file
            }else{
                console.warn("[FileWatcher] Import file failed.", r.message)
            }
        }
    }

    return {
        setOpen(newValue: boolean) {
            if(newValue && !isOpen) {
                isOpen = true
                startWatcher().finally()
            }else if(!newValue && isOpen) {
                isOpen = false
                stopWatcher()
            }
        },
        status(): FileWatcherStatus {
            return {isOpen, statisticCount, errors}
        },
        fileWatcherChangedEvent
    }
}

const AVAILABLE_EXTNAME = ["jpeg", "jpg", "png", "gif", "webm", "mp4"]