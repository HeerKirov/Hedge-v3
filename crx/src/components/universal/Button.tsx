import React, { ReactNode } from "react"
import { css, styled } from "styled-components"
import { IconProp } from "@fortawesome/fontawesome-svg-core"
import { DARK_MODE_COLORS, ELEMENT_HEIGHTS, FONT_SIZES, LIGHT_MODE_COLORS, MarginCSS, RADIUS_SIZES, SPACINGS, ThemeColors } from "@/styles"
import { Icon } from "./Icon"
import { Separator } from "./styled"

interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
    mode?: "transparent" | "filled"
    type?: ThemeColors
    size?: "tiny" | "std" | "small" | "large"
    square?: boolean
    round?: boolean
    width?: string
    disabled?: boolean
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
    onContextMenu?: (e: React.MouseEvent<HTMLButtonElement>) => void
    children?: ReactNode
}

interface SeparatorButton extends React.HTMLAttributes<HTMLButtonElement> {
    margin?: number | [number, number] | [number, number, number, number]
    spacing?: number
    icon?: IconProp
    text?: string
    disabled?: boolean
    onClick?: () => void
}

interface AnchorProps {
    disabled?: boolean
    onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
    children?: ReactNode
}

export function Button(props: ButtonProps) {
    const { mode, type, size, square, round, width, disabled, onClick, onContextMenu, children, ...attrs } = props
    return <StyledButton {...attrs} $mode={mode} $type={type} $size={size} $square={square} $round={round} $width={width} disabled={disabled} onClick={onClick} onContextMenu={onContextMenu}>
        {children}
    </StyledButton>
}

export function SeparatorButton(props: SeparatorButton) {
    const { spacing, margin, icon, text, disabled, onClick, ...attrs } = props
    return <StyledSeparatorButton {...attrs} $margin={margin} $spacing={spacing ?? 2} disabled={disabled} onClick={onClick}>
        <Separator direction="horizontal"/>
        <span>
            {icon !== undefined && <Icon icon={icon} mr={text !== undefined ? 2 : 0}/>}
            {text}
        </span>
        <Separator direction="horizontal"/>
    </StyledSeparatorButton>
}

export function Anchor(props: AnchorProps) {
    const { onClick, disabled, children } = props
    return <StyledAnchor $disabled={disabled} onClick={!disabled ? onClick : undefined}>{children}</StyledAnchor>
}

const StyledButton = styled.button<{
    $mode?: "transparent" | "filled"
    $type?: ThemeColors
    $size?: "tiny" | "std" | "small" | "large"
    $square?: boolean
    $round?: boolean
    $width?: string
}>`
    box-sizing: border-box;
    vertical-align: middle;
    padding: 0 ${p => p.$square ? "0" : "0.8em"};
    border-radius: ${p => RADIUS_SIZES[p.$round ? "round" : "std"]};
    font-size: ${p => FONT_SIZES[p.$size ?? "std"]};
    height: ${p => ELEMENT_HEIGHTS[p.$size ?? "std"]};
    line-height: ${p => ELEMENT_HEIGHTS[p.$size ?? "std"]};
    ${p => p.$square ? css`
        width: ${ELEMENT_HEIGHTS[p.$size ?? "std"]};
        flex-shrink: 0;
        flex-grow: 0;
    ` : p.$width ? css`
        width: ${p.$width};
    ` : null}
    ${p => p.$mode === "filled" ? css`
        color: ${LIGHT_MODE_COLORS["text-inverted"]};
        background-color: ${p.$type ? LIGHT_MODE_COLORS[p.$type] : "default"};
        &:hover:not([disabled]) {
            opacity: 0.88;
        }
        &:active:not([disabled]) {
            opacity: 0.8;
        }
        &[disabled] {
            opacity: 0.75;
        }
        @media (prefers-color-scheme: dark) {
            color: ${DARK_MODE_COLORS["text-inverted"]};
            background-color: ${p.$type ? DARK_MODE_COLORS[p.$type] : "default"};
        }
    `
    : css`
        background-color: rgba(255, 255, 255, 0);
        &:hover:not([disabled]) {
            background-color: rgba(45, 50, 55, 0.09);
        }
        &:active:not([disabled]) {
            background-color: rgba(45, 50, 55, 0.13);
        }
        ${p.disabled ? css`
            color: ${LIGHT_MODE_COLORS["secondary-text"]};
        ` : p.$type ? css`
            color: ${LIGHT_MODE_COLORS[p.$type]};
        ` : null};
        @media (prefers-color-scheme: dark) {
            ${p.disabled ? css`
                color: ${DARK_MODE_COLORS["secondary-text"]};
            ` : p.$type ? css`
                color: ${DARK_MODE_COLORS[p.$type]};
            ` : null}
        }
    `
}
`

const StyledSeparatorButton = styled(Button)<{ $spacing: number, $margin?: number | [number, number] | [number, number, number, number] }>`
    width: 100%;
    line-height: initial;
    height: calc(${p => SPACINGS[p.$spacing]} * 2 + 1px);
    padding: 0;
    ${MarginCSS};
    display: flex;
    flex-wrap: nowrap;
    justify-content: stretch;
    align-items: center;
    > div {
        flex: 1 1 auto;
    }
    > span {
        flex: 1 0 auto;
        margin: 0 ${SPACINGS[2]};
        > svg {
            transform: translateY(1px);
        }
    }
`

export const StyledAnchor = styled.a<{ $disabled?: boolean }>`
    user-select: none;
    cursor: ${p => p.$disabled ? "default" : "pointer"};
    color: ${p => LIGHT_MODE_COLORS[p.$disabled ? "secondary" : "primary"]};
    @media (prefers-color-scheme: dark) {
        color: ${p => DARK_MODE_COLORS[p.$disabled ? "secondary" : "primary"]};
    }
`
