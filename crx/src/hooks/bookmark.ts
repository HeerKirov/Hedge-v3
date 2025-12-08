import { useCallback, useEffect, useState } from "react"
import { TabState } from "./tabs"
import { strings } from "@/utils/primitives"

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

export interface BookmarkUpdateInfo {
    title?: string
    parentId?: string
    index?: number
}

export function useBookmarkOfTab(tabState: TabState) {
    const [bookmarkState, setBookmarkState] = useState<BookmarkState | null>(null)

    const updateBookmarkState = useCallback(async (updateInfo: BookmarkUpdateInfo) => {
        if(bookmarkState) {
            //修改现有的书签
            if(updateInfo.title !== undefined) {
                await chrome.bookmarks.update(bookmarkState.id, {title: updateInfo.title})
            }
            if(updateInfo.parentId !== undefined) {
                await chrome.bookmarks.move(bookmarkState.id, {parentId: updateInfo.parentId, index: updateInfo.index})
            }
        }else{
            //新建书签
            const tab = updateInfo.title === undefined && tabState.tabId !== undefined ? await chrome.tabs.get(tabState.tabId) : undefined
            const title = updateInfo.title ?? tab?.title ?? tabState.url
            await chrome.bookmarks.create({title , url: tabState.url, parentId: updateInfo.parentId, index: updateInfo.index})
        }
    }, [bookmarkState, tabState])

    const removeBookmark = useCallback(async () => {
        if(bookmarkState?.id) {
            await chrome.bookmarks.remove(bookmarkState.id)
        }
    }, [bookmarkState])
    
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

    return {bookmarkState, updateBookmarkState, removeBookmark}
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

export interface AnalysedBookmark {
    title: string
    otherTitles: string[]
    labels: string[]
    comments: string[]
    lastUpdated: {date: Date | null, post: string | null} | null
}

export function useAnalyticalBookmark(bookmarkState: BookmarkState | null) {
    const [bookmarkInfo, setBookmarkInfo] = useState<AnalysedBookmark | null>(bookmarkState?.title ? analyseBookmarkTitle(bookmarkState.title) : null)

    useEffect(() => {
        setBookmarkInfo(bookmarkState?.title ? analyseBookmarkTitle(bookmarkState.title) : null)
    }, [bookmarkState])

    return {bookmarkInfo}
}

function analyseBookmarkTitle(text: string): AnalysedBookmark {
    const result: AnalysedBookmark = {
        title: "",
        otherTitles: [],
        labels: [],
        comments: [],
        lastUpdated: null
    }

    if (!text) return result

    const len = text.length
    let pos = 0
    let titleFinished = false
    const lastUpdatedSegments: string[] = []

    const appendToTitle = (text: string) => {
        if (titleFinished) return
        result.title += text
    }

    const extractBalanced = (start: number, open: string, close: string): {end: number, ok: boolean} => {
        let depth = 1
        let i = start + 1
        while (i < len && depth > 0) {
            const ch = text[i]
            if (ch === open) depth++
            else if (ch === close) depth--
            i++
        }
        return {end: i, ok: depth === 0}
    }

    const isShortParenTitle = (content: string) => {
        const words = content.trim().split(/\s+/)
        return words.length > 0 && words.length <= 2 && words.every(word => /^[a-zA-Z]+$/.test(word))
    }

    while (pos < len) {
        const [start, startChar] = strings.indexOfAny(text, ["<", "[", "(", "{"], pos)
        if (start === -1) {
            appendToTitle(text.substring(pos))
            break
        }

        if (start > pos) appendToTitle(text.substring(pos, start))

        if (startChar === "<") {
            const { end, ok } = extractBalanced(start, "<", ">")
            if (!ok) { appendToTitle(text.substring(start)); break }
            titleFinished = true
            result.otherTitles.push(text.substring(start + 1, end - 1))
            pos = end
        } else if (startChar === "[") {
            const { end, ok } = extractBalanced(start, "[", "]")
            if (!ok) { appendToTitle(text.substring(start)); break }
            titleFinished = true
            result.labels.push(text.substring(start + 1, end - 1))
            pos = end
        } else if (startChar === "{") {
            const { end, ok } = extractBalanced(start, "{", "}")
            if (!ok) { appendToTitle(text.substring(start)); break }
            titleFinished = true
            const content = text.substring(start + 1, end - 1)
            lastUpdatedSegments.push(...content.split("|").map(part => part.trim()).filter(part => part.length > 0))
            pos = end
        } else {
            const { end, ok } = extractBalanced(start, "(", ")")
            if (!ok) { appendToTitle(text.substring(start)); break }
            const content = text.substring(start + 1, end - 1)
            const hasNested = content.includes("(")

            if (!titleFinished && isShortParenTitle(content) && !hasNested) {
                appendToTitle(text.substring(start, end))
                pos = end
                continue
            }

            titleFinished = true
            if (hasNested) {
                result.otherTitles.push(content)
            } else {
                result.comments.push(content)
            }
            pos = end
        }
    }

    result.title = result.title.trim()

    // 提取lastUpdated（花括号{}包裹的内容）
    // 格式：{updated at post/yyyy-mm-dd}，其中前缀可能省略或错误，post或date部分分别可能省略
    // 可能有多个，优先选择前缀为"updated at"的
    let selected: {post: string | null, dateStr: string | null} | null = null

    for (const candidate of lastUpdatedSegments) {
        const hasPrefix = candidate.toLowerCase().startsWith("updated at")
        const match = candidate.match(/(?<prefix>.* )?(?<post>[^/\s]+)?\/?(?<dateStr>\d{4}-\d{1,2}-\d{1,2})?/)
        if (!match || !match.groups) continue
        let hit
        if(match.groups["post"].match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
            hit = {post: null, dateStr: match.groups["post"] ?? null}
        }else{
            hit = {post: match.groups["post"] ?? null, dateStr: match.groups["dateStr"] ?? null}
        }
        if(hasPrefix || !selected) {
            selected = hit
            if (hasPrefix) break
        }
    }

    if (selected) {
        const date = selected.dateStr ? new Date(selected.dateStr + "T00:00:00") : null
        result.lastUpdated = {date, post: selected.post}
    }

    return result
}