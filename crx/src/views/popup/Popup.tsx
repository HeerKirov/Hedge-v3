import { styled } from "styled-components"
import { SourceInfoPanel, ServerStatusNotice } from "@/components/app"
import { useTabStateOnce } from "@/hooks/tabs"

export function Popup() {
    const tabState = useTabStateOnce()

    return <RootDiv>
        <ServerStatusNotice/>
        <SourceInfoPanel tabState={tabState} scene="popup"/>
    </RootDiv>
}

const RootDiv = styled.div`
    width: 300px;
    max-height: 720px;
    user-select: none;
    overflow-y: auto;
    padding-bottom: 8px;
    &::-webkit-scrollbar {
        display: none;
    }
`
