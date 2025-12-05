import { memo } from "react"
import styled from "styled-components"
import { TabState } from "@/hooks/tabs"
import { useBookmarkOfTab } from "@/hooks/bookmark"
import { DARK_MODE_COLORS, LIGHT_MODE_COLORS, RADIUS_SIZES, SPACINGS } from "@/styles"

export const BookmarkPanel = memo(function BookmarkPanel(props: {tabState: TabState}) {
    const bookmarkState = useBookmarkOfTab(props.tabState)

    return <RootDiv>
        <p>{bookmarkState?.title}</p>
        <p>{bookmarkState?.url}</p>
        <p>{bookmarkState?.dateAdded?.toLocaleDateString()}</p>
        <p>{bookmarkState?.dateLastUsed?.toLocaleDateString()}</p>
        <p>{bookmarkState?.parent?.title}</p>
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