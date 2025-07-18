export interface AppData {
    version: string
    loginOption: LoginOption
    appearanceOption: AppearanceOption
    behaviourOption: BehaviourOption
    storageOption: StorageOption
}

interface LoginOption {
    /**
     * 登陆密码。null表示不需要密码。
     */
    password: string | null
    /**
     * 在支持touchID的机器上尝试通过touchID登录。
     */
    touchID: boolean
    /**
     * 在client启动后就尝试启动服务器，而不是等待登录通过。
     */
    fastboot: boolean
    /**
     * 此频道使用何种连接模式。
     * local: server在本地启动，由client/cli等自行启动作为后台服务。
     * remote: server需要自行部署在远程位置，就像传统的服务器端那样。
     */
    mode: "local" | "remote"
    /**
     * 当采用远程模式时，所需的连接参数。
     */
    remote?: { host: string; token: string }
}

interface AppearanceOption {
    /**
     * 主题。
     */
    theme: NativeTheme
}

interface BehaviourOption {
    /**
     * 自定义浏览器列表。
     */
    customBrowserList: {name: string, path: string}[]
    /**
     * 打开外部链接时使用的浏览器。null表示不指定，使用默认浏览器。
     */
    externalBrowser: string | null
}

interface StorageOption {
    /**
     * 自动清理缓存间隔的天数。
     */
    cacheCleanIntervalDay: number
    /**
     * 监听目录功能所监听的所有目录。
     */
    fileWatchPaths: string[]
    /**
     * 程序启动时，自动开启监听目录功能。
     */
    autoFileWatch: boolean
    /**
     * 监听功能将移动/删除所监听到的文件。
     */
    fileWatchMoveMode: boolean
    /**
     * 监听功能开启时，首先扫描一遍目录内已有的文件。
     */
    fileWatchInitialize: boolean
}

export type NativeTheme = "system" | "light" | "dark"

export function defaultValue(): AppData {
    return {
        version: "0.9.0",
        loginOption: {
            password: null,
            touchID: false,
            fastboot: false,
            mode: "local"
        },
        appearanceOption: {
            theme: "system"
        },
        behaviourOption: {
            customBrowserList: [],
            externalBrowser: null
        },
        storageOption: {
            cacheCleanIntervalDay: 7,
            fileWatchPaths: [],
            autoFileWatch: false,
            fileWatchMoveMode: true,
            fileWatchInitialize: true
        }
    }
}
