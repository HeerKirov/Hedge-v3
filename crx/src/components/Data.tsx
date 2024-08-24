import { ReactNode, useCallback, useRef } from "react"

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
