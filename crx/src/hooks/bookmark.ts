import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { server } from "@/functions/server"
import { getTabStateWithTitle, TabState } from "@/hooks/tabs"
import { ifArtworksPage } from "@/hooks/sites"
import { sendMessageToTab } from "@/services/messages"
import { createLocalCache } from "@/utils/local-cache"
import { dates, objects, strings } from "@/utils/primitives"
import { useWatch } from "@/utils/reactivity"

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
    parent?: BookmarkParent
    index?: number
}

export function useBookmarkOfTab(tabState: TabState) {
    const [bookmarkState, setBookmarkState] = useState<BookmarkState | null>(null)

    const updateBookmarkState = useCallback(async (updateInfo: BookmarkUpdateInfo) => {
        if(bookmarkState) {
            //修改现有的书签
            if(updateInfo.title !== undefined && updateInfo.title !== bookmarkState.title) {
                await chrome.bookmarks.update(bookmarkState.id, {title: updateInfo.title})
            }
            if(updateInfo.parent !== undefined && updateInfo.parent.id !== bookmarkState.parent?.id) {
                await chrome.bookmarks.move(bookmarkState.id, {parentId: updateInfo.parent.id, index: updateInfo.index})
            }
        }else{
            //新建书签
            const tab = updateInfo.title === undefined && tabState.tabId !== undefined ? await chrome.tabs.get(tabState.tabId) : undefined
            const title = updateInfo.title ?? tab?.title ?? tabState.url
            await chrome.bookmarks.create({title , url: tabState.url, parentId: updateInfo.parent?.id ?? undefined, index: updateInfo.index})
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

export interface BookmarkTreeNode {
    id: string
    title: string
    parentId: string | undefined
    children: BookmarkTreeNode[]
}

export function useBookmarkTree() {
    const indexedRef = useRef<Record<string, BookmarkTreeNode | undefined>>({})

    const [bookmarkTree, setBookmarkTree] = useState<BookmarkTreeNode[]>([])

    useEffect(() => {
        chrome.bookmarks.getTree().then(tree => {
            const filterFolders = (nodes: chrome.bookmarks.BookmarkTreeNode[]): BookmarkTreeNode[] => {
                const returns: BookmarkTreeNode[] = []
                const allNodes = nodes.length === 1 && nodes[0].id === '0' ? nodes[0].children ?? [] : nodes
                for(const node of allNodes) {
                    if(!node.url) {
                        const ret: BookmarkTreeNode = {
                            id: node.id,
                            title: node.title,
                            parentId: node.parentId,
                            children: node.children ? filterFolders(node.children) : []
                        }
                        indexedRef.current[ret.id] = ret
                        returns.push(ret)
                    }
                }
                return returns
            }

            setBookmarkTree(filterFolders(tree))
        })
    }, [])

    useEffect(() => {
        const getParents = (id: string): string[] => {
            const ret: string[] = [id]
            let node = indexedRef.current[id]
            while(node?.parentId !== undefined) {
                ret.push(node.parentId)
                node = indexedRef.current[node.parentId]
            }
            return ret
        }

        const getRefreshedByChanged = (nodes: BookmarkTreeNode[], changedIds: string[]): BookmarkTreeNode[] => {
            if(nodes.some(node => changedIds.includes(node.id))) {
                return nodes.map(node => {
                    if(changedIds.includes(node.id)) {
                        const newNode = {...node, children: [...getRefreshedByChanged(node.children, changedIds)]}
                        indexedRef.current[node.id] = newNode
                        return newNode
                    }else{
                        return node
                    }
                })
            }else{
                return nodes
            }
        }

        const createdEventHandler = async (_: string, node: chrome.bookmarks.BookmarkTreeNode) => {
            if(!node.url) {
                if(node.parentId !== undefined) {
                    const parentNode = indexedRef.current[node.parentId]
                    if(parentNode) {
                        const index = node.index ?? parentNode.children.length
                        parentNode.children = [...parentNode.children.slice(0, index), {id: node.id, title: node.title, parentId: node.parentId, children: []}, ...parentNode.children.slice(index)]
                        indexedRef.current[node.id] = {id: node.id, title: node.title, parentId: node.parentId, children: []}
                        setBookmarkTree(v => getRefreshedByChanged(v, getParents(parentNode.id)))
                    }
                }
            }
        }

        const changedEventHandler = async (bookmarkId: string, changeInfo: chrome.bookmarks.UpdateChanges) => {
            if(changeInfo.title !== undefined && changeInfo.url === undefined) {
                const node = indexedRef.current[bookmarkId]
                if(node) {
                    node.title = changeInfo.title
                    setBookmarkTree(v => getRefreshedByChanged(v, getParents(node.id)))
                }
            }
        }

        const childrenRecordedEventHandler = async (bookmarkId: string, reorderInfo: {childIds: string[]}) => {
            const node = indexedRef.current[bookmarkId]
            if(node && reorderInfo.childIds.some(id => indexedRef.current[id] !== undefined)) {
                node.children = reorderInfo.childIds.filter(id => indexedRef.current[id] !== undefined).map(id => indexedRef.current[id]!)
                setBookmarkTree(v => getRefreshedByChanged(v, getParents(node.id)))
            }
        }

        const movedEventHandler = async (bookmarkId: string, moveInfo: {parentId: string, index: number, oldParentId: string, oldIndex: number}) => {
            const node = indexedRef.current[bookmarkId]
            if(node) {
                const oldParentNode = indexedRef.current[moveInfo.oldParentId]
                if(oldParentNode) {
                    oldParentNode.children = oldParentNode.children.filter(child => child.id !== bookmarkId)
                }
                const newParentNode = indexedRef.current[moveInfo.parentId]
                if(newParentNode) {
                    const index = moveInfo.index
                    newParentNode.children = [...newParentNode.children.slice(0, index), node, ...newParentNode.children.slice(index)]
                }
                node.parentId = moveInfo.parentId
                setBookmarkTree(v => getRefreshedByChanged(v, [...oldParentNode ? getParents(oldParentNode.id) : [], ...newParentNode ? getParents(newParentNode.id) : []]))
            }
        }

        const removedEventHandler = (bookmarkId: string) => {
            const node = indexedRef.current[bookmarkId]
            if(node) {
                function removeIndexedNode(id: string) {
                    const node = indexedRef.current[id]
                    if(node) {
                        for(const child of node.children) {
                            removeIndexedNode(child.id)
                        }
                        indexedRef.current[id] = undefined
                    }
                }
                removeIndexedNode(bookmarkId)

                const parentNode = node.parentId !== undefined ? indexedRef.current[node.parentId] : undefined
                if(parentNode) {
                    parentNode.children = parentNode.children.filter(child => child.id !== bookmarkId)
                    setBookmarkTree(v => getRefreshedByChanged(v, getParents(parentNode.id)))
                }else{
                    setBookmarkTree(v => v.filter(node => node.id !== bookmarkId))
                }
            }
        }

        chrome.bookmarks.onCreated.addListener(createdEventHandler)
        chrome.bookmarks.onChanged.addListener(changedEventHandler)
        chrome.bookmarks.onMoved.addListener(movedEventHandler)
        chrome.bookmarks.onRemoved.addListener(removedEventHandler)
        chrome.bookmarks.onChildrenReordered.addListener(childrenRecordedEventHandler)
        return () => {
            chrome.bookmarks.onCreated.removeListener(createdEventHandler)
            chrome.bookmarks.onChanged.removeListener(changedEventHandler)
            chrome.bookmarks.onMoved.removeListener(movedEventHandler)
            chrome.bookmarks.onRemoved.removeListener(removedEventHandler)
            chrome.bookmarks.onChildrenReordered.removeListener(childrenRecordedEventHandler)
        }
    }, [])

    return {bookmarkTree, bookmarkIndexedRef: indexedRef}
}

export interface AnalysedBookmark {
    title: string
    otherTitles: string[]
    labels: string[]
    comments: string[]
    lastUpdated: {date: Date | null, post: string | null} | null
}

export function useAnalyticalBookmark(bookmarkState: BookmarkState | null, updateBookmarkState: (updateInfo: BookmarkUpdateInfo) => Promise<void>) {
    const [bookmarkInfo, setBookmarkInfo] = useState<AnalysedBookmark | null>(bookmarkState?.title ? analyseBookmarkTitle(bookmarkState.title) : null)

    const updateBookmarkInfo = useCallback(async (info: Partial<AnalysedBookmark>) => {
        if(bookmarkInfo !== null) {
            let anyChanged = false
            for(const [key, value] of Object.entries(info)) {
                if(value !== undefined && !objects.deepEquals(value, bookmarkInfo[key as keyof AnalysedBookmark])) {
                    anyChanged = true
                    break
                }
            }
            if(anyChanged) {
                const newTitle = generateBookmarkTitle({...bookmarkInfo, ...info})
                await updateBookmarkState({title: newTitle})
            }
        }
    }, [bookmarkInfo, updateBookmarkState])

    useWatch(() => {
        setBookmarkInfo(bookmarkState?.title ? analyseBookmarkTitle(bookmarkState.title) : null)
    }, [bookmarkState?.title ?? ""])

    return {bookmarkInfo, updateBookmarkInfo}
}

export function useBookmarkCreator(recentFolders: BookmarkParent[]) {
    const [info, setInfo] = useState<AnalysedBookmark>(() => ({
        title: "",
        otherTitles: [],
        labels: [],
        comments: [],
        lastUpdated: null
    }))

    const [state, setState] = useState<BookmarkState>({id: "", title: "", url: "", parent: undefined, dateAdded: undefined, dateLastUsed: undefined})

    const [url, setUrl] = useState<string>()

    const updateInfo = useCallback((info: Partial<AnalysedBookmark>) => setInfo(prev => ({...prev, ...info})), [])

    const updateState = useCallback((info: BookmarkUpdateInfo) => setState(prev => ({...prev, ...info})), [])

    const save = useCallback(async () => {
        if(url) {
            const newTitle = generateBookmarkTitle(info)
            chrome.bookmarks.create({title: newTitle, url: url, parentId: state.parent?.id ?? undefined})
        }else{
            console.warn("[useBookmarkCreator] URL is empty.")
        }
    }, [info, url, state.parent?.id ?? ""])

    useEffect(() => {
        getTabStateWithTitle().then(async tabState => {
            setUrl(tabState.url)
            if(ifArtworksPage(tabState.url) && tabState.tabId !== undefined) {
                const pageInfo = await sendMessageToTab(tabState.tabId, "REPORT_ARTWORKS_INFO", undefined)
                if(pageInfo.ok && pageInfo.value.agent !== null) {
                    const { agent } = pageInfo.value
                    setInfo(prev => ({
                        ...prev, 
                        title: agent.name ?? agent.code,
                        otherTitles: agent.otherName ? [agent.otherName, ...prev.otherTitles] : prev.otherTitles
                    }))
                }else{
                    setInfo(prev => ({...prev, title: tabState.title ?? ""}))
                }
            }else{
                setInfo(prev => ({...prev, title: tabState.title ?? ""}))
            }
        })
    }, [])

    useWatch(() => {
        if(recentFolders.length > 0 && state.parent === undefined) {
            setState(prev => ({...prev, parent: recentFolders[0]}))
        }
    }, [recentFolders, state.parent?.id ?? ""], {immediate: true})


    return {info, state, updateInfo, updateState, save}
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
        const date = selected.dateStr ? new Date(`${selected.dateStr} 00:00:00`) : null
        result.lastUpdated = {date, post: selected.post}
    }

    return result
}

function generateBookmarkTitle(info: AnalysedBookmark): string {
    let text = info.title

    if(info.otherTitles.length > 0 || info.labels.length > 0 || info.comments.length > 0 || info.lastUpdated?.post || info.lastUpdated?.date) {
        text += " "
    }

    if(info.otherTitles.length > 0) {
        text += "<" + info.otherTitles.join("><") + ">"
    }
    if(info.labels.length > 0) {
        text += "[" + info.labels.join("][") + "]"
    }
    if(info.comments.length > 0) {
        text += "(" + info.comments.join(")(") + ")"
    }
    if(info.lastUpdated?.post || info.lastUpdated?.date) {
        const dateStr = info.lastUpdated.date ? dates.toFormatDate(info.lastUpdated.date) : ""
        const str = info.lastUpdated.post && dateStr ? `${info.lastUpdated.post}/${dateStr}` : (dateStr || info.lastUpdated.post || "")
        text += `{updated at ${str}}`
    }

    return text
}

export function useAutoUpdatePost(tabState: TabState) {
    const [isArtworksPage, setIsArtworksPage] = useState(false)

    const getAutoUpdateValue = useCallback(async (): Promise<{post: string, date: Date, notFirstPage: boolean} | null> => {
        if(tabState.tabId !== undefined) {
            const pageInfo = await sendMessageToTab(tabState.tabId, "REPORT_ARTWORKS_INFO", undefined)
            if(pageInfo.ok && pageInfo.value.latestPost !== null) {
                const { latestPost, firstPage } = pageInfo.value
                const date = await getTodayByServerOffset()
                return {post: latestPost, date, notFirstPage: !firstPage}
            }
        }
        return null
    }, [tabState.tabId])

    useWatch(() => {
        setIsArtworksPage(ifArtworksPage(tabState.url))
    }, [tabState.url], {immediate: true})

    return {isArtworksPage, getAutoUpdateValue}
}

async function getTodayByServerOffset(): Promise<Date> {
    const serverOption = await server.setting.server()
    if(serverOption.ok && serverOption.data.timeOffsetHour) {
        const now = new Date()
        // 当前本地今日0点
        const todayZero = new Date(now.setHours(0, 0, 0, 0))
        // 计算当前本地小时数（0-23）
        const currentHour = new Date().getHours()
        if (serverOption.data.timeOffsetHour > 0) {
            // 当前小时数小于offset, 则视为“昨天”
            if (currentHour < serverOption.data.timeOffsetHour) {
                return new Date(todayZero.getTime() - 24 * 60 * 60 * 1000)
            } else {
                return todayZero
            }
        } else if (serverOption.data.timeOffsetHour < 0) {
            // offset为负：即后推判为下一天； 若当前小时>= 24+offset, 视为“明天”
            if (currentHour >= 24 + serverOption.data.timeOffsetHour) {
                return new Date(todayZero.getTime() + 24 * 60 * 60 * 1000)
            } else {
                return todayZero
            }
        } else {
            // offset为0
            return todayZero
        }
    }
    return new Date(new Date().setHours(0, 0, 0, 0))
}

export function useRelatedBookmarks(selfId: string, title: string) {
    const relatedBookmarksCache = useMemo(() => createLocalCache<string, RelatedBookmark[]>("related-bookmarks", { maxSize: 10 }), [])

    const [relatedBookmarks, setRelatedBookmarks] = useState<RelatedBookmark[]>([])

    const refresh = useCallback(async () => {
        const bookmarks = await chrome.bookmarks.search(title)
        const analysedBookmarks = bookmarks
            .filter(bookmark => bookmark.url && bookmark.id !== selfId)
            .map(bookmark => ({analytical: analyseBookmarkTitle(bookmark.title), url: bookmark.url!, id: bookmark.id}))
        relatedBookmarksCache.set(selfId, analysedBookmarks)
        setRelatedBookmarks(analysedBookmarks)
    }, [selfId, title])

    useEffect(() => {
        const cached = relatedBookmarksCache.get(selfId)
        if (cached) {
            // 命中缓存：缓存管理器会自动更新 LRU 位置
            setRelatedBookmarks(cached)
        }else{
            // 缓存未命中：从 API 获取
            refresh()
        }
    }, [refresh])

    // 监听 bookmark 事件，清理缓存并刷新当前数据
    useEffect(() => {
        const changedEventHandler = () => {
            relatedBookmarksCache.clear()
            refresh()
        }

        chrome.bookmarks.onCreated.addListener(changedEventHandler)
        chrome.bookmarks.onChanged.addListener(changedEventHandler)
        chrome.bookmarks.onRemoved.addListener(changedEventHandler)

        return () => {
            chrome.bookmarks.onCreated.removeListener(changedEventHandler)
            chrome.bookmarks.onChanged.removeListener(changedEventHandler)
            chrome.bookmarks.onRemoved.removeListener(changedEventHandler)
        }
    }, [refresh])

    return relatedBookmarks
}

interface RelatedBookmark {analytical: AnalysedBookmark, url: string, id: string}
