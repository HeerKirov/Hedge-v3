import { AppDataDriver } from "@/components/appdata"
import { ServerManager } from "@/components/server"
import { LevelManager } from "@/components/level"
import { StateManager } from "@/components/state"
import { createFileManager, FileManager } from "./file"
import { createFileWatcher, FileWatcher } from "./file-watcher"
import { createFileDragManager, FileDragManager } from "./file-drag"

export interface LocalManager {
    file: FileManager
    fileWatcher: FileWatcher
    fileDragManager: FileDragManager
}

export interface LocalOptions {
    /**
     * app的数据目录。例如对于Linux，它是~/.config/Hedge-v3目录。
     */
    userDataPath: string
    /**
     * app运行所在的频道名称。启动没有指定频道时，默认频道名为default。
     */
    channel: string
}

export function createLocalManager(appdata: AppDataDriver, level: LevelManager, server: ServerManager, state: StateManager, options: LocalOptions): LocalManager {
    const file = createFileManager(appdata, state, level, server, options)
    const fileWatcher = createFileWatcher(appdata, state, file)
    const fileDragManager = createFileDragManager(file, options)
    return {file, fileWatcher, fileDragManager}
}