import { AppDataDriver } from "../appdata"
import { ServerManager } from "../server"
import { LevelManager } from "../level"
import { StateManager } from "../state"
import { createFileManager, FileManager } from "./file"
import { createFileWatcher, FileWatcher } from "./file-watcher"

export interface LocalManager {
    file: FileManager
    fileWatcher: FileWatcher
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
    const file = createFileManager(appdata, level, server, options)
    const fileWatcher = createFileWatcher(appdata, state, file)
    return {file, fileWatcher}
}