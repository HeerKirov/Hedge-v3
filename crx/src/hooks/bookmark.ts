import { useEffect, useState } from "react"
import { TabState } from "./tabs"

export interface BookmarkState {
    id: string
    title: string
    url: string
    parent: BookmarkParent | undefined
    dateAdded: Date | undefined
    dateLastUsed: Date | undefined
}

export interface BookmarkParent {
    id: string
    title: string
}

export function useBookmarkOfTab(tabState: TabState) {
    const [bookmarkState, setBookmarkState] = useState<BookmarkState | null>(null)
    
    useEffect(() => {
        if(tabState.url !== undefined) {
            getBookmarkStateOfURL(tabState.url).then(bookmarkState => {
                setBookmarkState(bookmarkState)
            })
        }else{
            setBookmarkState(null)
        }
    }, [tabState])

    useEffect(() => {
        const createdEventHandler = async (_: string, node: chrome.bookmarks.BookmarkTreeNode) => {
            if(node.url === tabState.url) {
                //仅当新建的书签URL为当前页面URL时，需要刷新状态
                const parent = node.parentId !== undefined ? await getBookmarkById(node.parentId) : undefined
                const bookmarkState = bookmarkNodeToState(node, parent)
                setBookmarkState(bookmarkState)
            }
        }

        const changedEventHandler = async (bookmarkId: string, changeInfo: chrome.bookmarks.UpdateChanges) => {
            if(bookmarkId === bookmarkState?.id) {
                //如果书签ID就是当前书签ID，则需要刷新状态
                if(changeInfo.url !== tabState.url) {
                    //如果URL发生变化，已不再为当前页面的URL，则刷新状态至NULL
                    setBookmarkState(null)
                }else if(changeInfo.title !== bookmarkState.title) {
                    //如果title发生变化，则更新状态
                    const newBookmarkState = {...bookmarkState, title: changeInfo.title ?? ""}
                    setBookmarkState(newBookmarkState)
                }
            }else if(changeInfo.url && changeInfo.url === tabState.url) {
                //如果书签ID不是当前书签ID，但是URL为当前页面URL，则需要刷新状态
                const bookmarkState = await getBookmarkStateOfURL(tabState.url)
                setBookmarkState(bookmarkState)
            }
        }

        const movedEventHandler = async (bookmarkId: string, moveInfo: {parentId: string, index: number, oldParentId: string, oldIndex: number}) => {
            if(bookmarkId === bookmarkState?.id) {
                //如果书签ID就是当前书签ID，则需要更新父节点状态
                const newParent = moveInfo.parentId !== undefined ? await getBookmarkById(moveInfo.parentId) : undefined
                const newBookmarkState = {...bookmarkState, parent: newParent}
                setBookmarkState(newBookmarkState)
            }
        }

        const removedEventHandler = (bookmarkId: string) => {
            if(bookmarkId === bookmarkState?.id) {
                setBookmarkState(null)
            }
        }

        chrome.bookmarks.onCreated.addListener(createdEventHandler)
        chrome.bookmarks.onChanged.addListener(changedEventHandler)
        chrome.bookmarks.onMoved.addListener(movedEventHandler)
        chrome.bookmarks.onRemoved.addListener(removedEventHandler)
        
        return () => {
            chrome.bookmarks.onCreated.removeListener(createdEventHandler)
            chrome.bookmarks.onChanged.removeListener(changedEventHandler)
            chrome.bookmarks.onMoved.removeListener(movedEventHandler)
            chrome.bookmarks.onRemoved.removeListener(removedEventHandler)
        }
    }, [bookmarkState, tabState])

    return bookmarkState
}

async function getBookmarkById(id: string): Promise<chrome.bookmarks.BookmarkTreeNode | undefined> {
    const bookmarks = await chrome.bookmarks.get(id)
    return bookmarks.length > 0 ? bookmarks[0] : undefined
}

async function getBookmarkStateOfURL(url: string): Promise<BookmarkState | null> {
    const bookmarks = await chrome.bookmarks.search({url})
    if(bookmarks.length > 0) {
        const bookmark = bookmarks[0]
        const parent = bookmark.parentId !== undefined ? await getBookmarkById(bookmark.parentId) : undefined
        return bookmarkNodeToState(bookmark, parent)
    }
    return null
}

function bookmarkNodeToState(node: chrome.bookmarks.BookmarkTreeNode, parent: chrome.bookmarks.BookmarkTreeNode | undefined): BookmarkState {
    return {
        id: node.id,
        title: node.title,
        url: node.url!,
        parent: parent !== undefined ? {id: parent.id, title: parent.title} : undefined,
        dateAdded: node.dateAdded ? new Date(node.dateAdded) : undefined,
        dateLastUsed: node.dateLastUsed ? new Date(node.dateLastUsed) : undefined
    }
}