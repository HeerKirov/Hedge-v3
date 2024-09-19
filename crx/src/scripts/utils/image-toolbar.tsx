import React, { useMemo } from "react"
import ReactDOM from "react-dom/client"
import { css, styled, StyleSheetManager } from "styled-components"
import { Icon, LayouttedDiv } from "@/components"
import { GlobalStyle } from "@/styles"
import { config as fontAwesomeConfig } from "@fortawesome/fontawesome-svg-core"
import fontAwesomeCSS from "@fortawesome/fontawesome-svg-core/styles.css?inline"

fontAwesomeConfig.autoAddCss = false

export const imageToolbar = {
    locale(site: LocaleSite) {
        locale = site
    },
    add(items: RegisterItem[]) {
        for(const item of items) {
            const rootElement = document.createElement("div")
            rootElement.id = `image-toolbar-${item.index}`
            if(locale === "pixiv") {
                rootElement.setAttribute("style", "position: absolute; right: 0; top: 35px")
            }else if(locale === "ehentai-image" ) {
                rootElement.setAttribute("style", "position: absolute; right: 0; bottom: 35px")
            }else if(locale === "ehentai-mpv") {
                rootElement.setAttribute("style", "position: absolute; right: 0; bottom: 50px")
            }else if(locale === "sankaku") {
                rootElement.setAttribute("style", "position: absolute; right: 5px; top: 0")
            }
            const shadowRoot = rootElement.attachShadow({ mode: "open" })

            const styleSlot = document.createElement("section")
            shadowRoot.appendChild(styleSlot)

            const body = document.createElement("div")
            body.id = "body"
            body.setAttribute("style", "background: none")
            shadowRoot.appendChild(body)

            item.element.style.position = "relative"
            item.element.appendChild(rootElement)

            ReactDOM.createRoot(body).render(
                <React.StrictMode>
                    <StyleSheetManager target={styleSlot}>
                        <style>{fontAwesomeCSS}</style>
                        <GlobalStyle/>
                        <ToolBar index={item.index} downloadURL={item.downloadURL}/>
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
    element: HTMLElement
}

let locale: LocaleSite | undefined

function ToolBar(props: {index: number | null, downloadURL: string | (() => string | undefined)}) {
    const favicon = useMemo(() => props.index === null ? chrome.runtime.getURL("favicon.png") : null, [props.index === null])
    return <ToolBarDiv $style={locale}>
        <DoubleFlipButton $style={locale}>
            {favicon === null ? <b>{props.index}</b> : <LayouttedDiv padding={1}><img src={favicon} alt="favicon"/></LayouttedDiv>}
            <Icon icon="download"/>
        </DoubleFlipButton>
    </ToolBarDiv>
}

const ToolBarDiv = styled.div<{ $style?: LocaleSite }>`
    ${p => p.$style === "pixiv" ? css`
        width: 60px;
        height: 30px;
        border-top-left-radius: 15px;
        border-bottom-left-radius: 15px;
        background-color: rgb(245, 245, 245);
        @media (prefers-color-scheme: dark) {
            background-color: rgb(0, 0, 0);
        }
    ` : p.$style === "ehentai-image" || p.$style === "ehentai-mpv" ? css`
        width: 60px;
        height: 30px;
        border-top-left-radius: 15px;
        border-bottom-left-radius: 15px;
        background-color: #E3E0D1;
        ${p.$style === "ehentai-image" && css`
            border: 1px solid #5C0D12;
            border-right: none;
        `}
    ` : p.$style === "sankaku" ? css`
        width: 60px;
        height: 30px;
        background: #FAFAFA;
        border: 2px solid #DDD;
        text-align: center;
        border-radius: 10px;
        color: #FF761C;
    ` : css`
    `}
`

const DoubleFlipButton = styled.button<{ $style?: LocaleSite }>`
    width: 100%;
    height: 100%;
    padding: 2px;
    box-sizing: border-box;
    background-color: transparent;
    
    ${p => p.$style === "pixiv" || p.$style === "ehentai-image" || p.$style === "ehentai-mpv" ? css`
        border-top-left-radius: 15px;
        border-bottom-left-radius: 15px;
    ` : p.$style === "sankaku" ? css`
        border-radius: 5px;
    ` : undefined}
    
    &:hover {
        cursor: pointer;
        background-color: rgba(179, 179, 179, 25%);
        @media (prefers-color-scheme: dark) {
            background-color: rgba(255, 255, 255, 25%);
        }
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
