import { styled, css } from "styled-components"
import { DARK_MODE_COLORS, LIGHT_MODE_COLORS, SPACINGS } from "@/styles"
import React, { ReactNode } from "react"

interface StandardSideLayoutProps {
    left?: ReactNode
    top?: ReactNode
    content?: ReactNode
    bottom?: ReactNode
    contentPadding?: number
    bottomPadding?: number
}

interface MiddleLayoutProps {
    left?: ReactNode
    middle?: ReactNode
    right?: ReactNode
}

interface AspectGridProps<T> {
    items?: T[] | null
    columnNum?: number
    aspect?: number
    spacing?: number
    children?(item: T, index: number): ReactNode
}

export function StandardSideLayout(props: StandardSideLayoutProps) {
    return <StandardSideLayoutRootDiv>
        <StandardSideLayoutLeftDiv>
            {props.left}
        </StandardSideLayoutLeftDiv>
        <StandardSideLayoutTopDiv>
            {props.top}
        </StandardSideLayoutTopDiv>
        <StandardSideLayoutContentDiv $rightVisible={!!props.bottom} $padding={props.contentPadding}>
            {props.content}
        </StandardSideLayoutContentDiv>
        {!!props.bottom && <StandardSideLayoutBottomDiv $padding={props.bottomPadding}>
            {props.bottom}
        </StandardSideLayoutBottomDiv>}
    </StandardSideLayoutRootDiv>
}

export function MiddleLayout(props: MiddleLayoutProps) {
    return <MiddleLayoutRootDiv>
        <MiddleLayoutContainer>
            {props.left}
        </MiddleLayoutContainer>
        {props.middle && <MiddleLayoutContainer>
            {props.middle}
        </MiddleLayoutContainer>}
        <MiddleLayoutContainer>
            {props.right}
        </MiddleLayoutContainer>
    </MiddleLayoutRootDiv>
}

export function AspectGrid<T>(props: AspectGridProps<T>) {
    return <AspectGridRootDiv $spacing={props.spacing} $column={props.columnNum ?? 1} $aspect={props.aspect ?? 1}>
        {props.items?.map((item, index) => (
            <AspectGridItemDiv key={index}>
                <div>
                    {props.children?.(item, index)}
                </div>
            </AspectGridItemDiv>
        ))}
    </AspectGridRootDiv>
}

const StandardSideLayoutRootDiv = styled.div`
    position: fixed;
    width: 100%;
    height: 100%;
    display: grid;
    grid-template-columns: 300px 1fr;
    grid-template-rows: 42px 1fr 300px;
`

const StandardSideLayoutLeftDiv = styled.div`
    grid-column-start: 1;
    grid-row-start: 1;
    grid-row-end: 4;
    padding: ${SPACINGS[4]};
    box-sizing: border-box;
    background-color: ${LIGHT_MODE_COLORS["block"]};
    border-right: 1px solid ${LIGHT_MODE_COLORS["border"]};
    @media (prefers-color-scheme: dark) {
        background-color: ${DARK_MODE_COLORS["block"]};
        border-right-color: ${DARK_MODE_COLORS["border"]};
    }
`

const StandardSideLayoutTopDiv = styled.div`
    grid-column-start: 2;
    grid-row-start: 1;
    padding: ${SPACINGS[1]};
    background-color: ${LIGHT_MODE_COLORS["block"]};
    border-bottom: 1px solid ${LIGHT_MODE_COLORS["border"]};
    @media (prefers-color-scheme: dark) {
        background-color: ${DARK_MODE_COLORS["block"]};
        border-bottom-color: ${DARK_MODE_COLORS["border"]};
    }
`

const StandardSideLayoutContentDiv = styled.div<{ $rightVisible: boolean, $padding?: number }>`
    grid-column-start: 2;
    grid-row-start: 2;
    grid-row-end: ${p => p.$rightVisible ? 3 : 4};
    overflow-y: auto;
    ${p => p.$padding && css`padding: ${SPACINGS[p.$padding]};` }
`

const StandardSideLayoutBottomDiv = styled.div<{ $padding?: number }>`
    grid-column-start: 2;
    grid-row-start: 3;
    ${p => p.$padding && css`padding: ${SPACINGS[p.$padding]};` }
    background-color: ${LIGHT_MODE_COLORS["block"]};
    border-top: 1px solid ${LIGHT_MODE_COLORS["border"]};
    @media (prefers-color-scheme: dark) {
        background-color: ${DARK_MODE_COLORS["block"]};
        border-top-color: ${DARK_MODE_COLORS["border"]};
    }
    
`

const MiddleLayoutRootDiv = styled.div`
    display: flex;
    flex-wrap: nowrap;
    justify-content: space-between;
    width: 100%;
    height: 100%;
`

const MiddleLayoutContainer = styled.div`
    align-items: center;
    min-width: 1rem;
    display: flex;
    flex-wrap: nowrap;
    &:not(:empty) {
        min-width: 8rem;
    }
    &:first-child {
        justify-content: flex-start;
    }
    &:last-child {
        justify-content: flex-end;
    }
    &:not(:first-child):not(:last-child) {
        justify-content: center;
        min-width: 50%;
        max-width: 75%
    }
`

const AspectGridRootDiv = styled.div<{ $spacing?: number, $column: number, $aspect: number }>`
    --var-column-num: ${p => p.$column};
    --var-aspect: ${p => p.$aspect};
    --var-gap: ${p => p.$spacing ? SPACINGS[p.$spacing] : "0px"};
    display: flex;
    flex-wrap: wrap;
    ${p => p.$spacing && css`gap: ${SPACINGS[p.$spacing]};` }
`

const AspectGridItemDiv = styled.div`
    position: relative;
    height: 0;
    width: calc((100% - (var(--var-column-num) - 1) * var(--var-gap)) / var(--var-column-num));
    padding-bottom: calc((100% - (var(--var-column-num) - 1) * var(--var-gap)) / var(--var-column-num) / var(--var-aspect));
    > div {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        > img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
        }
    }
`