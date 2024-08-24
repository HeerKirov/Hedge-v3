import { maps } from "@/utils/primitives"

export const BASIC_COLOR_NAMES = ["green", "blue", "skyblue", "teal", "cyan", "yellow", "red", "orange", "pink", "deeppink", "tea", "brown"] as const

export const THEME_COLOR_NAMES = ["primary", "info", "success", "warning", "danger", "secondary", "tertiary"] as const

const GREY_COLOR_NAMES = ["white", "white2", "black", "black2", "black3", "black4", "grey", "lightgrey", "lightgrey2"] as const

const FUNCTIONAL_COLOR_NAMES = ["background", "block", "border", "text", "text-inverted", "secondary-text"] as const

export type BasicColors = typeof BASIC_COLOR_NAMES[number]

export type ThemeColors = typeof THEME_COLOR_NAMES[number]

type GreyColors = typeof GREY_COLOR_NAMES[number]

export type FunctionalColors = typeof FUNCTIONAL_COLOR_NAMES[number]

type InvertedBasicColors = `${BasicColors}-inverted`

// 基本颜色定义
const BASIC_COLOR_DEFINITIONS: Record<BasicColors, string> = {
    "green": "#18a058",
    "blue": "#1468cc",
    "skyblue": "#00bfff",
    "teal": "#008080",
    "cyan": "#00d1b2",
    "yellow": "#fcb040",
    "red": "#d03050",
    "orange": "#ff7f50",
    "pink": "#fa7c91",
    "deeppink": "#ff1493",
    "tea": "#757763",
    "brown": "#8b4513",
}

//基本颜色反转定义
const BASIC_COLOR_INVERTED_DEFINITIONS: Record<InvertedBasicColors, string> = {
    "green-inverted": "#63e2b7",
    "blue-inverted": "#449fce",
    "skyblue-inverted": "#6ed5f8",
    "teal-inverted": "#568c8c",
    "cyan-inverted": "#88d9cd",
    "yellow-inverted": "#f2c97d",
    "red-inverted": "#e88080",
    "orange-inverted": "#fda584",
    "pink-inverted": "#fca5b3",
    "deeppink-inverted": "#fc7fc3",
    "tea-inverted": "#aaad91",
    "brown-inverted": "#8b603f",
}

//灰度颜色定义
const GREY_COLOR_DEFINITIONS: Record<GreyColors, string> = {
    "white": "#ffffff",
    "white2": "#f5f5f5",
    "black": "#000000",
    "black2": "#111417",
    "black3": "#16181e",
    "black4": "#4c4c52",
    "grey": "#7a7a7a",
    "lightgrey": "#e6e6f0",
    "lightgrey2": "#373741",
}

//主题色选取
const THEME_COLOR_PICKS: Record<ThemeColors, BasicColors | [GreyColors, GreyColors]> = {
    "primary": "blue",
    "info": "skyblue",
    "success": "green",
    "warning": "yellow",
    "danger": "red",
    "secondary": ["grey", "grey"],
    "tertiary": ["lightgrey", "lightgrey2"]
}

//功能色选取
const FUNCTIONAL_COLOR_PICKS: Record<FunctionalColors, BasicColors | [GreyColors, GreyColors]> = {
    "background": ["white2", "black2"],
    "block": ["white", "black3"],
    "text": ["black4", "white2"],
    "text-inverted": ["white", "black"],
    "secondary-text": ["grey", "grey"],
    "border": ["lightgrey", "lightgrey2"]
}

//最终导出的颜色表
export const LIGHT_MODE_COLORS: Record<FunctionalColors | ThemeColors | BasicColors, string> = maps.parse([
    ...Object.entries(FUNCTIONAL_COLOR_PICKS).map(([c, v]) => [c, typeof v === "string" ? BASIC_COLOR_DEFINITIONS[v] : GREY_COLOR_DEFINITIONS[v[0]]] as [FunctionalColors, string]),
    ...Object.entries(THEME_COLOR_PICKS).map(([c, v]) => [c, typeof v === "string" ? BASIC_COLOR_DEFINITIONS[v] : GREY_COLOR_DEFINITIONS[v[0]]] as [ThemeColors, string]),
    ...Object.entries(BASIC_COLOR_DEFINITIONS) as [BasicColors, string][]
])
export const DARK_MODE_COLORS: Record<FunctionalColors | ThemeColors | BasicColors, string> = maps.parse([
    ...Object.entries(FUNCTIONAL_COLOR_PICKS).map(([c, v]) => [c, typeof v === "string" ? BASIC_COLOR_INVERTED_DEFINITIONS[`${v}-inverted`] : GREY_COLOR_DEFINITIONS[v[1]]] as [FunctionalColors, string]),
    ...Object.entries(THEME_COLOR_PICKS).map(([c, v]) => [c, typeof v === "string" ? BASIC_COLOR_INVERTED_DEFINITIONS[`${v}-inverted`] : GREY_COLOR_DEFINITIONS[v[1]]] as [ThemeColors, string]),
    ...Object.entries(BASIC_COLOR_DEFINITIONS).map(([c, _]) => [c, BASIC_COLOR_INVERTED_DEFINITIONS[`${c as BasicColors}-inverted`]] as [BasicColors, string])
])
