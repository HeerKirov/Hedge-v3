import { memo } from "react"
import { css, styled } from "styled-components"
import { Button, FormattedText, Icon, LayouttedDiv } from "@/components/universal"
import { useTabSourceInfo } from "@/hooks/source-info"
import { TabState } from "@/hooks/tabs"
import { SourceDataPath } from "@/functions/server/api-all"
import { SourceDataCollectStatus, SourceEditStatus } from "@/functions/server/api-source-data"
import { WEBSITES } from "@/functions/sites"
import { dates } from "@/utils/primitives"
import { DARK_MODE_COLORS, FONT_SIZES, LIGHT_MODE_COLORS, RADIUS_SIZES, SPACINGS } from "@/styles"


export const SourceInfoPanel = memo(function SourceInfoPanel(props: {tabState: TabState, scene?: "popup" | "sidePanel"}) {
    const { sourceInfo, collectStatus, manualCollectSourceData, quickFind } = useTabSourceInfo(props.tabState, props.scene)

    return sourceInfo?.sourceDataPath ? <RootDiv>
        <div>
            <SourceDataPathNotice {...sourceInfo.sourceDataPath}/>
            {collectStatus !== null && <CollectStatusNotice {...collectStatus}/>}
        </div>
        <div className="buttons">
            {collectStatus?.collectTime && <CollectTimeText collectTime={collectStatus.collectTime}/>}
            <div className="spacer"/>
            <Button size="small" onClick={manualCollectSourceData}><Icon icon="cloud-arrow-down" mr={1}/>{collectStatus?.collected ? "重新" : ""}收集数据</Button>
            <Button size="small" onClick={quickFind}><Icon icon="grin-squint" mr={1}/>查找相似项</Button>
        </div>
    </RootDiv> : undefined
})

const SourceDataPathNotice = memo(function SourceDataPathNotice(path: SourceDataPath) {
    return <SourceDataPathDiv>
        {WEBSITES[path.sourceSite]?.siteTitle ?? path.sourceSite}
        <SourceIdBold>{path.sourceId}</SourceIdBold>
        {path.sourcePart !== null && <SourcePartSpan>p{path.sourcePart}</SourcePartSpan>}
        {path.sourcePartName !== null && <FormattedText color="secondary">/{path.sourcePartName}</FormattedText>}
    </SourceDataPathDiv>
})

const CollectStatusNotice = memo(function CollectStatusNotice(props: SourceDataCollectStatus) {
    const collectStatusText = props.collectStatus !== null ? COLLECT_STATUS_DESCRIBE[props.collectStatus] : "无记录"

    const imageCountText = props.imageCount === 1 && props.imageInDiffIdCount === 0 ? 
        "已下载"
    : props.imageCount > 1 && props.imageInDiffIdCount === 0 ?
        `已下载(${props.imageCount}项)`
    : props.imageCount > 0 && props.imageInDiffIdCount > 0 ?
        `已下载(${props.imageCount}项，其他位置(${props.imageInDiffIdCount}项)`
    : props.imageCount === 0 && props.imageInDiffIdCount > 0 ?
        `已下载(其他位置${props.imageInDiffIdCount}项)`
    : "未下载"

    return <CollectStatusNoticeDiv $collectStatus={props.collectStatus} $imageStatus={props.imageCount > 0 || props.imageInDiffIdCount > 0}>
        <div className="image-status-notice">
            <span>图像</span> <div>{imageCountText}</div>
        </div>
        <div className="data-status-notice">
            <span>数据</span> <div>{collectStatusText}</div>
        </div>
    </CollectStatusNoticeDiv>
})

const CollectTimeText = memo(function CollectTimeText(props: {collectTime: string}) {
    return <LayouttedDiv size="small" color="secondary" mr={2} mt={1}>收集时间: {dates.toFormatDate(new Date(props.collectTime))}</LayouttedDiv>
})

const COLLECT_STATUS_DESCRIBE: {[status in SourceEditStatus]: string} = {
    "NOT_EDITED": "未收集",
    "EDITED": "已收集",
    "IGNORED": "标记为忽略",
    "ERROR": "标记为错误"
}

const RootDiv = styled.div`
    display: flex;
    justify-content: space-between;
    padding: ${SPACINGS[2]};
    box-sizing: border-box;
    border: solid 1px ${LIGHT_MODE_COLORS["border"]};
    border-radius: ${RADIUS_SIZES["std"]};
    @media (prefers-color-scheme: dark) {
        border-color: ${DARK_MODE_COLORS["border"]};
    }
    > div:first-child {
        flex: 1;
        min-width: 0;
    }
    .buttons {
        flex: 0 0 auto;
        display: flex;
        flex-direction: column;
        justify-content: flex-end;
        align-items: flex-end;
        
        .spacer {
            height: 100%;
        }
    }
`

const SourceDataPathDiv = styled.div`
    margin-top: ${SPACINGS[1]};
    margin-bottom: ${SPACINGS[2]};
    user-select: text;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`

const SourceIdBold = styled.b`
    margin-left: ${SPACINGS[1]};
`

const SourcePartSpan = styled.span`
    margin-left: ${SPACINGS[1]};
`

const CollectStatusNoticeDiv = styled.div<{ $collectStatus: SourceEditStatus | null, $imageStatus: boolean }>`
    .image-status-notice, .data-status-notice {
        display: flex;
        align-items: baseline;
        justify-content: flex-start;
        gap: ${SPACINGS[2]};
    }
    .image-status-notice > span, .data-status-notice > span {
        font-size: ${FONT_SIZES["small"]};
        opacity: 0.7;
    }
    .image-status-notice > div {
        padding: ${SPACINGS[1]} ${SPACINGS[2]};
        border-radius: ${RADIUS_SIZES["large"]};
        ${p => (p.$collectStatus === "EDITED" && p.$imageStatus) ? css`
            background-color: ${LIGHT_MODE_COLORS["primary"]};
            color: ${LIGHT_MODE_COLORS["text-inverted"]};
            @media (prefers-color-scheme: dark) {
                background-color: ${DARK_MODE_COLORS["primary"]};
                color: ${DARK_MODE_COLORS["text-inverted"]};
            }
        ` : p.$imageStatus ? css`
            background-color: ${LIGHT_MODE_COLORS["success"]};
            color: ${LIGHT_MODE_COLORS["text-inverted"]};
            @media (prefers-color-scheme: dark) {
                background-color: ${DARK_MODE_COLORS["success"]};
                color: ${DARK_MODE_COLORS["text-inverted"]};
            }
        ` : undefined}
    }
    .data-status-notice > div {
        margin-top: ${SPACINGS[1]};
        padding: ${SPACINGS[1]} ${SPACINGS[2]};
        border-radius: ${RADIUS_SIZES["large"]};
        ${p => p.$imageStatus && p.$collectStatus === "EDITED" ? css`
            background-color: ${LIGHT_MODE_COLORS["primary"]};
            color: ${LIGHT_MODE_COLORS["text-inverted"]};
            @media (prefers-color-scheme: dark) {
                background-color: ${DARK_MODE_COLORS["primary"]};
                color: ${DARK_MODE_COLORS["text-inverted"]};
            }
        ` : p.$collectStatus === "EDITED" ? css`
            background-color: ${LIGHT_MODE_COLORS["info"]};
            color: ${LIGHT_MODE_COLORS["text-inverted"]};
            @media (prefers-color-scheme: dark) {
                background-color: ${DARK_MODE_COLORS["info"]};
                color: ${DARK_MODE_COLORS["text-inverted"]};
            }
        ` : p.$collectStatus === "ERROR" ? css`
            color: ${LIGHT_MODE_COLORS["danger"]};
            @media (prefers-color-scheme: dark) {
                color: ${DARK_MODE_COLORS["danger"]};
            }
        ` : p.$collectStatus === "IGNORED" ? css`
            color: ${LIGHT_MODE_COLORS["secondary"]};
            @media (prefers-color-scheme: dark) {
                color: ${DARK_MODE_COLORS["secondary"]};
            }
        ` : undefined}
    }
`