import { css } from "styled-components"
import { SPACINGS } from "@/styles/size"

export const MarginCSS = css<{ $margin?: number | [number, number] | [number, number, number, number] }>`
  ${p => p.$margin && (
    typeof p.$margin === "number" ? css`margin: ${SPACINGS[p.$margin]};`
        : p.$margin.length === 2 ? css`margin: ${SPACINGS[p.$margin[0]]} ${SPACINGS[p.$margin[1]]};`
            : css`margin: ${SPACINGS[p.$margin[0]]} ${SPACINGS[p.$margin[1]]} ${SPACINGS[p.$margin[2]]} ${SPACINGS[p.$margin[3]]};`
)}
`
