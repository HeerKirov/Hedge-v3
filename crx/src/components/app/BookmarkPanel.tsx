import { createContext, memo, RefObject, useCallback, useContext, useMemo, useRef, useState } from "react"
import styled, { css } from "styled-components"
import { Button, Icon, LayouttedDiv } from "@/components/universal"
import { DateInput, DynamicInputList, Input, KeywordList } from "@/components/form"
import { TabState } from "@/hooks/tabs"
import { useBookmarkPopupState } from "@/hooks/data"
import { Setting } from "@/functions/setting"
import { AnalysedBookmark, BookmarkState, BookmarkTreeNode, BookmarkUpdateInfo, useAnalyticalBookmark, useBookmarkOfTab, useBookmarkTree } from "@/hooks/bookmark"
import { useOutsideClick } from "@/utils/sensors"
import { DARK_MODE_COLORS, LIGHT_MODE_COLORS, RADIUS_SIZES, SPACINGS } from "@/styles"

export const BookmarkPanel = memo(function BookmarkPanel(props: {tabState: TabState, setting: Setting["extension"]["bookmarkManager"]}) {
    const { bookmarkState, updateBookmarkState } = useBookmarkOfTab(props.tabState)

    const { bookmarkInfo, updateBookmarkInfo } = useAnalyticalBookmark(bookmarkState, updateBookmarkState)

    const { bookmarkTree, bookmarkIndexedRef } = useBookmarkTree()

    const bookmarkTreeContext = useMemo(() => ({tree: bookmarkTree, indexedRef: bookmarkIndexedRef}), [bookmarkTree])

    if(!isLegalDomain(props.tabState.url, props.setting.includeDomains, props.setting.excludeDomains)) {
        return null
    }

    return <BookmarkTreeContext.Provider value={bookmarkTreeContext}>
        <RootDiv>
            {bookmarkState === null || bookmarkInfo === null || bookmarkTree === null
                ? <Empty/> 
                : <Content state={bookmarkState} info={bookmarkInfo}
                        updateBookmarkState={updateBookmarkState} updateBookmarkInfo={updateBookmarkInfo}/>
            }
        </RootDiv>
    </BookmarkTreeContext.Provider>
})

const Empty = memo(function Empty() {
    return <>
        <Button size="small" type="success" width="100%"><Icon icon="star" mr={1}/>当前页面添加为书签</Button>
    </>
})

const Content = memo(function Content(props: {state: BookmarkState, info: AnalysedBookmark, updateBookmarkState: (info: BookmarkUpdateInfo) => void, updateBookmarkInfo: (info: Partial<AnalysedBookmark>) => void}) {
    const { state, info, updateBookmarkState, updateBookmarkInfo } = props

    const onUpdateParent = useCallback((parentId: string) => {
        updateBookmarkState({parentId})
    }, [updateBookmarkState])

    const otherNameAndKeywordMode = info.otherTitles.length > 1 || info.labels.length > 1 ? "multiple" : "single"

    return <LayouttedDiv textAlign="left" margin={1}>
        <TitleRowDiv>
            <Input theme="underline" width="60%" placeholder="名称" value={info.title} onUpdateValue={title => updateBookmarkInfo({title})}/>
            <FolderSelector parent={state.parent} onUpdateParent={onUpdateParent}/>
        </TitleRowDiv>
        <OtherNameAndKeywordRowDiv $mode={otherNameAndKeywordMode}>
            <DynamicInputList mode="start" size="small" theme="underline" placeholder="新增别名" values={info.otherTitles} onUpdateValues={values => updateBookmarkInfo({otherTitles: values})}/>
            <KeywordList editable placeholder="新增关键词" inputTheme="underline" keywords={info.labels} onUpdateKeywords={labels => updateBookmarkInfo({labels})}/>
        </OtherNameAndKeywordRowDiv>
        <LayouttedDiv mt={1}>
            <Input type="textarea" width="100%" minHeight="1.2em" placeholder="备注" value={info.comments.join("\n")} onUpdateValue={comments => updateBookmarkInfo({comments: comments.split("\n")})}/>
        </LayouttedDiv>
        <LastUpdatedDiv>
            <Input theme="underline"  size="small" width="50%" placeholder="最后收集的post" textAlign="right" value={info.lastUpdated?.post} onUpdateValue={v => updateBookmarkInfo({lastUpdated: {date: info.lastUpdated?.date ?? null, post: v}})}/>
            <span>/</span>
            <DateInput mode="date" theme="underline" size="small" width="50%" placeholder="最后收集的日期" value={info.lastUpdated?.date ?? undefined} onUpdateValue={date => updateBookmarkInfo({lastUpdated: {date: date ?? null, post: info.lastUpdated?.post ?? null}})}/>
            {/* <Button size="small" mode="filled" type="success">更新</Button> */}
        </LastUpdatedDiv>
    </LayouttedDiv>
})

const FolderSelector = memo(function FolderSelector(props: {parent: BookmarkState["parent"], onUpdateParent: (parentId: string) => void}) {
    const { parent, onUpdateParent } = props

    const [visible, setVisible] = useState(false)

    const toggleVisible = useCallback(() => setVisible(v => !v), [])

    const onSelect = useCallback((node: BookmarkTreeNode) => {
        onUpdateParent(node.id)
        setVisible(false)
    }, [onUpdateParent])

    return <>
        <Button mode="border" align="left" width="40%" onClick={toggleVisible}><Icon icon="folder" mr={1}/>{parent?.title ?? "(无目录)"}</Button>
        {visible && <FolderSelectorPopup selectedId={parent?.id} onClose={toggleVisible} onSelect={onSelect}/>}
    </>
})

const FolderSelectorPopup = memo(function FolderSelectorPopup(props: {selectedId: string | undefined, onSelect: (node: BookmarkTreeNode) => void, onClose: () => void}) {
    const { selectedId, onClose, onSelect } = props

    const { tree, indexedRef } = useContext(BookmarkTreeContext)

    const { collapseState, setCollapseState } = useBookmarkPopupState(selectedId, indexedRef)

    const divRef = useRef<HTMLDivElement>(null)

    useOutsideClick(divRef, onClose, true)

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