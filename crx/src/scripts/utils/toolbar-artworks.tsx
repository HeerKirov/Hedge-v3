import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import ReactDOM from "react-dom/client"
import { css, styled, StyleSheetManager } from "styled-components"
import { Button, FormattedText, Icon, LayouttedDiv, Separator } from "@/components/universal"
import { SourceDataCollectStatus, SourceDataUpdateForm, SourceEditStatus } from "@/functions/server/api-source-data"
import { useCollectStatus } from "@/hooks/source-info"
import { SourceDataPath } from "@/functions/server/api-all"
import { sendMessage } from "@/functions/messages"
import { similarFinder, ThumbnailInfo } from "@/scripts/utils/find-similar"
import { Result } from "@/utils/primitives"
import { useOutsideClick } from "@/utils/sensors"
import { fontAwesomeCSS } from "@/styles/fontawesome"
import { DARK_MODE_COLORS, ELEMENT_HEIGHTS, FONT_SIZES, GlobalStyle, LIGHT_MODE_COLORS, RADIUS_SIZES, SPACINGS } from "@/styles"

type LocalSite = "pixiv" | "ehentai" | "ehentai-gallery" | "sankaku"

interface RegisterItem {
    index: number
    sourceDataPath: SourceDataPath | null
    thumbnailSrc: string | ThumbnailInfo | (() => string | ThumbnailInfo | null) | null
    downloadURL: string | (() => Promise<string | null> | string | null) | null
    sourceDataProvider?: () => Promise<Result<SourceDataUpdateForm, string>>
    element: HTMLElement
}

interface ToolbarConfig {
    locale: LocalSite | undefined
    collectSourceData: boolean
}

export const artworksToolbar = {
    config(newConfig: Partial<ToolbarConfig>) {
        if(newConfig.locale !== undefined) config.locale = newConfig.locale
        if(newConfig.collectSourceData !== undefined) config.collectSourceData = newConfig.collectSourceData
    },
    add(items: RegisterItem[]) {
        for(const item of items) {
            const rootElement = document.createElement("section")
            item.element.appendChild(rootElement)
            rootElement.id = `artworks-toolbar-${item.index}`
            const shadowRoot = rootElement.attachShadow({ mode: "open" })

            const styleSlot = document.createElement("section")
            shadowRoot.appendChild(styleSlot)

            const body = document.createElement("div")
            body.id = "body"
            body.setAttribute("style", "background: none")
            shadowRoot.appendChild(body)

            const rootStyle = config.locale ? ROOT_STYLES[config.locale] : undefined
            if(rootStyle && rootStyle.relativeItem) {
                item.element.style.position = "relative"
            }

            // 在父元素上监听鼠标事件，通过自定义事件传递给shadow DOM内的React组件
            const handleMouseEnter = () => {
                body.dispatchEvent(new CustomEvent("toolbar-hover", { detail: { hover: true } }))
            }
            const handleMouseLeave = () => {
                body.dispatchEvent(new CustomEvent("toolbar-hover", { detail: { hover: false } }))
            }
            item.element.addEventListener("mouseenter", handleMouseEnter)
            item.element.addEventListener("mouseleave", handleMouseLeave)

            const { element, ...rest } = item

            ReactDOM.createRoot(body).render(
                <React.StrictMode>
                    <StyleSheetManager target={styleSlot}>
                        <style>{fontAwesomeCSS}</style>
                        <GlobalStyle/>
                        <ToolBar {...rest} bodyElement={body}/>
                    </StyleSheetManager>
                </React.StrictMode>
            )
        }
    }
}

const config: ToolbarConfig = {locale: undefined, collectSourceData: true}

function ToolBar(props: Omit<RegisterItem, "element"> & { bodyElement: HTMLElement }) {
    const { bodyElement, ...rest } = props
    const [hover, setHover] = useState(false)
    const [active, setActive] = useState(false)

    const toggleActive = useCallback(() => {
        setActive(prev => !prev)
    }, [])

    // 监听来自父元素的自定义事件
    useEffect(() => {
        const handleHover = (e: Event) => {
            const customEvent = e as CustomEvent<{ hover: boolean }>
            setHover(customEvent.detail.hover)
        }
        bodyElement.addEventListener("toolbar-hover", handleHover as EventListener)
        return () => {
            bodyElement.removeEventListener("toolbar-hover", handleHover as EventListener)
        }
    }, [bodyElement])

    return (hover || active) && <ToolBarDiv $style={config.locale} $active={active}>
        {active ? <ToolBarPanel {...rest} onClose={toggleActive}/> : <Button square size="tiny" onClick={toggleActive}><Icon icon="ellipsis-vertical"/></Button>}
    </ToolBarDiv>
}

const ToolBarPanel = memo(function ToolBarPanel(props: Omit<RegisterItem, "element"> & { onClose: () => void }) {
    const { index: _, sourceDataPath, thumbnailSrc, downloadURL, sourceDataProvider, onClose } = props

    const favicon = useMemo(() => chrome.runtime.getURL("favicon.png"), [])
    
    const { collectStatus, manualCollectSourceData } = useCollectStatus(sourceDataPath)
    
    const ref = useRef<HTMLDivElement>(null)
    
    useOutsideClick(ref, onClose, true)

    const quickFind = useCallback(async () => {
        if(sourceDataPath) {
            let sourceData = await sendMessage("GET_SOURCE_DATA", {sourceSite: sourceDataPath.sourceSite, sourceId: sourceDataPath.sourceId})
            if(!sourceData.ok && sourceDataProvider !== undefined) {
                sourceData = await sourceDataProvider()
                if(sourceData.ok) {
                    sendMessage("SUBMIT_SOURCE_DATA", {path: sourceDataPath, data: sourceData})
                }
            }
            
            const src = typeof thumbnailSrc === "function" ? thumbnailSrc() : thumbnailSrc
            similarFinder.quickFind(src, sourceDataPath, sourceData)
        }
    }, [sourceDataPath, thumbnailSrc])

    const collectSourceData = useCallback(async () => {
        if(sourceDataPath) {
            let sourceData = await sendMessage("GET_SOURCE_DATA", {sourceSite: sourceDataPath.sourceSite, sourceId: sourceDataPath.sourceId})
            if(!sourceData.ok && sourceDataProvider !== undefined) {
                sourceData = await sourceDataProvider()
                if(sourceData.ok) {
                    await sendMessage("SUBMIT_SOURCE_DATA", {path: sourceDataPath, data: sourceData})
                }
            }
            await manualCollectSourceData()
        }
    }, [sourceDataPath, sourceDataProvider])

    const enableCollectSourceData = config.locale !== "ehentai-gallery"
    const enableQuickFind = thumbnailSrc !== null
    const enableDownload = downloadURL !== null

    return <ToolBarPanelDiv ref={ref}>
        <LayouttedDiv display="flex" userSelect="none" size="small" padding={1}><FaviconImg src={favicon} alt="favicon"/>Hedge v3 Helper</LayouttedDiv>
        <Separator spacing={1}/>
        {collectStatus && <CollectStatusNotice {...collectStatus}/>}
        {enableCollectSourceData && <Button align="left" size="small" onClick={collectSourceData}><Icon icon="cloud-arrow-down" mr={1}/>{collectStatus?.collectStatus === "EDITED" ? "重新收集数据" : "收集来源数据"}</Button>}
        {enableQuickFind && <Button align="left" size="small" onClick={quickFind}><Icon icon="magnifying-glass" mr={1}/>相似项查找</Button>}
        {enableDownload && <DownloadButton downloadURL={downloadURL} sourcePath={sourceDataPath}/>}
    </ToolBarPanelDiv>
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

    const enableCollectSourceData = config.locale !== "ehentai-gallery"

    return <CollectStatusNoticeDiv $collectStatus={enableCollectSourceData ? props.collectStatus : null} $imageStatus={props.imageCount > 0 || props.imageInDiffIdCount > 0}>
        <span>图像</span> <div>{imageCountText}</div>
        {enableCollectSourceData && <><span>数据</span> <div>{collectStatusText}</div></>}
    </CollectStatusNoticeDiv>
})

const DownloadButton = memo(function DownloadButton(props: { downloadURL: string | (() => Promise<string | null> | string | null), sourcePath: SourceDataPath | null }) {
    const { downloadURL, sourcePath } = props

    const [status, setStatus] = useState<"DN" | "ING" | "OK">("DN")

    const downloadClick = async () => {
        if(status !== "ING") {
            const url = typeof downloadURL === "function" ? (await downloadURL()) ?? "" : downloadURL
            sendMessage("DOWNLOAD_URL", {url, sourcePath: sourcePath ?? undefined, collectSourceData: config.collectSourceData})
            setStatus("ING")
            setTimeout(() => setStatus("OK"), 500)
        }
    }

    return <Button align="left" size="small" onClick={downloadClick}>
        {status === "DN" ? <Icon icon="download" mr={1}/>
        : status === "ING" ? <Icon icon="circle-notch" spin mr={1}/>
        : <FormattedText color="success"><Icon icon="check" mr={1}/></FormattedText>}
        下载图像
    </Button>
})

const ROOT_STYLES: Record<LocalSite, {relativeItem: boolean}> = {
    "pixiv": {relativeItem: true},
    "ehentai": {relativeItem: true},
    "ehentai-gallery": {relativeItem: true},
    "sankaku": {relativeItem: true},
}

const COLLECT_STATUS_DESCRIBE: {[status in SourceEditStatus]: string} = {
    "NOT_EDITED": "未收集",
    "EDITED": "已收集",
    "IGNORED": "标记为忽略",
    "ERROR": "标记为错误"
}

const ToolBarDiv = styled.div<{ $style?: LocalSite, $active: boolean }>`
    position: absolute;
    top: 4px;
    right: 4px;
    ${p => p.$active && css`
        z-index: 101;
        transform: translateX(calc(50% - ${ELEMENT_HEIGHTS["tiny"]} / 2));
    `}
    box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
    border-radius: ${RADIUS_SIZES["large"]};
    border: solid 1px ${LIGHT_MODE_COLORS["border"]};
    background-color: ${LIGHT_MODE_COLORS["background"]};
    @media (prefers-color-scheme: dark) {
        border-color: ${DARK_MODE_COLORS["border"]};
        background-color: ${DARK_MODE_COLORS["background"]};
    }
`

const ToolBarPanelDiv = styled.div`
    padding: ${SPACINGS[2]};
    display: flex;
    flex-direction: column;
`

const FaviconImg = styled.img`
    width: 12px;
    height: 12px;
    margin-right: 4px;
`

const CollectStatusNoticeDiv = styled.div<{ $collectStatus: SourceEditStatus | null, $imageStatus: boolean }>`
    display: flex;
    box-sizing: border-box;
    align-items: center;
    gap: ${SPACINGS[1]};
    padding: ${SPACINGS[1]} ${SPACINGS[2]};
    height: ${ELEMENT_HEIGHTS["small"]};
    line-height: ${ELEMENT_HEIGHTS["small"]};
    border-radius: ${RADIUS_SIZES["std"]};
    font-size: ${FONT_SIZES["small"]};
    > span {
        font-size: ${FONT_SIZES["tiny"]};
        opacity: 0.7;
    }
    
    ${p => p.$collectStatus === "EDITED" && p.$imageStatus ? css`
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
    ` : p.$collectStatus === "EDITED" ? css`
        background-color: ${LIGHT_MODE_COLORS["info"]};
        color: ${LIGHT_MODE_COLORS["text-inverted"]};
        @media (prefers-color-scheme: dark) {
            background-color: ${DARK_MODE_COLORS["info"]};
            color: ${DARK_MODE_COLORS["text-inverted"]};
        }
    ` : undefined}
`