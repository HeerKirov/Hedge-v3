import { ServerManager } from "../server"
import { LevelManager } from "../level"
import { createFileManager, FileManager } from "./file"

export interface LocalManager {
    file: FileManager
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

export function createLocalManager(level: LevelManager, server: ServerManager, options: LocalOptions): LocalManager {
    return {
        file: createFileManager(level, server, options)
    }
}