import { memo } from "react"
import styled from "styled-components"
import { Input } from "@/components/form"
import { TabState } from "@/hooks/tabs"
import { useAnalyticalBookmark, useBookmarkOfTab } from "@/hooks/bookmark"
import { DARK_MODE_COLORS, LIGHT_MODE_COLORS, RADIUS_SIZES, SPACINGS } from "@/styles"

export const BookmarkPanel = memo(function BookmarkPanel(props: {tabState: TabState}) {
    const { bookmarkState, updateBookmarkState } = useBookmarkOfTab(props.tabState)

    const { bookmarkInfo } = useAnalyticalBookmark(bookmarkState)

    return <RootDiv>
        <Input value={bookmarkState?.title} onUpdateValue={title => updateBookmarkState({title})}/>
        <p>{bookmarkState?.url}</p>
        <p>{bookmarkState?.parent?.title}</p>
        <p>{bookmarkInfo?.title}</p>
        <p>{bookmarkInfo?.otherTitles.join(", ")}</p>
        <p>{bookmarkInfo?.labels.join(", ")}</p>
        <p>{bookmarkInfo?.comments.join(", ")}</p>
        <p>{bookmarkInfo?.lastUpdated?.post} / {bookmarkInfo?.lastUpdated?.date?.toLocaleDateString()}</p>
    </RootDiv>
})

const RootDiv = styled.div`
    margin: ${SPACINGS[1]} ${SPACINGS[2]};
    padding: ${SPACINGS[1]} 0;
    text-align: center;
    border: solid 1px ${LIGHT_MODE_COLORS["border"]};
    border-radius: ${RADIUS_SIZES["std"]};
    @media (prefers-color-scheme: dark) {
        border-color: ${DARK_MODE_COLORS["border"]};
    }
`