import { nativeTheme } from "electron"
import { NativeTheme } from "@/components/appdata/model"
import { AppDataDriver, AppDataStatus } from "@/components/appdata"

/**
 * electron的主题管理器。管控窗口主题。
 */
export interface ThemeManager {
    /**
     * 初始化加载。
     */
    load(): void

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
        load() {
            if(appdata.status() === AppDataStatus.LOADED) {
                nativeTheme.themeSource = appdata.getAppData().appearanceOption.theme
            }
        },
        getTheme(): NativeTheme {
            if(appdata.status() === AppDataStatus.LOADED) {
                return appdata.getAppData().appearanceOption.theme
            }else{
                return nativeTheme.themeSource
            }
        },
        async setTheme(value: NativeTheme) {
            if(appdata.status() === AppDataStatus.LOADED) {
                await appdata.saveAppData(d => d.appearanceOption.theme = value)
            }
            nativeTheme.themeSource = value
        },
        getRuntimeTheme(): "light" | "dark" {
            return nativeTheme.shouldUseDarkColors ? "dark" : "light"
        }
    }
}
