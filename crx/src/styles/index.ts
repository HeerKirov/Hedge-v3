import { createGlobalStyle } from "styled-components"
import { LIGHT_MODE_COLORS, DARK_MODE_COLORS } from "./color"
import { FONT_SIZES } from "./size"

export { BASIC_COLOR_NAMES, THEME_COLOR_NAMES, LIGHT_MODE_COLORS, DARK_MODE_COLORS } from "./color"
export { FONT_SIZE_NAMES, RADIUS_SIZE_NAMES, ELEMENT_HEIGHT_NAMES, FONT_SIZES, RADIUS_SIZES, ELEMENT_HEIGHTS, SPACINGS } from "./size"
export type { BasicColors, ThemeColors, FunctionalColors } from "./color"
export type { FontSizes, RadiusSizes, ElementHeights } from "./size"

export { MarginCSS } from "./css"

export const GlobalStyle = createGlobalStyle`

body, #body {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    text-align: initial;
    padding: initial;
    margin: initial;
    font-size: ${FONT_SIZES["std"]};
    background-color: ${LIGHT_MODE_COLORS["background"]};
    color: ${LIGHT_MODE_COLORS["text"]};
    @media (prefers-color-scheme: dark) {
        background-color: ${DARK_MODE_COLORS["background"]};
        color: ${DARK_MODE_COLORS["text"]};
    }
}

html::-webkit-scrollbar {
    display: none;
}

//按钮默认样式
button {
    appearance: auto;
    border-style: outset;
    border-image: initial;
    border-color: transparent;
    border-width: 0;
    word-spacing: normal;
    letter-spacing: normal;
    text-rendering: auto;
    text-transform: none;
    text-indent: 0;
    text-shadow: none;
    text-align: center;
    justify-content: center;
    white-space: nowrap;
    align-items: flex-start;
    display: inline-block;
    box-sizing: border-box;
    outline: none;
    color: inherit;
}

//文本默认样式
html,
body,
p,
ol,
ul,
li,
dl,
dt,
dd,
blockquote,
figure,
fieldset,
legend,
textarea,
pre,
iframe,
hr,
h1,
h2,
h3,
h4,
h5,
h6 {
    margin: 0;
    padding: 0;
}

article,
aside,
figure,
footer,
header,
hgroup,
section {
    display: block;
}

span {
    font-style: inherit;
    font-weight: inherit;
}

h1 {
    font-size: ${FONT_SIZES["h1"]};
}

h2 {
    font-size: ${FONT_SIZES["h2"]};
}

h3 {
    font-size: ${FONT_SIZES["h3"]};
}

h4 {
    font-size: ${FONT_SIZES["h4"]};
}

code {
    font-weight: normal;
    padding-right: 0.25em;
    padding-left: 0.25em;
    color: ${LIGHT_MODE_COLORS["danger"]};
    @media (prefers-color-scheme: dark) {
        color: ${DARK_MODE_COLORS["danger"]};
    }
}

img,
video {
    display: block;
}
`
