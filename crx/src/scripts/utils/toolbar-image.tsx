import React, { memo, useCallback, useMemo, useRef, useState } from "react"
import ReactDOM from "react-dom/client"
import { css, styled, StyleSheetManager } from "styled-components"
import { Button, FormattedText, Icon, LayouttedDiv, Separator } from "@/components/universal"
import { SourceDataUpdateForm } from "@/functions/server/api-source-data"
import { SourceDataPath } from "@/functions/server/api-all"
import { sendMessage } from "@/functions/messages"
import { useCollectStatus } from "@/hooks/source-info"
import { similarFinder, ThumbnailInfo } from "@/scripts/utils"
import { useOutsideClick } from "@/utils/sensors"
import { Result } from "@/utils/primitives"
import { fontAwesomeCSS } from "@/styles/fontawesome"
import { DARK_MODE_COLORS, ELEMENT_HEIGHTS, FONT_SIZES, GlobalStyle, LIGHT_MODE_COLORS, RADIUS_SIZES, SPACINGS } from "@/styles"

type LocaleSite = "pixiv" | "ehentai-image" | "ehentai-mpv" | "sankaku" | "fanbox" | "kemono" | "fantia"

interface RegisterItem {
    index: number | null
    downloadURL: string | (() => string | null | undefined) | null | undefined
    externalURL?: string
    sourcePath: SourceDataPath | null
    thumbnailSrc?: string | ThumbnailInfo | (() => string | ThumbnailInfo | null) | null
    sourceDataProvider?: () => Promise<Result<SourceDataUpdateForm, string>>
    element: HTMLElement
}

interface ToolbarConfig {
    locale: LocaleSite | undefined
    collectSourceData: boolean
}

export const imageToolbar = {
    config(newConfig: Partial<ToolbarConfig>) {
        if(newConfig.locale !== undefined) config.locale = newConfig.locale
        if(newConfig.collectSourceData !== undefined) config.collectSourceData = newConfig.collectSourceData
    },
    add(items: RegisterItem[]) {
        for(const item of items) {
            const { element, ...rest } = item
            const rootElement = document.createElement("div")
            element.appendChild(rootElement)
            rootElement.id = `image-toolbar-${item.index}`
            const shadowRoot = rootElement.attachShadow({ mode: "open" })

            const styleSlot = document.createElement("section")
            shadowRoot.appendChild(styleSlot)

            const body = document.createElement("div")
            body.id = "body"
            body.setAttribute("style", "background: none")
            shadowRoot.appendChild(body)

            const rootStyle = config.locale ? ROOT_STYLES[config.locale] : undefined
            if(rootStyle) {
                rootElement.setAttribute("style", rootStyle.style)
                if(rootStyle.relativeItem) {
                    item.element.style.position = "relative"
                }
            }

            ReactDOM.createRoot(body).render(
                <React.StrictMode>
                    <StyleSheetManager target={styleSlot}>
                        <style>{fontAwesomeCSS}</style>
                        <GlobalStyle/>
                        <ToolBar {...rest}/>
                    </StyleSheetManager>
                </React.StrictMode>
            )
        }
    }
}

const config: ToolbarConfig = {locale: undefined, collectSourceData: true}

function ToolBar(props: Omit<RegisterItem, "element">) {
    const [status, setStatus] = useState<"DN" | "ING" | "OK">("DN")
    const [active, setActive] = useState(false)

    const toggleActive = useCallback(() => {
        setActive(prev => !prev)
    }, [])

    const downloadClick = useCallback(() => {
        if(status !== "ING") {
            const url = typeof props.downloadURL === "function" ? props.downloadURL() : props.downloadURL
            if(url) {
                const sourcePath = props.sourcePath ?? undefined
                sendMessage("DOWNLOAD_URL", {url, sourcePath, collectSourceData: config.collectSourceData})
                setStatus("ING")
                setTimeout(() => setStatus("OK"), 500)
            }
        }
    }, [status, props.downloadURL, props.sourcePath, config.collectSourceData])

    return <ToolBarDiv $style={config.locale}>
        {(props.downloadURL || props.externalURL) && <DownloadButton index={props.index} status={status} externalURL={props.externalURL} downloadClick={downloadClick}/>}
        <EllipsisButton onClick={toggleActive}><Icon icon="ellipsis-vertical"/></EllipsisButton>
        {active && <ToolBarPanel {...props} status={status} downloadClick={downloadClick} onClose={toggleActive}/>}
    </ToolBarDiv>
}

const ToolBarPanel = memo(function ToolBarPanel(props: Omit<RegisterItem, "element"> & { status: "DN" | "ING" | "OK", downloadClick: () => void, onClose: () => void }) {
    const { index: _, sourcePath, downloadURL, externalURL, thumbnailSrc, sourceDataProvider, status, downloadClick, onClose } = props

    const favicon = useMemo(() => chrome.runtime.getURL("favicon.png"), [])
    
    const ref = useRef<HTMLDivElement>(null)
    
    useOutsideClick(ref, onClose, true)

    const quickFind = useCallback(async () => {
        if(sourcePath) {
            const src = typeof thumbnailSrc === "function" ? thumbnailSrc() : thumbnailSrc
            let sourceData = await sendMessage("GET_SOURCE_DATA", {sourceSite: sourcePath.sourceSite, sourceId: sourcePath.sourceId})
            if(!sourceData.ok && sourceDataProvider !== undefined) {
                sourceData = await sourceDataProvider()
            }
            similarFinder.quickFind(src, sourcePath, sourceData)
        }
    }, [sourcePath, thumbnailSrc, sourceDataProvider])

    return <ToolBarPanelDiv ref={ref} $style={config.locale}>
        <LayouttedDiv display="flex" userSelect="none" size="small" padding={1}><FaviconImg src={favicon} alt="favicon"/>Hedge v3 Helper</LayouttedDiv>
        <Separator spacing={1}/>
        {sourcePath && <CollectStatusNotice sourcePath={sourcePath}/>}
        <Button align="left" size="small" onClick={quickFind}><Icon icon="magnifying-glass" mr={1}/>相似项查找</Button>
        {(downloadURL || externalURL) && <DownloadMenuButton status={status} externalURL={externalURL} downloadClick={downloadClick}/>}
    </ToolBarPanelDiv>
})

const CollectStatusNotice = memo(function CollectStatusNotice(props: { sourcePath: SourceDataPath | null }) {
    const { collectStatus } = useCollectStatus(props.sourcePath)

    const imageCountText = collectStatus !== null ? (
        collectStatus.imageCount === 1 && collectStatus.imageInDiffIdCount === 0 ? 
            "已下载"
        : collectStatus.imageCount > 1 && collectStatus.imageInDiffIdCount === 0 ?
            `已下载(${collectStatus.imageCount}项)`
        : collectStatus.imageCount > 0 && collectStatus.imageInDiffIdCount > 0 ?
            `已下载(${collectStatus.imageCount}项，其他位置(${collectStatus.imageInDiffIdCount}项)`
        : collectStatus.imageCount === 0 && collectStatus.imageInDiffIdCount > 0 ?
            `已下载(其他位置${collectStatus.imageInDiffIdCount}项)`
        : "未下载"
    ) : "未加载"

    return <CollectStatusNoticeDiv $imageStatus={collectStatus !== null && (collectStatus.imageCount > 0 || collectStatus.imageInDiffIdCount > 0)}>
        <span>图像</span> <div>{imageCountText}</div>
    </CollectStatusNoticeDiv>
})

const DownloadButton = memo(function DownloadButton(props: { index: number | null, status: "DN" | "ING" | "OK", externalURL: string | undefined, downloadClick: () => void }) {
    const { index, status, externalURL, downloadClick } = props
    
    const prevent = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.stopPropagation()
    }

    return externalURL ? <DoubleFlipAnchor className="download-button" $style={config.locale} href={externalURL} target="_blank" onClick={prevent}>
        {
            status === "DN" ? <FormattedText><Icon icon="square-arrow-up-right"/></FormattedText>
            : status === "ING" ? <FormattedText><Icon icon="circle-notch" spin/></FormattedText>
            : <FormattedText color="success"><Icon icon="check"/></FormattedText>
        }
        {index !== null && <b>{index}</b>}
    </DoubleFlipAnchor> : <DoubleFlipButton className="download-button" $style={config.locale} onClick={downloadClick}>
        {
            status === "DN" ? <FormattedText><Icon icon="download"/></FormattedText>
            : status === "ING" ? <FormattedText><Icon icon="circle-notch" spin/></FormattedText>
            : <FormattedText color="success"><Icon icon="check"/></FormattedText>
        }
        {index !== null && <b>{index}</b>}
    </DoubleFlipButton>
})

const DownloadMenuButton = memo(function DownloadMenuButton(props: { status: "DN" | "ING" | "OK", externalURL: string | undefined, downloadClick: () => void }) {
    const { status, externalURL, downloadClick } = props

    const click = externalURL ? () => { window.open(externalURL, "_blank") } : downloadClick

    return <Button align="left" size="small" onClick={click}>
        {status === "DN" ? <Icon icon="download" mr={1}/>
        : status === "ING" ? <Icon icon="circle-notch" spin mr={1}/>
        : <FormattedText color="success"><Icon icon="check" mr={1}/></FormattedText>}
        {externalURL ? "打开外部链接" : "下载图像"}
    </Button>
})

const ROOT_STYLES: Record<LocaleSite, {style: string, relativeItem: boolean}> = {
    "pixiv": {style: "position: absolute; right: 0; top: 35px", relativeItem: true},
    "ehentai-image": {style: "position: absolute; right: 0; bottom: 35px", relativeItem: true},
    "ehentai-mpv": {style: "position: absolute; right: 0; bottom: 50px", relativeItem: true},
    "sankaku": {style: "position: absolute; right: 5px; top: 0", relativeItem: true},
    "fanbox": {style: "position: absolute; right: 0; top: 35px", relativeItem: false},
    "kemono": {style: "position: absolute; right: -10px; bottom: 4px; transform: translateX(100%)", relativeItem: true},
    "fantia": {style: "position: absolute; right: 0; bottom: 10px", relativeItem: false},
}

const ToolBarDiv = styled.div<{ $style?: LocaleSite }>`
    position: relative;
    display: flex;
    width: 70px;
    height: 30px;
    ${p => p.$style === "pixiv" || p.$style === "fanbox" || p.$style === "fantia" ? css`
        //pixiv, fanbox, fantia采用内嵌在图像内紧贴右侧的样式，因此左侧圆角右侧平直
        border-top-left-radius: 15px;
        border-bottom-left-radius: 15px;
        color: rgb(31, 31, 31);
        background-color: rgb(245, 245, 245);
        ${p.$style === "pixiv" && css`
            @media (prefers-color-scheme: dark) {
                color: rgb(245, 245, 245);
                background-color: rgb(0, 0, 0);
            }
        `}

        > .download-button {
            border-top-left-radius: 15px;
            border-bottom-left-radius: 15px;
        }

    ` : p.$style === "ehentai-image" || p.$style === "ehentai-mpv" ? css`
        //ehentai采用非内嵌图像，而是内嵌图像外圈的外框的样式。其样式上也是左侧圆角右侧平直
        border-top-left-radius: 15px;
        border-bottom-left-radius: 15px;
        color: #5C0D11;
        background-color: #E3E0D1;
        ${p.$style === "ehentai-image" && css`
            //ehentai image 页面外框有边框，因此配合设置了有边框的工具条样式
            border: 1px solid #5C0D12;
            border-right: none;
        `}

        > .download-button {
            border-top-left-radius: 15px;
            border-bottom-left-radius: 15px;
        }

    ` : p.$style === "sankaku" ? css`
        //sankaku采用悬浮在图像行右侧的样式。样式上是圆角矩形
        background: #FAFAFA;
        border: 2px solid #DDD;
        text-align: center;
        border-radius: 10px;
        color: #FF761C;

        > .download-button {
            border-top-left-radius: 10px;
            border-bottom-left-radius: 10px;
        }

        ` : p.$style === "kemono" ? css`
        //kemono采用在图像外贴近右侧的样式。为配合整体风格采用了无圆角矩形
        text-align: center;
        background: transparent;
        border: 1px solid hsl(0, 0%, 45%);
        color: hsl(0, 0%, 70%);

    ` : undefined}
`

const DoubleFlipCSS = css<{ $style?: LocaleSite }>`
    width: 45px;
    height: 100%;
    padding: 2px;
    box-sizing: border-box;
    background-color: transparent;

    &:hover {
        cursor: pointer;
        background-color: rgba(179, 179, 179, 25%);
        ${p => (p.$style === "pixiv" || p.$style === "fantia") && css`
            @media (prefers-color-scheme: dark) {
                background-color: rgba(255, 255, 255, 25%);
            }
        `}
    }
    
    display: flex;
    flex-wrap: nowrap;
    justify-content: center;
    align-items: center;
    gap: ${SPACINGS[1]};
    img {
        width: 100%;
        height: 100%;
    }
`

const DoubleFlipButton = styled.button<{ $style?: LocaleSite }>`
    ${DoubleFlipCSS}
`

const DoubleFlipAnchor = styled.a<{ $style?: LocaleSite }>`
    text-align: center;
    ${DoubleFlipCSS}
`

const EllipsisButton = styled.button<{ $style?: LocaleSite }>`
    width: 25px;
    height: 100%;
    padding: 2px;
    box-sizing: border-box;
    background-color: transparent;

    &:hover {
        background-color: rgba(179, 179, 179, 25%);
        ${p => (p.$style === "pixiv" || p.$style === "fantia") && css`
            @media (prefers-color-scheme: dark) {
                background-color: rgba(255, 255, 255, 25%);
            }
        `}
    }
`

const ToolBarPanelDiv = styled.div<{ $style?: LocaleSite }>`
    position: absolute;
    ${p => p.$style === "ehentai-image" ? css`
        bottom: -34px;
        right: 0;
    ` : p.$style === "ehentai-mpv" ? css`
        bottom: -24px;
        right: 0;
    ` : (p.$style === "kemono" || p.$style === "fanbox" || p.$style === "fantia" || p.$style === "pixiv") ? css`
        top: -4px;
        left: -4px;
    ` : p.$style === "sankaku" ? css`
        top: 34px;
        right: -2px;
    ` : undefined}
    padding: ${SPACINGS[2]};
    z-index: 101;
    width: max-content;
    display: flex;
    flex-direction: column;
    box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.1);
    border-radius: ${RADIUS_SIZES["large"]};
    border: solid 1px ${LIGHT_MODE_COLORS["border"]};
    background-color: ${LIGHT_MODE_COLORS["background"]};
    color: ${LIGHT_MODE_COLORS["text"]};
    @media (prefers-color-scheme: dark) {
        border-color: ${DARK_MODE_COLORS["border"]};
        background-color: ${DARK_MODE_COLORS["background"]};
        color: ${DARK_MODE_COLORS["text"]};
    }
`

const FaviconImg = styled.img`
    width: 12px;
    height: 12px;
    margin-right: 4px;
`

const CollectStatusNoticeDiv = styled.div<{ $imageStatus: boolean }>`
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
    
    ${p => p.$imageStatus && css`
        background-color: ${LIGHT_MODE_COLORS["success"]};
        color: ${LIGHT_MODE_COLORS["text-inverted"]};
        @media (prefers-color-scheme: dark) {
            background-color: ${DARK_MODE_COLORS["success"]};
            color: ${DARK_MODE_COLORS["text-inverted"]};
        }
    `}
`