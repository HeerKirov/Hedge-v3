import React, { ReactNode, memo, useCallback, useState } from "react"
import { css, styled } from "styled-components"
import { DARK_MODE_COLORS, ELEMENT_HEIGHTS, FunctionalColors, LIGHT_MODE_COLORS, RADIUS_SIZES, SPACINGS, ThemeColors } from "@/styles"
import { Separator } from "./Styled"

interface PopupMenuProps {
    items?: PopupMenuItem[] | (() => PopupMenuItem[])
    children?(popup: (e: React.MouseEvent<HTMLElement>) => void): ReactNode
}

export type PopupMenuItem = PopupMenuItemSeparator | PopupMenuItemNormal

interface PopupMenuItemSeparator {
    type: "separator"
}

interface PopupMenuItemNormal {
    type: "normal"
    label: string
    disabled?: boolean
    backgroundColor?: ThemeColors | FunctionalColors
    click?(): void
}

export const PopupMenu = memo(function(props: PopupMenuProps) {
    const [active, setActive] = useState<{x: number, y: number}>()

    const popup = useCallback((e: React.MouseEvent<HTMLElement>) => {
        setActive({x: e.clientX, y: e.clientY})
        e.preventDefault()
    }, [])

    const outsideClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        setActive(undefined)
        e.preventDefault()
    }, [])

    const close = useCallback(() => {
        setActive(undefined)
    }, [])

    return <>
        {props.children?.(popup)}
        {active && <PopupMenuBackground onClick={outsideClick} onContextMenu={outsideClick}/>}
        {active && <PopupMenuComponent menuItems={props.items ?? []} x={active.x} y={active.y} onClose={close}/>}
    </>
})

const PopupMenuComponent = memo(function(props: {x: number, y: number, menuItems: PopupMenuItem[] | (() => PopupMenuItem[]), onClose(): void}) {
    const menuItems = typeof props.menuItems === "function" ? props.menuItems() : props.menuItems
    
    return <PopupMenuDiv $x={props.x} $y={props.y}>
        {menuItems.map((menuItem, index) => <PopupMenuItemComponent key={`${index}-${menuItem.type}`} menuItem={menuItem} onClose={props.onClose}/>)}
    </PopupMenuDiv>
})

const PopupMenuItemComponent = memo(function(props: {menuItem: PopupMenuItem, onClose(): void}) {
    if(props.menuItem.type === "separator") {
        return <PopupMenuItemDiv>
            <Separator direction="horizontal" spacing={1}/> 
        </PopupMenuItemDiv>
    }else if(props.menuItem.type === "normal") {
        const click = props.menuItem.click
        const onClick = () => {
            click?.()
            props.onClose()
        }
        return <PopupMenuItemDiv $hoverable={!props.menuItem.disabled} $hoverBackgroundColor={props.menuItem.backgroundColor} $disabled={props.menuItem.disabled} onClick={!props.menuItem.disabled ? onClick : undefined}>
            {props.menuItem.label}
        </PopupMenuItemDiv>
    }else{
        return undefined
    }
})

const PopupMenuBackground = styled.div`
    position: fixed;
    z-index: 1;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
`

const PopupMenuDiv = styled.div<{ $x: number, $y: number }>`
    position: fixed;
    z-index: 2;
    min-width: 5.5em;
    user-select: none;
    left: ${p => p.$x}px;
    top: ${p => p.$y}px;
    padding: ${SPACINGS[1]};
    color: ${LIGHT_MODE_COLORS["text"]};
    background-color: ${LIGHT_MODE_COLORS["block"]};
    border: solid 1px ${LIGHT_MODE_COLORS["border"]};
    border-radius: ${RADIUS_SIZES["std"]};
    @media (prefers-color-scheme: dark) {
        color: ${DARK_MODE_COLORS["text"]};
        background-color: ${DARK_MODE_COLORS["block"]};
        border-color: ${DARK_MODE_COLORS["border"]};
    }
`

const PopupMenuItemDiv = styled.div<{ $hoverable?: boolean, $disabled?: boolean, $hoverBackgroundColor?: ThemeColors | FunctionalColors }>`
    line-height: ${ELEMENT_HEIGHTS["small"]};
    padding: 0 ${SPACINGS[2]};
    border-radius: ${RADIUS_SIZES["small"]};
    ${p => p.$disabled && css`
        color: ${LIGHT_MODE_COLORS["tertiary"]};
        @media (prefers-color-scheme: dark) {
            color: ${DARK_MODE_COLORS["tertiary"]};
        }
    `}
    ${p => p.$hoverable && css`
        &:hover, &:active {
            color: ${LIGHT_MODE_COLORS["text-inverted"]};
            background-color: ${LIGHT_MODE_COLORS[p.$hoverBackgroundColor ?? "primary"]};
            @media (prefers-color-scheme: dark) {
                color: ${DARK_MODE_COLORS["text-inverted"]};
                background-color: ${DARK_MODE_COLORS[p.$hoverBackgroundColor ?? "primary"]};
            }
        }
    `}
`
