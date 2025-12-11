import { memo, useCallback, useMemo, useState } from "react"
import { css, styled } from "styled-components"
import { FormattedText, Icon } from "@/components/universal"
import { DARK_MODE_COLORS, LIGHT_MODE_COLORS, SPACINGS } from "@/styles"
import { DateInput, Input } from "./Input"
import { DraggableEditList } from "./Data"
import { dates } from "@/utils/primitives"

interface DynamicInputListProps {
    values?: string[]
    onUpdateValues?(values: string[]): void
    mode?: "start" | "stretch"
    placeholder?: string
    size?: "small" | "std" | "large"
    theme?: "std" | "underline"
    disabled?: boolean
}

interface StarlightProps {
    score?: number
    onUpdateScore?(value: number | undefined): void
    editable?: boolean
    colorMode?: "std" | "inherit" | "text"
}

interface KeywordListProps {
    keywords?: string[]
    onUpdateKeywords?(keywords: string[]): void
    editable?: boolean
    placeholder?: string
    inputTheme?: "std" | "underline"
    display?: "inline" | "inline-block" | "block"
}

interface CollectDatePickerProps {
    value?: Date
    onUpdateValue?(value: Date | undefined): void
}

export const DynamicInputList = memo(function DynamicInputList(props: DynamicInputListProps) {
    const [newText, setNewText] = useState<string>("")

    const update = useCallback((index: number, value: string) => {
        const newValue = value.trim()
        if(props.onUpdateValues && (!props.values?.length || props.values.indexOf(newValue) === -1)) {
            if(newValue) {
                props.onUpdateValues(props.values?.length ? [...props.values.slice(0, index), newValue, ...props.values.slice(index + 1)] : [newValue])
            }else if(props.values?.length) {
                props.onUpdateValues([...props.values.slice(0, index), ...props.values.slice(index + 1)])
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.values, props.onUpdateValues])

    const add = () => {
        const newValue = newText.trim()
        if(props.onUpdateValues && newValue && (!props.values?.length || props.values.indexOf(newValue) === -1)) {
            props.onUpdateValues(props.values?.length ? [...props.values, newValue] : [newValue])
            setNewText("")
        }
    }

    const inputs = useMemo(() => props.values?.map((v, i) => <Input key={i} size={props.size} theme={props.theme} disabled={props.disabled} value={v} onUpdateValue={v => update(i, v)}/>), [props.size, props.values, props.disabled, update])

    return <DynamicInputListDiv $mode={props.mode ?? "stretch"} $count={props.values?.length ?? 0}>
        {inputs}
        <Input size={props.size} theme={props.theme} disabled={props.disabled} placeholder={props.placeholder} value={newText} onUpdateValue={setNewText} updateOnInput onEnter={add} onBlur={add}/>
    </DynamicInputListDiv>
})

export const Starlight = memo(function Starlight(props: StarlightProps) {
    const click = (value: number) => {
        if(props.editable && props.onUpdateScore) props.onUpdateScore(props.score !== value ? value : undefined)
    }

    const colorMode = props.colorMode === "std" || props.colorMode === undefined ? props.score : props.colorMode === "inherit" ? undefined : 0

    return <StarlightSpan $editable={props.editable ?? false} $value={colorMode}>
        {Array(props.score ?? 0).fill(0).map((_, i) => <Icon key={i} icon="star" onClick={() => click(i + 1)}/>)}
        {Array(5 - (props.score ?? 0)).fill(0).map((_, i) => <Icon key={i + (props.score ?? 0)} icon={["far", "star"]} onClick={() => click(i + 1 + (props.score ?? 0))}/>)}
        <b>{props.score}</b>
    </StarlightSpan>
})

export const KeywordList = memo(function KeywordList(props: KeywordListProps) {
    const [addText, setAddText] = useState("")

    const onEnter = () => {
        const text = addText.trim()
        if(text) {
            props.onUpdateKeywords?.(props.keywords ? [...props.keywords, text] : [text])
            setAddText("")
        }
    }

    return <KeywordInputDiv $display={props.display} editable={props.editable} items={props.keywords} onUpdateItems={props.onUpdateKeywords} child={(keyword: string) => (<KeywordSpan><span>[</span>{keyword}<span>]</span></KeywordSpan>)}>
        {props.editable && <Input size="small" theme={props.inputTheme} placeholder={props.placeholder} value={addText} onUpdateValue={setAddText} onEnter={onEnter} updateOnInput/>}
    </KeywordInputDiv>
})

export const CollectDatePicker = memo(function CollectDatePicker(props: CollectDatePickerProps) {
    const [editMode, setEditMode] = useState(false)

    const updateValue = (value: Date | undefined) => {
        if(value?.getTime() !== props.value?.getTime()) {
            props.onUpdateValue?.(value)
        }
        setEditMode(false)
    }

    const edit = useCallback(() => setEditMode(true), [])

    return editMode ? <FormattedText>
        <DateInput mode="date" theme="underline" size="small" autoFocus value={props.value} onUpdateValue={updateValue}/>
    </FormattedText> : <FormattedText userSelect="text" onClick={edit}>
        {props.value !== undefined ? dates.toFormatDate(props.value) : "未记录上次收集时间"}
    </FormattedText>
})

const STARLIGHT_COLOR_PICKS = ["text", "secondary", "info", "success", "warning", "danger"] as const

const DynamicInputListDiv = styled.div<{ $mode: "stretch" | "start", $count: number }>`
    display: flex;
    width: 100%;
    flex-wrap: nowrap;
    gap: ${SPACINGS[1]};
    ${p => p.$mode === "start" ? css`
        justify-content: flex-start;
        > input:not(:last-child) {
            width: 25%;
            flex: 0 1 auto;
        }
        > input:last-child {
            width: 6.5em;
            flex: 0 2 auto;
            transition: width 0.2s;
            &:focus {
                width: 10em;
            }
        }
    ` : css`
        justify-content: space-between;
        > input:not(:last-child) {
            width: ${100 / (p.$count * 1 + 0.5)}%;
            flex-grow: 2;
            flex-shrink: 1;
        }
        > input:last-child {
            width: ${100 / (p.$count * 3 + 1.5)}%;
            flex-grow: 1;
            flex-shrink: 2;
            transition: width 0.2s;
            &:focus {
                width: ${100 / (p.$count * 1 + 0.5)}%;
            }
        }
    `}
`

const StarlightSpan = styled.span<{ $editable: boolean, $value: number | undefined }>`
    padding: 0 ${SPACINGS[1]};
    ${p => p.$value && p.$value <= 5 && css` color: ${LIGHT_MODE_COLORS[STARLIGHT_COLOR_PICKS[p.$value]]}; ` };
    @media (prefers-color-scheme: dark) {
        ${p => p.$value && p.$value <= 5 && css` color: ${DARK_MODE_COLORS[STARLIGHT_COLOR_PICKS[p.$value]]}; ` }
    }
    > svg {
        ${p => p.$editable && css` cursor: pointer; ` }
    }
    > b {
        display: inline-block;
        width: 1em;
        text-align: center;
        user-select: none;
        padding-left: ${SPACINGS[1]};
    }
`

const KeywordInputDiv = styled(DraggableEditList)<{ $display?: "inline" | "inline-block" | "block" }>`
    overflow-y: auto;
    ${p => p.$display && css`display: ${p.$display};`};
    &::-webkit-scrollbar {
        display: none;
    }

    > input {
        margin-left: ${SPACINGS[1]};
        width: 6.5em;
        transition: width 0.2s;
        &:focus {
            width: 10em;
        }
    }
`

const KeywordSpan = styled.span`
    > span {
        user-select: none;
        color: ${LIGHT_MODE_COLORS["secondary"]};
        @media (prefers-color-scheme: dark) { 
            color: ${DARK_MODE_COLORS["secondary"]};
        }
    }
`
