import { styled } from "styled-components"
import { SourceInfoPanel, ServerStatusNotice } from "@/components/app"
import { useTabStateOnce } from "@/hooks/tabs"
import { SPACINGS } from "@/styles"

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
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: ${SPACINGS[1]};
    padding: ${SPACINGS[1]} ${SPACINGS[2]};
    &::-webkit-scrollbar {
        display: none;
    }
`
