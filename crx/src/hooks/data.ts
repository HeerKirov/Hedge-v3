import { useEffect, useState, RefObject, useCallback, useRef } from "react"
import { storages } from "@/functions/storage"
import { BookmarkTreeNode } from "./bookmark"

export function useBookmarkPopupState(currentId: string | undefined, indexedRef: RefObject<Record<string, BookmarkTreeNode | undefined>>) {
    const stateRef = useRef<Record<string, "OPEN" | "CLOSED" | "TEMP_OPEN">>({})
    const [collapseState, setCollapseStateInternal] = useState<Record<string, "OPEN" | "CLOSED" | "TEMP_OPEN">>({})

    const setCollapseState = useCallback((id: string, value: boolean) => {
        stateRef.current[id] = value ? "OPEN" : "CLOSED"
        setCollapseStateInternal(v => ({...v, [id]: value ? "OPEN" : "CLOSED"}))
        storages.ui.bookmarkCollapseState(Object.entries(stateRef.current).filter(([_, value]) => value === "OPEN").map(([key]) => key))
    }, [])

    useEffect(() => {
        const tempOpenIds: string[] = []
        if(currentId) {
            let node = indexedRef.current[currentId]
            while(node) {
                tempOpenIds.unshift(node.id)
                if(node.parentId) {
                    node = indexedRef.current[node.parentId]
                }else{
                    break
                }
            }
        }
        storages.ui.bookmarkCollapseState().then(storage => {
            stateRef.current = Object.fromEntries([...storage.filter(id => id in indexedRef.current).map(id => [id, "OPEN"] as const), ...tempOpenIds.map(id => [id, "TEMP_OPEN"] as const)])
            setCollapseStateInternal(stateRef.current)
        }).catch(error => {
            console.error("error loading bookmark collapse state", error)
        })
    }, [])

    return {collapseState, setCollapseState}
}