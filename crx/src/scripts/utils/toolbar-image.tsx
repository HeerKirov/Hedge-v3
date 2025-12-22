import React, { useMemo, useState } from "react"
import ReactDOM from "react-dom/client"
import { css, styled, StyleSheetManager } from "styled-components"
import { FormattedText, Icon, LayouttedDiv } from "@/components/universal"
import { SourceDataPath } from "@/functions/server/api-all"
import { sendMessage } from "@/functions/messages"
import { GlobalStyle } from "@/styles"
import { fontAwesomeCSS } from "@/styles/fontawesome"

type LocaleSite = "pixiv" | "ehentai-image" | "ehentai-mpv" | "sankaku" | "fanbox" | "kemono" | "fantia"

interface RegisterItem {
    index: number | null
    downloadURL: string | (() => string | undefined)
    sourcePath: SourceDataPath | null
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
            const rootElement = document.createElement("div")
            item.element.appendChild(rootElement)
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
                        <ToolBar index={item.index} downloadURL={item.downloadURL} sourcePath={item.sourcePath}/>
                    </StyleSheetManager>
                </React.StrictMode>
            )
        }
    }
}

const config: ToolbarConfig = {locale: undefined, collectSourceData: true}

function ToolBar(props: Omit<RegisterItem, "element">) {
    const favicon = useMemo(() => props.index === null ? chrome.runtime.getURL("favicon.png") : null, [props.index === null])

    const [status, setStatus] = useState<"DN" | "ING" | "OK">("DN")

    const downloadClick = () => {
        if(status !== "ING") {
            const url = typeof props.downloadURL === "function" ? props.downloadURL() ?? "" : props.downloadURL
            const sourcePath = props.sourcePath ?? undefined
            sendMessage("DOWNLOAD_URL", {url, sourcePath, collectSourceData: config.collectSourceData})
            setStatus("ING")
            setTimeout(() => setStatus("OK"), 500)
        }
    }

    const prevent = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.stopPropagation()
    }

    return <ToolBarDiv $style={config.locale}>
        {config.locale === "fantia" ? <DoubleFlipAnchor $style={config.locale} href={props.downloadURL as string} target="_blank" onClick={prevent}>
            {favicon === null ? <b>{props.index}</b> : <LayouttedDiv padding={1}><img src={favicon} alt="favicon"/></LayouttedDiv>}
            {
                status === "DN" ? <FormattedText><Icon icon="square-arrow-up-right"/></FormattedText>
                : status === "ING" ? <FormattedText><Icon icon="circle-notch" spin/></FormattedText>
                : <FormattedText color="success"><Icon icon="check"/></FormattedText>
            }
        </DoubleFlipAnchor> : <DoubleFlipButton $style={config.locale} onClick={downloadClick}>
            {favicon === null ? <b>{props.index}</b> : <LayouttedDiv padding={1}><img src={favicon} alt="favicon"/></LayouttedDiv>}
            {
                status === "DN" ? <FormattedText><Icon icon="download"/></FormattedText>
                : status === "ING" ? <FormattedText><Icon icon="circle-notch" spin/></FormattedText>
                : <FormattedText color="success"><Icon icon="check"/></FormattedText>
            }
        </DoubleFlipButton>}
    </ToolBarDiv>
}

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
    width: 60px;
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

        > button, > a {
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

        > button, > a {
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

        > button, > a {
            border-radius: 10px;
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
    width: 100%;
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
    justify-content: space-between;
    align-items: center;
    > * {
        width: 50%;
    }
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
