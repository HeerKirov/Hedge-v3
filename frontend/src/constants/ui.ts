import { NativeTheme } from "@/functions/ipc-client";

export const USEFUL_COLORS = ["green", "blue", "skyblue", "teal", "cyan", "yellow", "red", "orange", "pink", "deeppink", "tea", "brown"] as const

export const THEME_COLORS = ["primary", "info", "success", "warning", "danger"] as const

export const COLORS = [...USEFUL_COLORS, ...THEME_COLORS] as const

export type UsefulColors = typeof USEFUL_COLORS[number]

export type ThemeColors = typeof THEME_COLORS[number]

export type Colors = typeof COLORS[number]

export const NATIVE_THEME_NAMES: Record<NativeTheme, string> = {
    "system": "跟随系统",
    "light": "亮色",
    "dark": "暗色"
}
