import React, { ForwardedRef, forwardRef, memo, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { styled, css } from "styled-components"
import { LayouttedDiv } from "@/components/universal"
import { Input } from "@/components/form"
import { useWatch } from "@/utils/reactivity"
import { useOutsideClick } from "@/utils/sensors"

interface SearchListProps<T> {
    value?: T
    placeholder?: string
    initialText?: string
    size?: "small" | "std" | "large"
    width?: string
    autoFocus?: boolean
    mode?: "inline" | "float"
    onUpdateValue?(value: T, searchText: string): void
    query?(text: string): Promise<T[]>
    keyOf?(item: T): string
    labelOf?(item: T): string
    children?(attrs: {item: T, selected: boolean, text: string, onClick(e: React.MouseEvent): void}): ReactNode
}

interface DropdownListProps<T> {
    items: T[]
    selectedIndex: number | null
    searchText: string
    keyOf?(item: T): string
    children?(attrs: {item: T, selected: boolean, text: string, onClick(e: React.MouseEvent): void}): ReactNode
    onClick(item: T): void
}

export const SearchList = memo(forwardRef(function<T>(props: SearchListProps<T>, ref: ForwardedRef<HTMLElement>) {
    const [text, setText] = useState(props.value !== undefined ? props.labelOf?.(props.value) ?? `${props.value}` : props.initialText ?? "")

    const [items, setItems] = useState<T[]>()

    const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

    const queryTimer = useRef<NodeJS.Timeout>(undefined)

    const rootRef = useRef<HTMLDivElement | null>(null)

    useWatch(() => setText(props.value !== undefined ? props.labelOf?.(props.value) ?? `${props.value}` : ""), [props.value, props.labelOf])

    useEffect(() => () => { if(queryTimer.current !== undefined) clearTimeout(queryTimer.current) }, [])

    const onUpdateValue = useCallback((newText: string) => {
        if(text !== newText) {
            setText(newText)
            const trimed = newText.trim()
            if(queryTimer.current !== undefined) clearTimeout(queryTimer.current)
            if(trimed && props.query !== undefined) {
                queryTimer.current = setTimeout(async () => {
                    const res = await props.query!(trimed)
                    setItems(res)
                    setSelectedIndex(null)
                }, 250)
            }else{
                setItems(undefined)
                setSelectedIndex(null)
            }
        }
    }, [text, props.query])

    const clearQuery = useCallback(() => {
        if(queryTimer.current !== undefined) clearTimeout(queryTimer.current)
        setItems(undefined)
        setSelectedIndex(null)
    }, [])

    const select = useCallback((item: T) => {
        props.onUpdateValue?.(item, text.trim())
        clearQuery()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.onUpdateValue, text])

    const onKeydown = useCallback((e: React.KeyboardEvent) => {
        if(e.code === "ArrowUp") {
            if(items?.length) {
                setSelectedIndex(selectedIndex === null || selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1)
            }
            e.preventDefault()
        }else if(e.code === "ArrowDown") {
            if(items?.length) {
                setSelectedIndex(selectedIndex === null || selectedIndex >= items.length - 1 ? 0 : selectedIndex + 1)
            }
            e.preventDefault()
        }else if(e.code === "Enter") {
            if(items?.length) {
                if(selectedIndex === null) {
                    setSelectedIndex(0)
                }else{
                    select(items[selectedIndex])
                }
            }
            e.preventDefault()
        }else if(e.code === "Escape") {
            if(items !== undefined) {
                clearQuery()
                e.preventDefault()
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, select, selectedIndex])

    const onFocus = useCallback(() => {
        if(items === undefined && text && props.query !== undefined) {
            if(queryTimer.current !== undefined) clearTimeout(queryTimer.current)
            props.query(text).then(res => setItems(res))
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items, text, props.query])

    useOutsideClick(rootRef, clearQuery)

    return <SearchInputRootDiv ref={rootRef} $width={props.width} $mode={props.mode ?? "float"}>
        <Input ref={ref} placeholder={props.placeholder} autoFocus={props.autoFocus} size={props.size} width="100%"
               updateOnInput value={text} onUpdateValue={onUpdateValue} onKeydown={onKeydown} onFocus={onFocus}/>
        {items !== undefined && <DropdownList items={items} selectedIndex={selectedIndex} keyOf={props.keyOf} searchText={text} children={props.children} onClick={select}/>}
    </SearchInputRootDiv>
}))

const DropdownList = memo(function<T>({ items, selectedIndex, keyOf, onClick, searchText, children }: DropdownListProps<T>) {
    const list = useMemo(() => items.map(item => ({
        item,
        key: keyOf?.(item) ?? `${item}`,
        onClick: () => onClick(item)
    })), [items, keyOf, onClick])

    return <LayouttedDiv backgroundColor="block" border radius="std" padding={1}>
        {list.map(({ item, key, onClick }, index) => <div key={key}>
            {children?.({item, selected: index === selectedIndex, text: searchText, onClick})}
        </div>)}
    </LayouttedDiv>
})

const SearchInputRootDiv = styled.div<{ $width?: string, $mode: "inline" | "float" }>`
    position: relative;
    display: inline-block;
    ${p => p.$width && css`width: ${p.$width}`};
    > div {
        ${p => p.$mode === "float" ? css`
            position: absolute;
            left: 0;
        ` : css`
        `};
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: stretch;
        overflow-y: auto;
        max-height: 200px;
    }
`
