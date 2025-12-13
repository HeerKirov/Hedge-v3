import React, { ForwardedRef, forwardRef, ReactNode } from "react"
import { styled, css } from "styled-components"
import { DARK_MODE_COLORS, ELEMENT_HEIGHTS, ElementHeights, FONT_SIZES, FontSizes, LIGHT_MODE_COLORS, ThemeColors, FunctionalColors, SPACINGS, RadiusSizes, RADIUS_SIZES, MarginCSS } from "@/styles"

interface Children {
    children?: ReactNode
}

export interface Formatted {
    backgroundColor?: ThemeColors | FunctionalColors
    color?: ThemeColors | FunctionalColors
    size?: FontSizes
    lineHeight?: ElementHeights
    elementHeight?: ElementHeights
    bold?: boolean
    monospace?: boolean
    textAlign?: "left" | "center" | "right"
    userSelect?: "text" | "none"
    float?: "right" | "left"
    whiteSpace?: "normal" | "nowrap"
    mr?: number, ml?: number
}

export interface Layoutted {
    display?: "block" | "inline-block" | "inline" | "flex"
    position?: "relative" | "absolute" | "fixed"
    width?: number | string
    height?: number | string
    margin?: number | [number, number] | [number, number, number, number]
    padding?: number | [number, number] | [number, number, number, number]
    border?: boolean, radius?: RadiusSizes, borderColor?: ThemeColors | FunctionalColors
    mr?: number, ml?: number, mt?: number, mb?: number
    pr?: number, pl?: number, pt?: number, pb?: number
}

interface SeparatorProps {
    direction?: "horizontal" | "vertical"
    spacing?: number | [number, number]
}

type FormattedTextProps = Formatted & Children & React.HTMLAttributes<HTMLSpanElement>

type LayouttedDivProps = Formatted & Layoutted & Children & React.HTMLAttributes<HTMLDivElement>

type WrappedTextProps = {text?: string} & React.HTMLAttributes<HTMLElement>

type StyledFormattedProps = { [K in keyof Formatted as `$${K}`]: Formatted[K] }

type StyledLayouttedProps = { [K in keyof Layoutted as `$${K}`]: Layoutted[K] }

type StyledSeparatorProps = { [K in keyof SeparatorProps as `$${K}`]: SeparatorProps[K] }

export function FormattedText(props: FormattedTextProps) {
    const { backgroundColor, bold, color, size, textAlign, whiteSpace, monospace, lineHeight, float, elementHeight, mr, ml, userSelect, children, ...attrs } = props
    
    return <StyledFormattedText {...attrs} 
        $backgroundColor={backgroundColor} $textAlign={textAlign} $bold={bold} $color={color} $size={size} 
        $elementHeight={elementHeight} $lineHeight={lineHeight} $float={float} $monospace={monospace}
        $mr={mr} $ml={ml} $userSelect={userSelect} $whiteSpace={whiteSpace}
    >{children}</StyledFormattedText>
}

export const LayouttedDiv = forwardRef(function (props: LayouttedDivProps, ref: ForwardedRef<HTMLDivElement>) {
    const {
        backgroundColor, color, display, width, height, radius, border, borderColor, float, whiteSpace,
        bold, size, lineHeight, elementHeight, textAlign, userSelect, monospace, position,
        margin, padding, mr, ml, mt, mb, pr, pl, pt, pb,
        children, ...attrs
    } = props

    return <StyledLayouttedDiv {...attrs} ref={ref}
                               $backgroundColor={backgroundColor} $display={display} $position={position} $width={width} $height={height}
                               $radius={radius} $border={border} $borderColor={borderColor}
                               $bold={bold} $color={color} $size={size}  $textAlign={textAlign} $float={float} $whiteSpace={whiteSpace}
                               $lineHeight={lineHeight} $elementHeight={elementHeight} $userSelect={userSelect} $monospace={monospace}
                               $margin={margin} $padding={padding}
                               $mr={mr} $ml={ml} $mt={mt} $mb={mb}
                               $pt={pt} $pb={pb} $pl={pl} $pr={pr}
    >{children}</StyledLayouttedDiv>
})

export function Separator(props: SeparatorProps & React.HTMLAttributes<HTMLDivElement>) {
    const { direction, spacing, ...attrs } = props
    return <StyledSeparator $direction={direction} $spacing={spacing} {...attrs}/>
}

export function WrappedText(props: WrappedTextProps) {
    const { text, ...attrs } = props
    return text?.length ? text.split("\n").map(line => line ? <p {...attrs}>{line}</p> : <br {...attrs}/>) : <p {...attrs}/>
}

const FormattedCSS = css<StyledFormattedProps>`
    ${p => p.$backgroundColor && css`
        background-color: ${LIGHT_MODE_COLORS[p.$backgroundColor]};
        @media (prefers-color-scheme: dark) {
            background-color: ${DARK_MODE_COLORS[p.$backgroundColor]};
        }
    `}
    ${p => p.$color && css`
        color: ${LIGHT_MODE_COLORS[p.$color]};
        @media (prefers-color-scheme: dark) {
            color: ${DARK_MODE_COLORS[p.$color]};
        }
    `}
    ${p => p.$whiteSpace && css`white-space: ${p.$whiteSpace};`}
    ${p => p.$monospace && css`font-family: monospace;`}
    ${p => p.$bold && css`font-weight: 700;`}
    ${p => p.$size && css`font-size: ${FONT_SIZES[p.$size]};`}
    ${p => p.$textAlign && css`text-align: ${p.$textAlign};`}
    ${p => p.$lineHeight && css`line-height: ${ELEMENT_HEIGHTS[p.$lineHeight]};`}
    ${p => p.$elementHeight && css`height: ${ELEMENT_HEIGHTS[p.$elementHeight]};`}
    ${p => p.$userSelect && css`user-select: ${p.$userSelect};`}
    ${p => p.$float && css`float: ${p.$float};`}
    ${p => p.$mr && css`margin-right: ${SPACINGS[p.$mr]};`}
    ${p => p.$ml && css`margin-left: ${SPACINGS[p.$ml]};`}
`

const LayouttedCSS = css<StyledLayouttedProps>`
    ${p => p.$display && css`display: ${p.$display};`}
    ${p => p.$position && css`position: ${p.$position};`}
    ${p => p.$width && css`width: ${p.$width};`}
    ${p => p.$height && css`height: ${p.$height};`}
    ${p => p.$radius && css`border-radius: ${RADIUS_SIZES[p.$radius]};`}
    ${p => p.$border && css`
        border: solid 1px ${LIGHT_MODE_COLORS[p.$borderColor ?? "border"]};
        @media (prefers-color-scheme: dark) {
            border-color: ${DARK_MODE_COLORS[p.$borderColor ?? "border"]};
        }
    `}
    ${MarginCSS}
    ${p => p.$padding && (
        typeof p.$padding === "number" ? css`padding: ${SPACINGS[p.$padding]};` 
        : p.$padding.length === 2 ? css`padding: ${SPACINGS[p.$padding[0]]} ${SPACINGS[p.$padding[1]]};`
        : css`padding: ${SPACINGS[p.$padding[0]]} ${SPACINGS[p.$padding[1]]} ${SPACINGS[p.$padding[2]]} ${SPACINGS[p.$padding[3]]};`
    )}
    ${p => p.$mr && css`margin-right: ${SPACINGS[p.$mr]};`}
    ${p => p.$ml && css`margin-left: ${SPACINGS[p.$ml]};`}
    ${p => p.$mt && css`margin-top: ${SPACINGS[p.$mt]};`}
    ${p => p.$mb && css`margin-bottom: ${SPACINGS[p.$mb]};`}
    ${p => p.$pr && css`padding-right: ${SPACINGS[p.$pr]};`}
    ${p => p.$pl && css`padding-left: ${SPACINGS[p.$pl]};`}
    ${p => p.$pt && css`padding-top: ${SPACINGS[p.$pt]};`}
    ${p => p.$pb && css`padding-bottom: ${SPACINGS[p.$pb]};`}
`

const StyledFormattedText = styled.span<StyledFormattedProps>`
    ${FormattedCSS}
`

const StyledLayouttedDiv = styled.div<StyledFormattedProps & StyledLayouttedProps>`
    box-sizing: border-box;
    ${FormattedCSS}
    ${LayouttedCSS}
`

export const IconImg = styled.img`
    display: inline-block;
    width: 16px;
    height: 16px;
    margin-right: 4px;
    transform: translateY(2px);
`

export const Group = styled.div`
    display: inline-block;
    > :not(:last-child) {
        margin-right: ${SPACINGS[1]};
    }
`

export const Header = styled.h4`
    font-weight: 700;
    display: block;
    color: ${LIGHT_MODE_COLORS["text"]};
    margin-bottom: ${SPACINGS[2]};
    &:not(:first-child) {
        margin-top: ${SPACINGS[2]};
    }
    @media (prefers-color-scheme: dark) {
        color: ${DARK_MODE_COLORS["text"]};
    }
`

export const Label = styled.label`
    font-weight: 700;
    display: block;
    color: ${LIGHT_MODE_COLORS["text"]};
    &:not(:first-child) {
        margin-top: ${SPACINGS[2]};
    }
    @media (prefers-color-scheme: dark) {
        color: ${DARK_MODE_COLORS["text"]};
    }
`

export const SecondaryText = styled.p`
    font-size: ${FONT_SIZES["small"]};
    color: ${LIGHT_MODE_COLORS["secondary-text"]};
    @media (prefers-color-scheme: dark) {
        color: ${DARK_MODE_COLORS["secondary-text"]};
    }
`

const StyledSeparator = styled.div<StyledSeparatorProps>`
    box-sizing: border-box;
    flex: 0 0 auto;
    background-color: ${LIGHT_MODE_COLORS["border"]};
    @media (prefers-color-scheme: dark) {
        background-color: ${DARK_MODE_COLORS["border"]};
    }
    ${p => p.$direction === "vertical" ? css`
        display: inline-block;
        vertical-align: middle;
        width: 1px;
        height: ${ELEMENT_HEIGHTS["std"]};
        ${p.$spacing && (typeof p.$spacing === "number" 
            ? css`margin: 0 ${SPACINGS[p.$spacing]};` 
            : css`margin: 0 ${SPACINGS[p.$spacing[1]]} 0 ${SPACINGS[p.$spacing[0]]};`
        )}
    ` : css`
        display: block;
        width: 100%;
        height: 1px;
        ${p.$spacing && (typeof p.$spacing === "number" 
            ? css`margin: ${SPACINGS[p.$spacing]} 0;`
            : css`margin: ${SPACINGS[p.$spacing[0]]} 0 ${SPACINGS[p.$spacing[1]]} 0;`
        )}
    `}
`
