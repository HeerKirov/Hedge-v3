import { memo } from "react"
import styled, { css } from "styled-components"
import { Button, Icon, LayouttedDiv, PopupMenu, PopupMenuItem } from "@/components/universal"
import { DateInput, DynamicInputList, Input, KeywordList } from "@/components/form"
import { TabState } from "@/hooks/tabs"
import { AnalysedBookmark, BookmarkState, useAnalyticalBookmark, useBookmarkOfTab } from "@/hooks/bookmark"
import { DARK_MODE_COLORS, LIGHT_MODE_COLORS, RADIUS_SIZES, SPACINGS } from "@/styles"

export const BookmarkPanel = memo(function BookmarkPanel(props: {tabState: TabState}) {
    const { bookmarkState, updateBookmarkState } = useBookmarkOfTab(props.tabState)

    const { bookmarkInfo, updateBookmarkInfo } = useAnalyticalBookmark(bookmarkState, updateBookmarkState)

    return <RootDiv>
        {bookmarkState === null || bookmarkInfo === null ? <Empty/> : <Content state={bookmarkState} info={bookmarkInfo} updateBookmarkInfo={updateBookmarkInfo}/>}
    </RootDiv>
})

const Empty = memo(function Empty() {
    return <>
        <Button type="success" width="100%"><Icon icon="star" mr={1}/>当前页面添加为书签</Button>
    </>
})

const Content = memo(function Content(props: {state: BookmarkState, info: AnalysedBookmark, updateBookmarkInfo: (info: Partial<AnalysedBookmark>) => void}) {
    const { state, info, updateBookmarkInfo } = props

    const otherNameAndKeywordMode = info.otherTitles.length > 1 || info.labels.length > 1 ? "multiple" : "single"

    const popupMenuItems: () => PopupMenuItem[] = () => [
        {type: "normal", label: "修改"}
    ]

    return <LayouttedDiv textAlign="left">
        <TitleRowDiv>
            <Input theme="underline" width="60%" placeholder="名称" value={info.title} onUpdateValue={title => updateBookmarkInfo({title})}/>
            <PopupMenu items={popupMenuItems} children={popup => <Button mode="border" align="left" width="40%" onClick={popup}><Icon icon="folder" mr={1}/>{state.parent?.title}</Button>}/>
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

const RootDiv = styled.div`
    margin: ${SPACINGS[1]} ${SPACINGS[2]};
    padding: ${SPACINGS[2]};
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