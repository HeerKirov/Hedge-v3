import { ReactNode, useCallback, useRef, useState } from "react"
import { styled } from "styled-components"
import { Button, FormattedText, LayouttedDiv, Icon } from "@/components/universal"
import { Input } from "@/components/form"
import { SPACINGS } from "@/styles"

interface DraggableEditListProps<T> {
    items?: T[]
    onUpdateItems?(items: T[]): void
    editable?: boolean
    child?(item: T, index: number): ReactNode
    keyOf?(item: T, index: number): string | number
    children?: ReactNode
}

export function DraggableEditList<T>(props: DraggableEditListProps<T> & React.HTMLAttributes<HTMLDivElement>) {
    const { items, onUpdateItems, editable, child, keyOf, children, ...attrs } = props

    const rootRef = useRef<HTMLDivElement | null>(null)

    const dragItemRef = useRef<number | null>(null)

    const dragEventRef = useRef<((e: DragEvent) => void) | null>(null)

    const onDocumentDragover = useCallback((e: DragEvent) => e.preventDefault(), [])

    const onDocumentDrop = (e: DragEvent) => {
        e.stopPropagation()
        if(onUpdateItems && items && rootRef.current && dragItemRef.current !== null) {
            if(!rootRef.current.contains(e.target as HTMLElement)) {
                onUpdateItems([...items.slice(0, dragItemRef.current), ...items.slice(dragItemRef.current + 1)])
            }else{
                const targetIndex = [...rootRef.current.childNodes.values()].findIndex(n => n === e.target || n.contains(e.target as HTMLElement))
                if(targetIndex >= 0 && targetIndex !== dragItemRef.current) {
                    if(targetIndex > dragItemRef.current) {
                        onUpdateItems([...items.slice(0, dragItemRef.current), ...items.slice(dragItemRef.current + 1, targetIndex + 1), items[dragItemRef.current], ...items.slice(targetIndex + 1)])
                    }else{
                        onUpdateItems([...items.slice(0, targetIndex), items[dragItemRef.current], ...items.slice(targetIndex, dragItemRef.current), ...items.slice(dragItemRef.current + 1)])
                    }
                }
            }
        }
    }

    const onDragstart = items?.map((_, index) => () => {
        dragItemRef.current = index
        dragEventRef.current = onDocumentDrop
        document.addEventListener("drop", dragEventRef.current)
        document.addEventListener("dragover", onDocumentDragover)
    })

    const onDragend = useCallback(() => {
        dragItemRef.current = null
        if(dragEventRef.current !== null) {
            document.removeEventListener("drop", dragEventRef.current)
            dragEventRef.current = null
        }
        document.removeEventListener("dragover", onDocumentDragover)
    }, [onDocumentDragover])

    return <div ref={rootRef} {...attrs}>
        {items?.map((item, index) => <span key={keyOf?.(item, index) ?? index} draggable={editable} onDragStart={onDragstart![index]} onDragEnd={onDragend}>
            {child?.(item, index)}
        </span>)}
        {children}
    </div>
}

interface MultilineAddListProps {
    value?: string[]
    onUpdateValue?: (value: string[]) => void
}

export function MultilineAddList(props: MultilineAddListProps) {
    const add = (newValue: string) => {
        if(!props.value?.includes(newValue)) {
            props.onUpdateValue?.([...(props.value ?? []), newValue])
        }
    }

    const remove = (removeItem: string) => {
        if(props.value !== undefined && props.onUpdateValue) {
            const idx = props.value.indexOf(removeItem)
            if(idx >= 0) {
                props.onUpdateValue([...props.value.slice(0, idx), ...props.value.slice(idx + 1)])
            }
        }
    }

    return <LayouttedDiv border borderColor="border" radius="std">
        <ContentDiv>
            {props.value?.map(item => <ListItem key={item} value={item} onRemove={remove}/>)}
        </ContentDiv>
        <AddItem onAdd={add}/>
    </LayouttedDiv>
}

function AddItem(props: {onAdd?: (item: string) => void}) {
    const [text, setText] = useState<string>("")

    const submit = () => {
        if(text.trim()) {
            props.onAdd?.(text.trim())
            setText("")
        }
    }

    return <BottomDiv>
        <Input size="small" updateOnInput value={text} onUpdateValue={setText} onEnter={submit}/>
        <Button size="small" type="success" onClick={submit}><Icon icon="plus"/></Button>
    </BottomDiv>
}

function ListItem(props: {value: string, onRemove?: (value: string) => void}) {
    return <ListItemDiv border borderColor="border" radius="round">
        <FormattedText mr={1} ml={2}>{props.value}</FormattedText>
        <Button size="tiny" round onClick={() => props.onRemove?.(props.value)}><Icon icon="close"/></Button>
    </ListItemDiv>
}

const ContentDiv = styled.div`
    min-height: 24px;
    max-height: 200px;
    overflow: auto;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-content: flex-start;
    align-items: baseline;
    gap: ${SPACINGS[1]};
    padding: ${SPACINGS[1]} ${SPACINGS[1]} 0 ${SPACINGS[1]};
`

const BottomDiv = styled.div`
    display: flex;
    flex-wrap: nowrap;
    margin: ${SPACINGS[1]};
    gap: ${SPACINGS[1]};
    > input {
        width: 100%;
    }
    > button {
        flex: 0 0 auto;
    }
`

const ListItemDiv = styled(LayouttedDiv)`
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
`
