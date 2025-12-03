import React, { useEffect, useRef, useState } from "react"
import { mix } from "polished"
import { styled, css } from "styled-components"
import { useWatch } from "@/utils/reactivity"
import { DARK_MODE_COLORS, ELEMENT_HEIGHTS, FONT_SIZES, FunctionalColors, LIGHT_MODE_COLORS, RADIUS_SIZES, ThemeColors } from "@/styles"

interface InputProps {
    value?: string | null | undefined
    type?: "text" | "password" | "number" | "textarea"
    size?: "small" | "std" | "large"
    textAlign?: "left" | "center" | "right"
    maxHeight?: string
    minHeight?: string
    rows?: number
    borderColor?: ThemeColors | FunctionalColors
    width?: string
    placeholder?: string
    disabled?: boolean
    updateOnInput?: boolean
    autoFocus?: boolean
    onUpdateValue?(value: string): void
    onKeydown?(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void
    onEnter?(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void
    onBlur?(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>): void
    onFocus?(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>): void
}

interface DateInputProps {
    value?: Date
    onUpdateValue?(value: Date | undefined): void
    size?: "small" | "std" | "large"
    textAlign?: "left" | "center" | "right"
    borderColor?: ThemeColors | FunctionalColors
    errorBorderColor?: ThemeColors | FunctionalColors
    width?: string
    placeholder?: string
    disabled?: boolean
    autoFocus?: boolean
}

export const Input = React.forwardRef(function (props: InputProps, ref: React.ForwardedRef<HTMLElement>) {
    const { type, size, width, textAlign, borderColor, placeholder, disabled, value, onUpdateValue } = props

    //输入法合成器防抖
    const compositionRef = useRef(false)
    const onCompositionstart = () => compositionRef.current = true
    const onCompositionend = () => compositionRef.current = false

    //自动聚焦
    const localRef = useRef<HTMLElement | null>(undefined)
    const setRef = (el: HTMLInputElement | HTMLTextAreaElement | null) => {
        if(ref !== null) {
            if(typeof ref === "function") ref(el)
            else ref.current = el
        }
        if(props.autoFocus) {
            localRef.current = el
        }
    }
    if(props.autoFocus) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => { localRef.current?.focus() }, [])
    }

    if(props.updateOnInput) {
        const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onUpdateValue?.(e.target.value)

        const onKeydown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            if(!compositionRef.current) {
                props.onKeydown?.(e)
                if(e.code === "Enter" && !e.ctrlKey && !e.altKey) {
                    props.onEnter?.(e)
                }
            }
        }
    
        if(type === "textarea") {
            return <StyledTextarea ref={setRef} 
                $size={size ?? "std"} $width={width} $textAlign={textAlign} $borderColor={borderColor}
                $maxHeight={props.maxHeight} $minHeight={props.minHeight} rows={props.rows}
                disabled={disabled} placeholder={placeholder} value={value ?? undefined} 
                onChange={onChange} onKeyDown={onKeydown} onBlur={props.onBlur} onFocus={props.onFocus}
                onCompositionStart={onCompositionstart} onCompositionEnd={onCompositionend}/>
        }else{
            return <StyledInput ref={setRef} 
                $size={size ?? "std"} $width={width} $textAlign={textAlign} $borderColor={borderColor}
                type={type ?? "text"} disabled={disabled} placeholder={placeholder} value={value ?? undefined} 
                onChange={onChange} onKeyDown={onKeydown} onBlur={props.onBlur} onFocus={props.onFocus}
                onCompositionStart={onCompositionstart} onCompositionEnd={onCompositionend}/>
        }
    }else{
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [text, setText] = useState<string>(props.value ?? "")

        // eslint-disable-next-line react-hooks/rules-of-hooks
        useWatch(() => setText(props.value ?? ""), [props.value ?? ""])

        const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setText(e.target.value)

        const onKeydown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            if(!compositionRef.current) {
                props.onKeydown?.(e)
                if(e.code === "Enter" && !e.ctrlKey && !e.altKey) {
                    props.onEnter?.(e)
                    //在按下Enter时，主动触发updateValue
                    if(type !== "textarea") props.onUpdateValue?.(text)
                }
            }
        }
    
        const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            onUpdateValue?.(text)
            props.onBlur?.(e)
        }

        if(type === "textarea") {
            return <StyledTextarea ref={setRef} 
                $size={size ?? "std"} $width={width} $textAlign={textAlign} $borderColor={borderColor}
                $maxHeight={props.maxHeight} $minHeight={props.minHeight} rows={props.rows}
                disabled={disabled} placeholder={placeholder} value={text} 
                onChange={onChange} onBlur={onBlur} onKeyDown={onKeydown} 
                onCompositionStart={onCompositionstart} onCompositionEnd={onCompositionend}/>
        }else{
            return <StyledInput ref={setRef} 
                $size={size ?? "std"} type={type ?? "text"} $width={width} $textAlign={textAlign} $borderColor={borderColor}
                disabled={disabled} placeholder={placeholder} value={text} 
                onChange={onChange} onBlur={onBlur} onKeyDown={onKeydown} 
                onCompositionStart={onCompositionstart} onCompositionEnd={onCompositionend}/>
        }
    }
})

export const DateInput = React.memo(function (props: DateInputProps) {
    const { value, onUpdateValue, placeholder = "YYYY/MM/DD HH:mm:SS", borderColor, errorBorderColor = "danger", ...attrs } = props

    const fmt = (n: number) => n >= 10 ? n : `0${n}`

    const [text, setText] = useState(() => value !== undefined ? `${value.getFullYear()}/${value.getMonth() + 1}/${value.getDate()} ${fmt(value.getHours())}:${fmt(value.getMinutes())}:${fmt(value.getSeconds())}` : "")

    const [error, setError] = useState(false)

    useWatch(() => setText(value !== undefined ? `${value.getFullYear()}/${value.getMonth() + 1}/${value.getDate()} ${fmt(value.getHours())}:${fmt(value.getMinutes())}:${fmt(value.getSeconds())}` : ""), [value])

    const submitValue = () => {
        const trimed = text.trim()
        if("today".startsWith(trimed.toLowerCase())) {
            props.onUpdateValue?.(new Date())
            if(error) setError(false)
        }else if(trimed) {
            const d = new Date(trimed)
            if(isNaN(d.getTime())) {
                if(!error) setError(true)
            }else{
                props.onUpdateValue?.(d)
                if(error) setError(false)
            }
        }else{
            props.onUpdateValue?.(undefined)
        }
    }

    return <Input {...attrs} placeholder={placeholder} borderColor={error ? errorBorderColor : borderColor} value={text} onUpdateValue={setText} onBlur={submitValue} onEnter={submitValue} updateOnInput/>
})

interface StyledCSSProps {
    $size: "small" | "std" | "large"
    $width?: string
    $textAlign?: "left" | "center" | "right"
    $borderColor?: ThemeColors | FunctionalColors
}

interface TextareaProps {
    $maxHeight?: string
    $minHeight?: string
}

const StyledCSS = css<StyledCSSProps>`
    text-rendering: auto;
    letter-spacing: normal;
    word-spacing: normal;
    text-transform: none;
    text-indent: 0;
    text-shadow: none;
    justify-content: flex-start;
    -webkit-rtl-ordering: logical;
    box-sizing: border-box;
    outline: none;
    vertical-align: middle;
    align-items: center;
    display: inline-flex;
    line-height: 1.2;
    border-radius: ${RADIUS_SIZES["std"]};
    border: 1px solid ${p => LIGHT_MODE_COLORS[p.$borderColor ?? "border"]};
    color: ${LIGHT_MODE_COLORS["text"]};
    background-color: ${LIGHT_MODE_COLORS["block"]};
    font-size: ${p => FONT_SIZES[p.$size]};
    height: ${p => ELEMENT_HEIGHTS[p.$size]};
    ${p => p.$textAlign && css`text-align: ${p.$textAlign};`}
    ${p => p.$width && css` width: ${() => p.$width}; `}
    &[disabled] {
        color: ${mix(0.2, LIGHT_MODE_COLORS["text"], "#ffffff")};
        background-color: m${mix(0.96, LIGHT_MODE_COLORS["block"], "#000000")};
    }
    @media (prefers-color-scheme: dark) {
        color: ${DARK_MODE_COLORS["text"]};
        background-color: ${DARK_MODE_COLORS["block"]};
        border-color: ${p => DARK_MODE_COLORS[p.$borderColor ?? "border"]};
        &[disabled] {
            color: ${mix(0.2, DARK_MODE_COLORS["text"], "#ffffff")};
        background-color: m${mix(0.96, DARK_MODE_COLORS["block"], "#000000")};
        }
    }
`

const StyledInput = styled.input<StyledCSSProps>`
    ${StyledCSS};
    padding: 0 calc(0.85em - 1px);
    &::-webkit-outer-spin-button, 
    &::-webkit-inner-spin-button {
        -webkit-appearance: none;
    }
`

const StyledTextarea = styled.textarea<StyledCSSProps & TextareaProps>`
    ${StyledCSS};
    padding: calc(0.6em - 1px) calc(0.85em - 1px);
    resize: vertical;
    &:not([rows]) {
        max-height: ${p => p.$maxHeight ?? "40em"};
        min-height: ${p => p.$minHeight ?? "6em"};
    }
    &[rows] {
        height: initial;
        ${p => p.$maxHeight && css`max-height: ${p.$maxHeight};`}
        ${p => p.$minHeight && css`min-height: ${p.$minHeight};`}
    }
`
