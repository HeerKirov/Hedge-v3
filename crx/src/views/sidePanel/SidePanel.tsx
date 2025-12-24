import { memo } from "react"
import styled from "styled-components"
import { LayouttedDiv } from "@/components/universal"
import { SourceInfoPanel, BookmarkPanel, DownloadPanel, ServerStatusNotice } from "@/components/app"
import { useTabState } from "@/hooks/tabs"
import { SPACINGS } from "@/styles"
import { useSetting } from "@/hooks/setting"

export function SidePanel() {
    const tabState = useTabState()
    const { setting } = useSetting()

    return setting !== null && <RootDiv>
        {setting.extension.sidePanel.enableServerStatus && <ServerStatusNotice/>}
        {setting.extension.sidePanel.enableSourceInfo && <SourceInfoPanel tabState={tabState} scene="sidePanel"/>}
        {setting.extension.sidePanel.enableBookmark && <BookmarkPanel tabState={tabState} setting={setting.extension.bookmarkManager}/>}
        {setting.extension.sidePanel.enableDownloadManager && <DownloadPanel setting={setting.extension.downloadManager}/>}
        {!setting.extension.sidePanel.enableBookmark && !setting.extension.sidePanel.enableSourceInfo && !setting.extension.sidePanel.enableDownloadManager && !setting.extension.sidePanel.enableServerStatus && <Empty/>}
    </RootDiv>
}

const Empty = memo(function Empty() {
    return <LayouttedDiv textAlign="center">
        <p>没有启用任何模块，请在扩展选项中启用。</p>
    </LayouttedDiv>
})

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
        @media (prefers-color-scheme: dark) {
            box-shadow: 1px 1px 5px 0 rgba(255, 255, 255, 0.15);
        }
    }

    > div:last-child {
        flex: 1;
        min-height: 0;
    }
`
