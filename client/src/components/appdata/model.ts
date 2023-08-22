export interface AppData {
    version: string
    loginOption: LoginOption
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

interface AppearanceOption {
    theme: NativeTheme
}

export type NativeTheme = "system" | "light" | "dark"

export function defaultValue(): AppData {
    return {
        version: "0.1.0",
        loginOption: {
            password: null,
            touchID: false,
            fastboot: false
        },
        appearanceOption: {
            theme: "system"
        }
    }
}
