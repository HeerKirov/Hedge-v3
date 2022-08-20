import { nativeTheme } from "electron"
import { NativeTheme } from "../components/appdata/model"
import { AppDataDriver, AppDataStatus } from "../components/appdata"

/**
 * electron的主题管理器。管控窗口主题。
 */
export interface ThemeManager {
    /**
     * 初始化加载。
     */
    load(): Promise<void>

    /**
     * 查看当前主题。
     */
    getTheme(): NativeTheme

    /**
     * 设定主题。
     * @param value
     */
    setTheme(value: NativeTheme): Promise<void>

    /**
     * 查看当前系统运行时的确定主题。
     */
    getRuntimeTheme(): "light" | "dark"
}

export function createThemeManager(appdata: AppDataDriver): ThemeManager {
    return {
        async load() {
            if(appdata.status() != AppDataStatus.NOT_INIT) {
                nativeTheme.themeSource = appdata.getAppData().appearanceOption.theme
            }
        },
        getTheme(): NativeTheme {
            return appdata.getAppData().appearanceOption.theme
        },
        async setTheme(value: NativeTheme) {
            await appdata.saveAppData(d => d.appearanceOption.theme = value)
            nativeTheme.themeSource = value
        },
        getRuntimeTheme(): "light" | "dark" {
            return nativeTheme.shouldUseDarkColors ? "dark" : "light"
        }
    }
}
