import styled from "styled-components"
import { SourceInfoPanel, BookmarkPanel, DownloadPanel } from "@/components/app"
import { useTabState } from "@/hooks/tabs"
import { SPACINGS } from "@/styles"

export function SidePanel() {
    const tabState = useTabState()

    return <RootDiv>
        <SourceInfoPanel tabState={tabState} scene="sidePanel"/>
        <BookmarkPanel tabState={tabState}/>
        <DownloadPanel/>
    </RootDiv>
}

const RootDiv = styled.div`
    user-select: none;
    box-sizing: border-box;
    height: 100vh;
    display: flex;
    flex-direction: column;
    padding: ${SPACINGS[1]} ${SPACINGS[2]};
    gap: ${SPACINGS[1]};

    > div {
        box-shadow: 1px 1px 5px 0 rgba(0, 0, 0, 0.1);
    }

    > div:last-child {
        height: 100%;
    }
`
