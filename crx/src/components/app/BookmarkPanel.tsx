import { createContext, memo, RefObject, useCallback, useContext, useMemo, useRef, useState } from "react"
import styled, { css } from "styled-components"
import { Button, Icon, LayouttedDiv } from "@/components/universal"
import { DateInput, DynamicInputList, Input, KeywordList } from "@/components/form"
import { TabState } from "@/hooks/tabs"
import { useBookmarkPopupState, useBookmarkRecentFolders } from "@/hooks/data"
import { Setting } from "@/functions/setting"
import { AnalysedBookmark, BookmarkParent, BookmarkState, BookmarkTreeNode, BookmarkUpdateInfo, useAnalyticalBookmark, useBookmarkCreator, useBookmarkOfTab, useBookmarkTree } from "@/hooks/bookmark"
import { useOutsideClick } from "@/utils/sensors"
import { DARK_MODE_COLORS, LIGHT_MODE_COLORS, RADIUS_SIZES, SPACINGS } from "@/styles"

export const BookmarkPanel = memo(function BookmarkPanel(props: {tabState: TabState, setting: Setting["extension"]["bookmarkManager"]}) {
    const { bookmarkState, updateBookmarkState } = useBookmarkOfTab(props.tabState)

    const { bookmarkInfo, updateBookmarkInfo } = useAnalyticalBookmark(bookmarkState, updateBookmarkState)

    const { bookmarkTree, bookmarkIndexedRef } = useBookmarkTree()

    const { recentFolders, pushRecentFolder } = useBookmarkRecentFolders()

    const bookmarkTreeContext = useMemo(() => ({tree: bookmarkTree, indexedRef: bookmarkIndexedRef}), [bookmarkTree])

    const bookmarkRecentFoldersContext = useMemo(() => ({recentFolders, pushRecentFolder}), [recentFolders, pushRecentFolder])

    if(!isLegalDomain(props.tabState.url, props.setting.includeDomains, props.setting.excludeDomains)) {
        return null
    }

    return <BookmarkTreeContext.Provider value={bookmarkTreeContext}>
        <BookmarkRecentFoldersContext.Provider value={bookmarkRecentFoldersContext}>
            <RootDiv>
                {bookmarkState === null || bookmarkInfo === null || bookmarkTree === null
                    ? <Empty/> 
                    : <Detail state={bookmarkState} info={bookmarkInfo} updateBookmarkState={updateBookmarkState} updateBookmarkInfo={updateBookmarkInfo}/>
                }
            </RootDiv>
        </BookmarkRecentFoldersContext.Provider>
    </BookmarkTreeContext.Provider>
})

const Empty = memo(function Empty() {
    const [createMode, setCreateMode] = useState<boolean>(false)

    const onCancel = useCallback(() => setCreateMode(false), [])
    
    return <>
        {createMode ? <Creator onCancel={onCancel}/> : <Button size="small" width="100%" onClick={() => setCreateMode(true)}><Icon icon="star" mr={1}/>添加为书签</Button>}
    </>
})

const Creator = memo(function Creator({ onCancel }: {onCancel: () => void}) {
    const { recentFolders, pushRecentFolder } = useContext(BookmarkRecentFoldersContext)

    const { info, state, updateInfo, updateState, save: saveEmit } = useBookmarkCreator(recentFolders)

    const save = useCallback(async () => {
        await saveEmit()
        if(state.parent !== undefined) {
            pushRecentFolder(state.parent)
        }
    }, [pushRecentFolder, saveEmit, state.parent?.id ?? ""])

    return <>
        <Content state={state} info={info} updateBookmarkState={updateState} updateBookmarkInfo={updateInfo}/>
        <LayouttedDiv display="flex">
            <Button size="small" width="80%" type="success" onClick={save}><Icon icon="save" mr={1}/>保存书签</Button>
            <Button size="small" width="20%" type="danger" onClick={onCancel}><Icon icon="close" mr={1}/>取消</Button>
        </LayouttedDiv>
    </>
})

const Detail = memo(function Detail(props: {state: BookmarkState, info: AnalysedBookmark, updateBookmarkState: (info: BookmarkUpdateInfo) => void, updateBookmarkInfo: (info: Partial<AnalysedBookmark>) => void}) {
    const { state, info, updateBookmarkState: updateBookmarkStateEmit, updateBookmarkInfo } = props

    const { pushRecentFolder } = useContext(BookmarkRecentFoldersContext)

    const updateBookmarkState = useCallback((info: BookmarkUpdateInfo) => {
        updateBookmarkStateEmit(info)
        if(info.parent !== undefined) {
            pushRecentFolder(info.parent)
        }
    }, [pushRecentFolder, updateBookmarkStateEmit])

    return <Content state={state} info={info} updateBookmarkState={updateBookmarkState} updateBookmarkInfo={updateBookmarkInfo}/>
})

const Content = memo(function Content(props: {state: BookmarkState, info: AnalysedBookmark, updateBookmarkState: (info: BookmarkUpdateInfo) => void, updateBookmarkInfo: (info: Partial<AnalysedBookmark>) => void}) {
    const { state, info, updateBookmarkState, updateBookmarkInfo } = props

    const onUpdateParent = useCallback((parent: BookmarkParent) => updateBookmarkState({parent}), [updateBookmarkState])

    const otherNameAndKeywordMode = info.otherTitles.length > 1 || info.labels.length > 1 ? "multiple" : "single"

    const updateComments = useCallback((comments: string) => updateBookmarkInfo({comments: comments.split("\n").filter(comment => comment.trim().length > 0)}), [updateBookmarkInfo])

    const updateLastUpdatedDate = useCallback((date: Date | undefined) => updateBookmarkInfo({lastUpdated: {date: date ?? null, post: info.lastUpdated?.post ?? null}}), [info.lastUpdated?.post ?? null, updateBookmarkInfo])

    const updateLastUpdatedPost = useCallback((post: string | null) => updateBookmarkInfo({lastUpdated: {date: info.lastUpdated?.date ?? null, post: post ?? null}}), [info.lastUpdated?.date ?? null, updateBookmarkInfo])

    return <LayouttedDiv textAlign="left" margin={1}>
        <TitleRowDiv>
            <Input theme="underline" width="100%" placeholder="名称" value={info.title} onUpdateValue={title => updateBookmarkInfo({title})}/>
            <FolderSelector parent={state.parent} onUpdateParent={onUpdateParent}/>
        </TitleRowDiv>
        <OtherNameAndKeywordRowDiv $mode={otherNameAndKeywordMode}>
            <DynamicInputList mode="start" size="small" theme="underline" placeholder="新增别名" values={info.otherTitles} onUpdateValues={values => updateBookmarkInfo({otherTitles: values})}/>
            <KeywordList editable placeholder="新增关键词" inputTheme="underline" keywords={info.labels} onUpdateKeywords={labels => updateBookmarkInfo({labels})}/>
        </OtherNameAndKeywordRowDiv>
        <LayouttedDiv mt={1}>
            <Input type="textarea" width="100%" minHeight="1.2em" placeholder="备注" value={info.comments.join("\n")} onUpdateValue={updateComments}/>
        </LayouttedDiv>
        <LastUpdatedDiv>
            <Input theme="underline"  size="small" width="50%" placeholder="最后收集的post" textAlign="right" value={info.lastUpdated?.post} onUpdateValue={updateLastUpdatedPost}/>
            <span>/</span>
            <DateInput mode="date" theme="underline" size="small" width="50%" placeholder="最后收集的日期" value={info.lastUpdated?.date ?? undefined} onUpdateValue={updateLastUpdatedDate}/>
            {/* <Button size="small" mode="filled" type="success">更新</Button> */}
        </LastUpdatedDiv>
    </LayouttedDiv>
})

const FolderSelector = memo(function FolderSelector(props: {parent: BookmarkState["parent"], onUpdateParent: (parent: BookmarkParent) => void}) {
    const { parent, onUpdateParent } = props

    const [visible, setVisible] = useState(false)

    const open = useCallback(() => setVisible(true), [])
    const close = useCallback(() => setVisible(false), [])

    return <>
        <FolderSelectorButton mode="border" align="left" onClick={open}><Icon icon="folder" mr={1}/>{parent?.title ?? "(无目录)"}</FolderSelectorButton>
        {visible && <FolderSelectorPopup selectedId={parent?.id} onClose={close} onSelect={onUpdateParent}/>}
    </>
})

const FolderSelectorPopup = memo(function FolderSelectorPopup(props: {selectedId: string | undefined, onSelect: (node: BookmarkTreeNode) => void, onClose: () => void}) {
    const { selectedId, onClose, onSelect: onSelectEmit } = props

    const { tree, indexedRef } = useContext(BookmarkTreeContext)

    const { collapseState, setCollapseState } = useBookmarkPopupState(selectedId, indexedRef)

    const divRef = useRef<HTMLDivElement>(null)

    useOutsideClick(divRef, onClose, true)

    const onSelect = useCallback((node: BookmarkTreeNode) => {
        onSelectEmit(node)
        onClose()
    }, [onSelectEmit, onClose])

    return <BookmarkPopupContext.Provider value={useMemo(() => ({collapseState, setCollapseState}), [collapseState])}>
        <FolderSelectorPopupDiv ref={divRef}>
            {tree.map(child => <FolderSelectorNode key={child.id} node={child} layer={0} selectedId={selectedId} onSelect={onSelect}/>)}
        </FolderSelectorPopupDiv>
    </BookmarkPopupContext.Provider>
})

const FolderSelectorNode = memo(function FolderSelectorNode(props: {node: BookmarkTreeNode, layer: number, selectedId: string | undefined, onSelect: (node: BookmarkTreeNode) => void}) {
    const { node, layer, selectedId, onSelect } = props

    const { collapseState, setCollapseState } = useContext(BookmarkPopupContext)

    const isOpen = collapseState[node.id] === "OPEN" || collapseState[node.id] === "TEMP_OPEN"

    const toggleOpen = useCallback(() => setCollapseState(node.id, !isOpen), [node.id, isOpen])

    return <>
        <FolderSelectorNodeDiv $layer={layer} $selected={selectedId === node.id}>
            <LayouttedDiv color={node.children.length > 0 ? undefined : "tertiary"} onClick={toggleOpen}>
                <Icon icon={node.children.length > 0 && isOpen ? "caret-down" : "caret-right"} mr={1}/>
            </LayouttedDiv>
            <div onClick={() => onSelect(node)}>{node.title}</div>
        </FolderSelectorNodeDiv>
        {isOpen && node.children.map(child => <FolderSelectorNode key={child.id} node={child} layer={layer + 1} selectedId={selectedId} onSelect={onSelect}/>)}
    </>
})

function isLegalDomain(url: string | undefined, includeDomains: string[], excludeDomains: string[]): boolean {
    if(!url) {
        return false
    }
    const u = new URL(url)
    if(u.protocol !== "https:" && u.protocol !== "http:") {
        return false
    }
    if(includeDomains.length > 0 && !includeDomains.includes(u.hostname)) {
        return false
    }
    if(excludeDomains.length > 0 && excludeDomains.includes(u.hostname)) {
        return false
    }
    return true
}

const BookmarkRecentFoldersContext = createContext<{recentFolders: BookmarkParent[], pushRecentFolder: (folder: BookmarkParent) => Promise<void>}>({recentFolders: [], pushRecentFolder: async (_: BookmarkParent) => {}})

const BookmarkTreeContext = createContext<{tree: BookmarkTreeNode[], indexedRef: RefObject<Record<string, BookmarkTreeNode | undefined>>}>({tree: [], indexedRef: {current: {}}})

const BookmarkPopupContext = createContext<{collapseState: Record<string, "OPEN" | "CLOSED" | "TEMP_OPEN">, setCollapseState: (id: string, value: boolean) => void}>({collapseState: {}, setCollapseState: () => {}})

const RootDiv = styled.div`
    padding: ${SPACINGS[1]};
    box-sizing: border-box;
    text-align: center;
    border: solid 1px ${LIGHT_MODE_COLORS["border"]};
    border-radius: ${RADIUS_SIZES["std"]};
    @media (prefers-color-scheme: dark) {
        border-color: ${DARK_MODE_COLORS["border"]};
    }
`

const TitleRowDiv = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: ${SPACINGS[2]};
`

const OtherNameAndKeywordRowDiv = styled.div<{ $mode: "single" | "multiple" }>`
    margin-top: ${SPACINGS[1]};
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: ${SPACINGS[1]};
    ${p => p.$mode === "single" ? css`
        flex-wrap: nowrap;
        > div:first-child {
            width: 50%;
        }
        > div:last-child {
            width: 50%;
        }
    ` : css`
        flex-wrap: wrap;
        > * {
            width: 100%;
        }
    `}
`

const LastUpdatedDiv = styled.div`
    margin-top: ${SPACINGS[1]};
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: ${SPACINGS[1]};
`

const FolderSelectorButton = styled(Button)`
    min-width: 40%;
    flex: 1 0 auto;
`

const FolderSelectorPopupDiv = styled.div`
    position: absolute;
    top: ${SPACINGS[2]};
    right: ${SPACINGS[2]};
    min-width: 10em;
    max-width: calc(100vw - ${SPACINGS[4]});
    min-height: 4em;
    max-height: 80vh;
    overflow-y: auto;

    padding: ${SPACINGS[2]};

    border: solid 1px ${LIGHT_MODE_COLORS["border"]};
    border-radius: ${RADIUS_SIZES["std"]};
    @media (prefers-color-scheme: dark) {
        border-color: ${DARK_MODE_COLORS["border"]};
    }
    padding: ${SPACINGS[1]};
    background-color: ${LIGHT_MODE_COLORS["block"]};
    @media (prefers-color-scheme: dark) {
        background-color: ${DARK_MODE_COLORS["block"]};
    }
`

const FolderSelectorNodeDiv = styled.div<{ $layer: number, $selected: boolean }>`
    display: flex;
    justify-content: space-between;
    ${p => p.$selected && css`
        background-color: ${LIGHT_MODE_COLORS["primary"]};
        color: ${LIGHT_MODE_COLORS["text-inverted"]};
        @media (prefers-color-scheme: dark) {
            background-color: ${DARK_MODE_COLORS["primary"]};
            color: ${DARK_MODE_COLORS["text-inverted"]};
        }
    `}
    &:not(:last-child) {
        border-bottom: solid 1px ${LIGHT_MODE_COLORS["border"]};
        @media (prefers-color-scheme: dark) {
            border-color: ${DARK_MODE_COLORS["border"]};
        }
    }

    > div:first-child {
        padding: ${SPACINGS[1]} 0 ${SPACINGS[1]} ${p => p.$layer + 0.25}rem;
        flex: 0 0 auto;
    }
    > div:last-child {
        padding: ${SPACINGS[1]};
        width: 100%;
        cursor: pointer;
        &:hover {
            color: ${p => p.$selected ? LIGHT_MODE_COLORS["text-inverted"] : LIGHT_MODE_COLORS["primary"]};
            @media (prefers-color-scheme: dark) {
                color: ${p => p.$selected ? DARK_MODE_COLORS["text-inverted"] : DARK_MODE_COLORS["primary"]};
            }
        }
    }
`