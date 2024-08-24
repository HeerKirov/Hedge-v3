
export const FONT_SIZE_NAMES = ["tiny", "small", "std", "large", "h4", "h3", "h2", "h1"] as const

export const RADIUS_SIZE_NAMES = ["small", "std", "large", "very-large", "round"] as const

export const ELEMENT_HEIGHT_NAMES = ["tiny", "small", "std", "large", "very-large"] as const

export type FontSizes = typeof FONT_SIZE_NAMES[number]

export type RadiusSizes = typeof RADIUS_SIZE_NAMES[number]

export type ElementHeights = typeof ELEMENT_HEIGHT_NAMES[number]

//字体尺寸选取表
export const FONT_SIZES: Record<FontSizes, `${number}px`> = {
    "tiny": "10px",
    "small": "12px",
    "std": "14px",
    "large": "16px",
    "h4": "18px",
    "h3": "22px",
    "h2": "26px",
    "h1": "30px"
}

//圆角尺寸选取表
export const RADIUS_SIZES: Record<RadiusSizes, `${number}px`> = {
    "small": "2px",
    "std": "3px",
    "large": "5px",
    "very-large": "7px",
    "round": "290486px"
}

//元素标准高度选取表
export const ELEMENT_HEIGHTS: Record<ElementHeights, `${number}px`> = {
    "tiny": "22px",
    "small": "28px",
    "std": "34px",
    "large": "40px",
    "very-large": "50px"
}

//间隙大小选取表
export const SPACINGS: `${number}rem`[] = Array(13).fill(0).map((_, index) => `${index * 0.25}rem` as const)
