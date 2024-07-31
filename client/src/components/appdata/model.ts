export interface AppData {
    version: string
    loginOption: LoginOption
    connectOption: ConnectOption
    appearanceOption: AppearanceOption
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
}

interface ConnectOption {
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
    theme: NativeTheme
}

export type NativeTheme = "system" | "light" | "dark"

export function defaultValue(): AppData {
    return {
        version: "0.9.0",
        loginOption: {
            password: null,
            touchID: false,
            fastboot: false
        },
        connectOption: {
            mode: "local"
        },
        appearanceOption: {
            theme: "system"
        }
    }
}
