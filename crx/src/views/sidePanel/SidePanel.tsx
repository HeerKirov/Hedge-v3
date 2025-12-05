import styled from "styled-components"
import { SourceInfoPanel, BookmarkPanel } from "@/components/app"
import { useTabState } from "@/hooks/tabs"
import { SPACINGS } from "@/styles"

export function SidePanel() {
    const tabState = useTabState()

    return <RootDiv>
        <SourceInfoPanel tabState={tabState} scene="sidePanel"/>
        <BookmarkPanel tabState={tabState}/>
    </RootDiv>
}

const RootDiv = styled.div`
    user-select: none;
    max-height: 100vh;
    overflow-y: auto;
    padding: ${SPACINGS[1]} 0;
    &::-webkit-scrollbar {
        display: none;
    }
`
