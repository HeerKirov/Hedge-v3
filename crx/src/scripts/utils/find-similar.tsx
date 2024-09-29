import React, { SyntheticEvent, useCallback, useEffect, useRef, useState } from "react"
import ReactDOM from "react-dom/client"
import { css, styled, StyleSheetManager } from "styled-components"
import { AspectGrid, Button, FormattedText, Icon, LayouttedDiv } from "@/components"
import { server } from "@/functions/server"
import { sendMessage } from "@/functions/messages"
import { SimpleAuthor, SimpleTopic, SourceDataPath } from "@/functions/server/api-all"
import { SourceDataUpdateForm } from "@/functions/server/api-source-data"
import { FindSimilarResultDetailImage } from "@/functions/server/api-find-similar"
import { createEventTrigger, EventTrigger } from "@/utils/emitter"
import { files, Result } from "@/utils/primitives"
import { GlobalStyle, SPACINGS, ThemeColors } from "@/styles"
import { fontAwesomeCSS } from "@/styles/fontawesome"

export const similarFinder = {
    /**
     * 执行快速查找。将src的图像上传到后端服务器，并根据sourceData的来源数据映射限定查找范围，查找相似项。
     */
    quickFind(src: string | null | undefined, sourcePath: SourceDataPath, sourceData: Result<SourceDataUpdateForm, string>): void {
        if(!sourceData.ok) {
            sendMessage("NOTIFICATION", {
                title: "快速查找异常",
                message: `无法正确提取页面中的来源收集数据，因此快速查找过程被迫中止。`
            })
            console.error(`[openQuickFindModal] Failed to collect source data.`, sourceData.err)
            return
        }
        if(!src) {
            sendMessage("NOTIFICATION", {
                title: "快速查找异常",
                message: `没有提取到任何缩略图，因此快速查找过程被迫中止。`
            })
            return
        }
        if(messageChannel === undefined) {
            initializeUI()
        }
        messageChannel!.emit({src, sourcePath, sourceData: sourceData.value})
    }
}

let messageChannel: EventTrigger<{src: string, sourcePath: SourceDataPath, sourceData: SourceDataUpdateForm}> | undefined

/**
 * 初始化ReactUI。
 */
function initializeUI() {
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
                <QuickFindComponent channel={messageChannel = createEventTrigger()}/>
            </StyleSheetManager>
        </React.StrictMode>
    )
}

export function QuickFindComponent({ channel }: {channel: EventTrigger<{src: string, sourcePath: SourceDataPath, sourceData: SourceDataUpdateForm}>}) {
    const [status, setStatus] = useState<"CLOSE" | "CAPTURE" | "LOADING" | "COMPLETE">("CLOSE")
    const [originData, setOriginData] = useState<{src: string, sourcePath: SourceDataPath, sourceData: SourceDataUpdateForm}>()
    const [dataURL, setDataURL] = useState<string>()
    const [tags, setTags] = useState<({ metaType: "AUTHOR", metaTag: SimpleAuthor } | { metaType: "TOPIC", metaTag: SimpleTopic })[]>([])
    const [result, setResult] = useState<{id: number, images: FindSimilarResultDetailImage[]}>()

    const close = useCallback(() => {
        setStatus("CLOSE")
        setOriginData(undefined)
        setDataURL(undefined)
        setTags([])
        setResult(undefined)
    }, [])

    const completeCapture = useCallback((dataURL: string) => {
        setDataURL(dataURL)
        setStatus("LOADING")
    }, [])

    const completeLoading = useCallback((id: number, images: FindSimilarResultDetailImage[]) => {
        setResult({id, images})
        setStatus("COMPLETE")
    }, [])

    useEffect(() => {
        const callback = async (originData: {src: string, sourcePath: SourceDataPath, sourceData: SourceDataUpdateForm}) => {
            setOriginData(originData)
            setStatus("CAPTURE")
        }
        channel.addEventListener(callback)
        return () => channel.removeEventListener(callback)
    }, [channel])

    return (<>
        {status !== "CLOSE" && <BackgroundDiv onClick={close}/>}
        {
            status === "CAPTURE" && originData
                ? <QuickFindCapture src={originData.src} onCompleted={completeCapture}/>
            : status === "LOADING" && originData && dataURL
                ? <QuickFindLoading dataURL={dataURL} sourcePath={originData.sourcePath} sourceData={originData.sourceData} tags={tags} onUpdateTags={setTags} onCompleted={completeLoading}/>
            : status === "COMPLETE" && dataURL && result
                ? <QuickFindComplete dataURL={dataURL} findId={result.id} images={result.images} tags={tags}/>
            : null
        }
    </>)
}

function QuickFindCapture(props: {src: string, onCompleted: (dataURL: string) => void}) {
    const [size, setSize] = useState<{width: number, height: number}>()
    const imgRef = useRef<HTMLImageElement | null>(null)

    const onLoad = size !== undefined ? undefined : (e: SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget
        console.log("onLoad", img)
        if(img.width > window.innerWidth * 0.8 || img.height > window.innerHeight * 0.8) {
            const rate = Math.min(window.innerWidth * 0.8 / img.width, window.innerHeight * 0.8 / img.height)
            setSize({width: img.width * rate, height: img.height * rate})
        }
    }

    function captureImage(dataURL: string, imgWidth: number, imgHeight: number, imgRect: DOMRect): Promise<string> {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")!
        const tempImg = new Image()
        return new Promise(resolve => {
            tempImg.onload = () => {
                const rate = Math.min(tempImg.width / window.innerWidth, tempImg.height / window.innerHeight)
                canvas.height = imgHeight
                canvas.width = imgWidth
                ctx.drawImage(tempImg, imgRect.x * rate, imgRect.y * rate, imgRect.width * rate, imgRect.height * rate, 0, 0, imgWidth, imgHeight)
                resolve(canvas.toDataURL("image/jpeg"))
            }
            tempImg.src = dataURL
        })
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            if(size !== undefined && imgRef.current !== null) {
                const imgWidth = imgRef.current.width
                const imgHeight = imgRef.current.height
                const imgRect = imgRef.current.getBoundingClientRect()
                sendMessage("CAPTURE_VISIBLE_TAB", undefined)
                    .then(capture => captureImage(capture, imgWidth, imgHeight, imgRect))
                    .then(dataURL => props.onCompleted(dataURL))
            }
        }, 100)
        return () => clearTimeout(timer)
    }, [size])

    return <CaptureImg ref={imgRef} $size={size} onLoad={onLoad} src={props.src}/>
}

function QuickFindLoading(props: {dataURL: string, sourcePath: SourceDataPath, sourceData: SourceDataUpdateForm, tags: ({ metaType: "AUTHOR", metaTag: SimpleAuthor } | { metaType: "TOPIC", metaTag: SimpleTopic })[], onUpdateTags: (tags: ({ metaType: "AUTHOR", metaTag: SimpleAuthor } | { metaType: "TOPIC", metaTag: SimpleTopic })[]) => void, onCompleted: (id: number, images: FindSimilarResultDetailImage[]) => void}) {
    const [status, setStatus] = useState<"ERR_NO_CONDITION" | "LOADING_TAGS" | "LOADING_RESULT">("LOADING_TAGS")
    const [findId, setFindId] = useState<number | null>(null)

    useEffect(() => {
        Promise.all(props.sourceData.tags?.map(tag => server.sourceTagMapping.get({sourceSite: props.sourcePath.sourceSite, sourceTagType: tag.type, sourceTagCode: tag.code})) ?? [])
            .then(tagResult => tagResult.map(r => r.ok ? r.data : []).flat(1).filter(r => r.metaType === "AUTHOR") as ({ metaType: "AUTHOR", metaTag: SimpleAuthor })[])
            .then(conditionTags => {
                props.onUpdateTags(conditionTags)
                setStatus(conditionTags.length <= 0 ? "ERR_NO_CONDITION" : "LOADING_RESULT")
                return conditionTags
            })
            .then(conditionTags => conditionTags.filter(r => r.metaType === "AUTHOR").map(r => r.metaTag.id))
            .then(authors => authors.length > 0 ? server.quickFind.upload({file: files.dataURLtoFile(props.dataURL, "tmp.jpg"), authors}) : undefined)
            .then(result => {
                if(result?.ok) setFindId(result.data.id)
            })
    }, [props.sourcePath, props.sourceData])

    useEffect(() => {
        if(findId !== null) {
            const callback = async () => {
                const res = await server.quickFind.get(findId)
                if(res.ok && res.data.succeed) {
                    props.onCompleted(findId, res.data.result)
                    clearInterval(timer)
                }
            }
            const timer = setInterval(callback, 500)
            return () => clearInterval(timer)
        }
    }, [findId])

    const description = status === "LOADING_TAGS" ? "正在获取标签映射……" : status === "LOADING_RESULT" ? "正在获取查找结果……" : "没有从当前页面提取到任何有效的标签，因此查找无法继续。"

    return <DialogDiv border padding={1} radius="std" backgroundColor="background">
        <div>
            <LayouttedDiv size="large" margin={[2, 0, 0, 0]} padding={[0, 0, 0, 1]}>快速查找</LayouttedDiv>
            <LayouttedDiv margin={[1, 0, 0, 0]} padding={[0, 0, 0, 1]}>{description}</LayouttedDiv>
            <LayouttedDiv padding={[0, 0, 0, 1]}>适用的标签: {props.tags.map(t => <FormattedText key={t.metaTag.id} mr={1} bold color={t.metaTag.color as ThemeColors}>{t.metaTag.name}</FormattedText>)}</LayouttedDiv>
        </div>
        <div>
            <LayouttedDiv size="large" margin={[2, 0, 1, 0]}>参考图像</LayouttedDiv>
            <img src={props.dataURL} alt="example image"/>
        </div>
    </DialogDiv>
}

function QuickFindComplete(props: {dataURL: string, findId: number, images: FindSimilarResultDetailImage[], tags: ({ metaType: "AUTHOR", metaTag: SimpleAuthor } | { metaType: "TOPIC", metaTag: SimpleTopic })[]}) {

    const openInApp = () => {
        window.open(`hedge://hedge/new-tab?routeName=QuickFindDetail&path=${encodeURIComponent(window.btoa(JSON.stringify(props.findId!)))}`)
    }

    const description = props.images.length > 0 ? `查找已完成。找到${props.images.length}个近似项。` : "查找已完成，未找到任何近似项。"

    return <DialogDiv border padding={1} radius="std" backgroundColor="background">
        <div>
            <LayouttedDiv size="large" margin={[2, 0, 0, 0]} padding={[0, 0, 0, 1]}>快速查找</LayouttedDiv>
            <LayouttedDiv margin={[1, 0, 0, 0]} padding={[0, 0, 0, 1]}>{description}</LayouttedDiv>
            <LayouttedDiv padding={[0, 0, 0, 1]}>适用的标签: {props.tags.map(t => <FormattedText key={t.metaTag.id} mr={1} bold color={t.metaTag.color as ThemeColors}>{t.metaTag.name}</FormattedText>)}</LayouttedDiv>
            <ScrollDiv>
                <AspectGrid spacing={1} columnNum={8} items={props.images} children={(item) => (<Img filepath={item.filePath.sample} alt={`${item.id}`}/>)}/>
            </ScrollDiv>
            <LayouttedDiv margin={[2, 0, 0, 0]} textAlign="right">
                <Button mode="filled" type="primary" disabled={props.images.length <= 0} onClick={openInApp}><Icon icon="up-right-from-square" mr={1}/>在Hedge App中打开</Button>
            </LayouttedDiv>
        </div>
        <div>
            <LayouttedDiv size="large" margin={[2, 0, 1, 0]}>参考图像</LayouttedDiv>
            <img src={props.dataURL} alt="example image"/>
        </div>
    </DialogDiv>
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

const BackgroundDiv = styled.div`
    position: fixed;
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 25%);
`

const CaptureImg = styled.img<{ $size?: {width: number, height: number} }>`
    ${p => p.$size && css`
        width: ${p.$size.width}px;
        height: ${p.$size.height}px;
    `}
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000;
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
