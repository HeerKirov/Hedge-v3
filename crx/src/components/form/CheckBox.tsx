import { ReactNode } from "react"
import { styled } from "styled-components"

interface CheckBoxProps {
    checked?: boolean
    onUpdateChecked?(checked: boolean): void
    disabled?: boolean
    children?: ReactNode
}

interface RadioProps {
    checked?: boolean
    onUpdateChecked?(): void
    disabled?: boolean
    children?: ReactNode
}

interface RadioGroupProps<T> {
    items?: {label: string, value: T, disabled?: boolean}[]
    value?: T
    onUpdateValue?(value: T): void
}

export function CheckBox(props: CheckBoxProps) {
    const { checked, onUpdateChecked, disabled, children } = props

    return <StyledCheckBoxLabel $disabled={disabled ?? false}>
        <input type="checkbox" disabled={disabled} checked={checked} onChange={e => onUpdateChecked?.(e.target.checked)}/>
        {children}
    </StyledCheckBoxLabel>
}

export function Radio(props: RadioProps) {
    return <StyledCheckBoxLabel $disabled={props.disabled ?? false}>
        <input type="radio" disabled={props.disabled} checked={props.checked} onChange={() => props.onUpdateChecked?.()}/>
        {props.children}
    </StyledCheckBoxLabel>
}

export function RadioGroup<T>(props: RadioGroupProps<T>) {
    return <>
        {props.items?.map(item => <Radio key={`${item.value}`} checked={item.value === props.value} disabled={item.disabled} onUpdateChecked={() => props.onUpdateValue?.(item.value)}>{item.label}</Radio>)}
    </>
}

const StyledCheckBoxLabel = styled.label<{ $disabled: boolean }>`
    cursor: ${p => p.$disabled ? "default" : "pointer"};
    display: inline-block;
    position: relative;
    input[type=checkbox], input[type=radio] {
        cursor: ${p => p.$disabled ? "default" : "pointer"};
        vertical-align: middle;
        margin: 0 0.25em 0.05em 0;
    }
`
