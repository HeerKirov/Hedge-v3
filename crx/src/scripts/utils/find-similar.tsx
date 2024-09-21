import React, { useEffect, useState } from "react"
import ReactDOM from "react-dom/client"
import { styled, StyleSheetManager } from "styled-components"
import { AspectGrid, Button, FormattedText, Icon, LayouttedDiv } from "@/components"
import { server } from "@/functions/server"
import { Setting } from "@/functions/setting"
import { sendMessage } from "@/functions/messages"
import { SimpleAuthor, SimpleTopic, SourceDataPath } from "@/functions/server/api-all"
import { SourceDataUpdateForm } from "@/functions/server/api-source-data"
import { FindSimilarResultDetailImage } from "@/functions/server/api-find-similar"
import { createEventTrigger, EventTrigger } from "@/utils/emitter"
import { files, Result } from "@/utils/primitives"
import { GlobalStyle, SPACINGS, ThemeColors } from "@/styles"
import { fontAwesomeCSS } from "@/styles/fontawesome"

export interface QuickFindController {
    openQuickFindModal(setting: Setting, dataURL: string | undefined, sourcePath: SourceDataPath, sourceData: Result<SourceDataUpdateForm, string>): void
    getImageDataURL(origin: HTMLImageElement): Promise<string>
}

// eslint-disable-next-line react-refresh/only-export-components
export function initializeQuickFindUI(): QuickFindController {
    let initialized: boolean = false
    const trigger: EventTrigger<{dataURL: string, sourcePath: SourceDataPath, sourceData: SourceDataUpdateForm}> = createEventTrigger()

    function getImageDataURL(origin: HTMLImageElement): Promise<string> {
        const img = document.createElement("img")
        return new Promise<string>(resolve => {
            img.onload = () => {
                img.onload = null
                img.style.position = "fixed"
                img.style.left = "50%"
                img.style.top = "50%"
                img.style.transform = "translate(-50%, -50%)"
                img.style.zIndex = "1000"
                if(img.width > window.innerWidth * 0.8 || img.height > window.innerHeight * 0.8) {
                    const rate = Math.min(window.innerWidth * 0.8 / img.width, window.innerHeight * 0.8 / img.height)
                    img.style.width = `${img.width * rate}px`
                    img.style.height = `${img.height * rate}px`
                }
                document.body.appendChild(img)
                setTimeout(() => {
                    sendMessage("CAPTURE_VISIBLE_TAB", undefined)
                        .then(capture => captureImage(capture, img))
                        .then(resolve)
                        .finally(() => img.remove())
                }, 100)

            }
            img.src = origin.src
        })
    }

    function openQuickFindModal(setting: Setting, dataURL: string | undefined, sourcePath: SourceDataPath, sourceData: Result<SourceDataUpdateForm, string>) {
        if(!sourceData.ok) {
            chrome.notifications.create({
                type: "basic",
                iconUrl: "/public/favicon.png",
                title: "快速查找异常",
                message: `无法正确提取页面中的来源收集数据，因此快速查找过程被迫中止。`
            })
            console.error(`[openQuickFindModal] Failed to collect source data.`, sourceData.err)
            return
        }
        if(dataURL === undefined) {
            chrome.notifications.create({
                type: "basic",
                iconUrl: "/public/favicon.png",
                title: "快速查找异常",
                message: `没有提取到任何缩略图，因此快速查找过程被迫中止。`
            })
            return
        }
        if(!initialized) {
            createReactUI(setting.general.host)
            initialized = true
        }
        trigger.emit({dataURL, sourcePath, sourceData: sourceData.value})
    }

    function createReactUI(host: string) {
        const rootElement = document.createElement("div")
        rootElement.id = "hedge-inject-div"
        rootElement.style.position = "fixed"
        rootElement.style.zIndex = "1000"
        const shadowRoot = rootElement.attachShadow({ mode: "open" })
        document.body.appendChild(rootElement)
        const styleSlot = document.createElement("section")
        shadowRoot.appendChild(styleSlot)
        const body = document.createElement("div")
        body.id = "body"
        shadowRoot.appendChild(body)

        ReactDOM.createRoot(body).render(
            <React.StrictMode>
                <StyleSheetManager target={styleSlot}>
                    <style>{fontAwesomeCSS}</style>
                    <GlobalStyle/>
                    <QuickFindComponent host={host} trigger={trigger}/>
                </StyleSheetManager>
            </React.StrictMode>
        )
    }

    return {openQuickFindModal, getImageDataURL}
}

export function QuickFindComponent({ trigger }: {host: string, trigger: EventTrigger<{dataURL: string, sourcePath: SourceDataPath, sourceData: SourceDataUpdateForm}>}) {
    const [visible, setVisible] = useState(true)
    const [example, setExample] = useState<string>()
    const [tags, setTags] = useState<({ metaType: "AUTHOR", metaTag: SimpleAuthor } | { metaType: "TOPIC", metaTag: SimpleTopic })[]>([])
    const [findId, setFindId] = useState<number | null>(null)
    const [result, setResult] = useState<FindSimilarResultDetailImage[]>([])
    const [status, setStatus] = useState<"LOADING" | "SUCCEED" | "ERR_NO_CONDITION" | "ERR_FILE_REQUEST_FAILED">("LOADING")

    const openInApp = () => {
        window.open(`hedge://hedge/new-tab?routeName=QuickFindDetail&path=${encodeURIComponent(window.btoa(JSON.stringify(findId!)))}`)
    }

    const close = () => setVisible(false)

    useEffect(() => {
        if(findId !== null) {
            const callback = async () => {
                const res = await server.quickFind.get(findId)
                if(res.ok && res.data.succeed) {
                    setResult(res.data.result)
                    setStatus("SUCCEED")
                    clearInterval(timer)
                }
            }
            const timer = setInterval(callback, 500)
            return () => clearInterval(timer)
        }
    }, [findId])

    useEffect(() => {
        const callback = async ({ dataURL, sourcePath, sourceData }: {dataURL: string, sourcePath: SourceDataPath, sourceData: SourceDataUpdateForm}) => {
            setVisible(true)
            setTags([])
            setFindId(null)
            setResult([])
            setStatus("LOADING")
            setExample(dataURL)

            const tagResult = await Promise.all(sourceData.tags?.map(tag => server.sourceTagMapping.get({sourceSite: sourcePath.sourceSite, sourceTagType: tag.type, sourceTagCode: tag.code})) ?? [])
            const conditionTags = tagResult.map(r => r.ok ? r.data : []).flat(1).filter(r => r.metaType === "AUTHOR") as ({ metaType: "AUTHOR", metaTag: SimpleAuthor })[]

            setTags(conditionTags)
            if(conditionTags.length <= 0) {
                setStatus("ERR_NO_CONDITION")
                return
            }

            const authors = conditionTags.filter(r => r.metaType === "AUTHOR").map(r => r.metaTag.id)
            const res = await server.quickFind.upload({file: files.dataURLtoFile(dataURL, "tmp.jpg"), authors})
            if(res.ok) {
                setFindId(res.data.id)
            }
        }
        trigger.addEventListener(callback)
        return () => trigger.removeEventListener(callback)
    }, [trigger])

    const description
        = status === "LOADING" ? "正在执行查找……"
        : status === "SUCCEED" ? (result.length > 0 ? `查找已完成。找到${result.length}个近似项。` : "查找已完成，未找到任何近似项。")
        : status === "ERR_NO_CONDITION" ? "没有从当前页面提取到任何有效的标签，因此查找无法继续。"
        : "文件加载失败。"

    return (visible ? <>
        <BackgroundDiv onClick={close}/>
        <DialogDiv border padding={1} radius="std" backgroundColor="background">
            <div>
                <LayouttedDiv size="large" margin={[2, 0, 0, 0]} padding={[0, 0, 0, 1]}>快速查找</LayouttedDiv>
                <LayouttedDiv margin={[1, 0, 0, 0]} padding={[0, 0, 0, 1]}>{description}</LayouttedDiv>
                <LayouttedDiv padding={[0, 0, 0, 1]}>适用的标签: {tags.map(t => <FormattedText key={t.metaTag.id} mr={1} bold color={t.metaTag.color as ThemeColors}>{t.metaTag.name}</FormattedText>)}</LayouttedDiv>
                <ScrollDiv>
                    <AspectGrid spacing={1} columnNum={8} items={result} children={(item) => (<Img filepath={item.filePath.sample} alt={`${item.id}`}/>)}/>
                </ScrollDiv>
                <LayouttedDiv margin={[2, 0, 0, 0]} textAlign="right">
                    <Button mode="filled" type="primary" disabled={findId === null || status !== "SUCCEED" || result.length <= 0} onClick={openInApp}><Icon icon="up-right-from-square" mr={1}/>在Hedge App中打开</Button>
                </LayouttedDiv>
            </div>
            <div>
                <LayouttedDiv size="large" margin={[2, 0, 1, 0]}>参考图像</LayouttedDiv>
                <img src={example} alt=""/>
            </div>
        </DialogDiv>
    </> : undefined)
}

function Img(props: {filepath: string, alt: string}) {
    const [dataURL, setDataURL] = useState<string>()

    useEffect(() => {
        server.app.archiveFiles(props.filepath).then(res => {
            if(res.ok) {
                setDataURL(res.data)
            }else{
                setDataURL(props.filepath)
            }
        })
    }, [props.filepath])

    return <img src={dataURL} alt={props.alt}/>
}

function captureImage(dataURL: string, img: HTMLImageElement): Promise<string> {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")!
    const tempImg = new Image()
    return new Promise(resolve => {
        tempImg.onload = () => {
            const rate = Math.min(tempImg.width / window.innerWidth, tempImg.height / window.innerHeight)
            canvas.height = img.height
            canvas.width = img.width
            const rect = img.getBoundingClientRect()
            ctx.drawImage(tempImg, rect.x * rate, rect.y * rate, rect.width * rate, rect.height * rate, 0, 0, img.width, img.height)
            resolve(canvas.toDataURL("image/jpeg"))
        }
        tempImg.src = dataURL
    })
}

const BackgroundDiv = styled.div`
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 25%);
`

const DialogDiv = styled(LayouttedDiv)`
    position: fixed;
    left: 50%;
    top: 50%;
    width: 80vw;
    transform: translate(-50%, -50%);
    display: flex;
    flex-wrap: nowrap;
    gap: ${SPACINGS[1]};
    > div:first-child {
        width: 70%;
        display: flex;
        flex-direction: column;
    }
    > div:last-child {
        width: 30%;
        display: flex;
        flex-direction: column;
        > img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
    }
`

const ScrollDiv = styled.div`
    overflow-y: auto;
    max-height: 60vh;
    min-height: 30px;
    height: 100%;
    margin-top: ${SPACINGS[1]};
    padding: 0 ${SPACINGS[1]};
`
