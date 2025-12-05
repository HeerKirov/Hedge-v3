
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
export const SPACINGS: Record<number, `${number}rem`> = {
    "-1": "-0.25rem",
    0: "0rem",
    0.5: "0.125rem",
    1: "0.25rem",
    2: "0.5rem",
    3: "0.75rem",
    4: "1rem",
    5: "1.25rem",
    6: "1.5rem",
    7: "1.75rem",
    8: "2rem",
    9: "2.25rem",
    10: "2.5rem",
    11: "2.75rem",
    12: "3rem"
}