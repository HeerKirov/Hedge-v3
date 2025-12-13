import { memo } from "react"
import { styled } from "styled-components"
import { Button, FormattedText, Icon, LayouttedDiv, SecondaryText } from "@/components/universal"
import { useTabSourceInfo } from "@/hooks/source-info"
import { TabState } from "@/hooks/tabs"
import { SourceDataPath } from "@/functions/server/api-all"
import { SourceDataCollectStatus, SourceEditStatus } from "@/functions/server/api-source-data"
import { DARK_MODE_COLORS, LIGHT_MODE_COLORS, RADIUS_SIZES, SPACINGS } from "@/styles"


export const SourceInfoPanel = memo(function SourceInfoPanel(props: {tabState: TabState, scene?: "popup" | "sidePanel"}) {
    const { sourceInfo, collectStatus, manualCollectSourceData, quickFind } = useTabSourceInfo(props.tabState, props.scene)

    return sourceInfo ? <RootDiv>
        <LayouttedDiv size="small" mb={0.5}>{sourceInfo.host}</LayouttedDiv>
        {sourceInfo.sourceDataPath && <>
            <SourceDataPathNotice {...sourceInfo.sourceDataPath}/>
            {collectStatus !== null && <CollectStatusNotice {...collectStatus}/>}
            <Button size="small" onClick={manualCollectSourceData}><Icon icon="cloud-arrow-down" mr={1}/>{collectStatus?.collected ? "重新" : ""}收集来源数据</Button>
            <Button size="small" onClick={quickFind}><Icon icon="grin-squint" mr={1}/>查找相似项</Button>
        </>}
    </RootDiv> : undefined
})

function SourceDataPathNotice(path: SourceDataPath) {
    return <SourceDataPathDiv>
        {path.sourceSite}
        <SourceIdBold>{path.sourceId}</SourceIdBold>
        {path.sourcePart !== null && <SourcePartSpan>p{path.sourcePart}</SourcePartSpan>}
        {path.sourcePartName !== null && <FormattedText color="secondary">/{path.sourcePartName}</FormattedText>}
    </SourceDataPathDiv>
}

function CollectStatusNotice(props: SourceDataCollectStatus) {
    const collectStatusColor = props.collectStatus === "EDITED" ? "success" : props.collectStatus === "ERROR" ? "danger" : props.collectStatus === "IGNORED" ? "secondary" : undefined

    const imageCountColor = (props.imageCount > 0 || props.imageInDiffIdCount > 0) ? "success" : undefined

    const collectStatusText = props.collectStatus !== null ? COLLECT_STATUS_DESCRIBE[props.collectStatus] : "无记录"

    const collectTimeText = props.collectTime !== null ? new Date(props.collectTime).toLocaleDateString() : null

    const imageCountText = props.imageCount > 0 && props.imageInDiffIdCount > 0 ? (
        `已收集${props.imageCount > 1 ? `(${props.imageCount}项)` : ""}，已在其他位置收集${props.imageInDiffIdCount > 1 ? `(${props.imageInDiffIdCount}项)` : ""}`
    ) : props.imageCount > 0 ? (
        `已收集${props.imageCount > 1 ? `(${props.imageCount}项)` : ""}`
    ) : props.imageInDiffIdCount > 0 ? (
        `已在其他位置收集${props.imageInDiffIdCount > 1 ? `(${props.imageInDiffIdCount}项)` : ""}`
    ) : "未收集"

    return <CollectStatusDiv>
        图像:
        <FormattedText color={imageCountColor}>{imageCountText}</FormattedText>
        /来源数据:
        <FormattedText color={collectStatusColor}>{collectStatusText}</FormattedText>
        {collectTimeText && <SecondaryText>收集时间: {collectTimeText}</SecondaryText>}
    </CollectStatusDiv>
}

const COLLECT_STATUS_DESCRIBE: {[status in SourceEditStatus]: string} = {
    "NOT_EDITED": "未收集",
    "EDITED": "已收集",
    "IGNORED": "标记为忽略",
    "ERROR": "标记为错误"
}


const RootDiv = styled.div`
    padding: ${SPACINGS[1]} 0;
    box-sizing: border-box;
    text-align: center;
    border: solid 1px ${LIGHT_MODE_COLORS["border"]};
    border-radius: ${RADIUS_SIZES["std"]};
    @media (prefers-color-scheme: dark) {
        border-color: ${DARK_MODE_COLORS["border"]};
    }
`

const SourceDataPathDiv = styled.div`
    margin: ${SPACINGS[2]} 0 ${SPACINGS[1]} 0;
`

const SourceIdBold = styled.b`
    margin-left: ${SPACINGS[1]};
`

const SourcePartSpan = styled.span`
    margin-left: ${SPACINGS[1]};
`

const CollectStatusDiv = styled.div`
    margin-bottom: ${SPACINGS[1]};
`
