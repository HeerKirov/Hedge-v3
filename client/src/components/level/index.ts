import path from "path"
import { Level } from "level"
import { DATA_FILE } from "../../constants/file"

export interface LevelManager {
    getLevel(): Level
}

export interface LevelManagerOptions {
    /**
     * app的数据目录。例如对于Linux，它是~/.config/Hedge-v3目录。
     */
    userDataPath: string
    /**
     * app运行所在的频道名称。启动没有指定频道时，默认频道名为default。
     */
    channel: string
}

export function createLevelManager(options: LevelManagerOptions): LevelManager {
    const channelPath = path.join(options.userDataPath, DATA_FILE.APPDATA.CHANNEL_FOLDER, options.channel)
    const levelDbPath = path.join(channelPath, DATA_FILE.APPDATA.CHANNEL.LEVEL_DB, options.channel)

    let db: Level | null = null

    function getLevel(): Level {
        if(db === null) db = new Level(levelDbPath)
        return db
    }

    return {getLevel}
}