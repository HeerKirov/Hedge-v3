import React, { useMemo } from "react"
import ReactDOM from "react-dom/client"
import { css, styled, StyleSheetManager } from "styled-components"
import { Icon, LayouttedDiv } from "@/components"
import { SourceDataPath } from "@/functions/server/api-all"
import { sendMessage } from "@/functions/messages"
import { GlobalStyle } from "@/styles"
import { fontAwesomeCSS } from "@/styles/fontawesome"

export const imageToolbar = {
    locale(site: LocaleSite) {
        locale = site
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

            if(locale === "pixiv") {
                rootElement.setAttribute("style", "position: absolute; right: 0; top: 35px")
                item.element.style.position = "relative"
            }else if(locale === "ehentai-image" ) {
                rootElement.setAttribute("style", "position: absolute; right: 0; bottom: 35px")
                item.element.style.position = "relative"
            }else if(locale === "ehentai-mpv") {
                rootElement.setAttribute("style", "position: absolute; right: 0; bottom: 50px")
                item.element.style.position = "relative"
            }else if(locale === "sankaku") {
                rootElement.setAttribute("style", "position: absolute; right: 5px; top: 0")
                item.element.style.position = "relative"
            }else if(locale === "fanbox") {
                rootElement.setAttribute("style", "position: absolute; right: 0; top: 35px")
            }else if(locale === "kemono") {
                rootElement.setAttribute("style", "position: absolute; right: -10px; bottom: 4px; transform: translateX(100%)")
                item.element.style.position = "relative"
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

type LocaleSite = "pixiv" | "ehentai-image" | "ehentai-mpv" | "sankaku" | "fanbox" | "kemono"

interface RegisterItem {
    index: number | null
    downloadURL: string | (() => string | undefined)
    sourcePath: SourceDataPath | null
    element: HTMLElement
}

let locale: LocaleSite | undefined

function ToolBar(props: Omit<RegisterItem, "element">) {
    const favicon = useMemo(() => props.index === null ? chrome.runtime.getURL("favicon.png") : null, [props.index === null])

    //TODO 添加防重放机制和点击后的图标变化

    const downloadClick = () => {
        const url = typeof props.downloadURL === "function" ? props.downloadURL() ?? "" : props.downloadURL
        const referrer = document.URL
        const sourcePath = props.sourcePath ?? undefined
        sendMessage("DOWNLOAD_URL", {url, referrer, sourcePath})
    }

    return <ToolBarDiv $style={locale}>
        <DoubleFlipButton $style={locale} onClick={downloadClick}>
            {favicon === null ? <b>{props.index}</b> : <LayouttedDiv padding={1}><img src={favicon} alt="favicon"/></LayouttedDiv>}
            <Icon icon="download"/>
        </DoubleFlipButton>
    </ToolBarDiv>
}

const ToolBarDiv = styled.div<{ $style?: LocaleSite }>`
    width: 60px;
    height: 30px;
    ${p => p.$style === "pixiv" || p.$style === "fanbox" ? css`
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
    ` : p.$style === "ehentai-image" || p.$style === "ehentai-mpv" ? css`
        border-top-left-radius: 15px;
        border-bottom-left-radius: 15px;
        color: #5C0D11;
        background-color: #E3E0D1;
        ${p.$style === "ehentai-image" && css`
            border: 1px solid #5C0D12;
            border-right: none;
        `}
    ` : p.$style === "sankaku" ? css`
        background: #FAFAFA;
        border: 2px solid #DDD;
        text-align: center;
        border-radius: 10px;
        color: #FF761C;
    ` : p.$style === "kemono" ? css`
        text-align: center;
        background: transparent;
        border: 1px solid hsl(0, 0%, 45%);
        color: hsl(0, 0%, 70%);
    ` : undefined}
`

const DoubleFlipButton = styled.button<{ $style?: LocaleSite }>`
    width: 100%;
    height: 100%;
    padding: 2px;
    box-sizing: border-box;
    background-color: transparent;
    
    ${p => p.$style === "pixiv" || p.$style === "fanbox" || p.$style === "ehentai-image" || p.$style === "ehentai-mpv" ? css`
        border-top-left-radius: 15px;
        border-bottom-left-radius: 15px;
    ` : p.$style === "sankaku" ? css`
        border-radius: 5px;
    ` : undefined}
    
    &:hover {
        cursor: pointer;
        background-color: rgba(179, 179, 179, 25%);
        ${p => p.$style === "pixiv" && css`
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
