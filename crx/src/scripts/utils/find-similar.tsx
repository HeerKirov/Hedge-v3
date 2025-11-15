import React, { SyntheticEvent, useCallback, useEffect, useRef, useState } from "react"
import ReactDOM from "react-dom/client"
import { css, styled, StyleSheetManager } from "styled-components"
import {
    AspectGrid, Button, FormattedText, Icon, Separator, LayouttedDiv,
    PartitionTimeDisplay, FileInfoDisplay, SourceInfo, ThumbnailImage
} from "@/components"
import { server } from "@/functions/server"
import { sendMessage } from "@/functions/messages"
import { SimpleAuthor, SimpleTopic, SourceDataPath } from "@/functions/server/api-all"
import { DetailIllust } from "@/functions/server/api-illust"
import { SourceDataUpdateForm } from "@/functions/server/api-source-data"
import { FindSimilarResultDetailImage } from "@/functions/server/api-find-similar"
import { createEventTrigger, EventTrigger } from "@/utils/emitter"
import { files, Result } from "@/utils/primitives"
import { nativeApp } from "@/utils/document"
import { DARK_MODE_COLORS, GlobalStyle, LIGHT_MODE_COLORS, SPACINGS, ThemeColors } from "@/styles"
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
                ? <QuickFindComplete dataURL={dataURL} findId={result.id} images={result.images} tags={tags} onClose={close}/>
            : null
        }
    </>)
}

function QuickFindCapture(props: {src: string, onCompleted: (dataURL: string) => void}) {
    const [size, setSize] = useState<{width: number, height: number}>()
    const imgRef = useRef<HTMLImageElement | null>(null)

    const onLoad = size !== undefined ? undefined : (e: SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget
        if(img.width > window.innerWidth * 0.8 || img.height > window.innerHeight * 0.8) {
            const rate = Math.min(window.innerWidth * 0.8 / img.width, window.innerHeight * 0.8 / img.height)
            setSize({width: img.width * rate, height: img.height * rate})
        }else{
            setSize({width: img.width, height: img.height})
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
            <div>
                <LayouttedDiv bold size="large">快速查找</LayouttedDiv>
                <div><Icon icon="tags" mr={1}/>{props.tags.map(t => <FormattedText key={t.metaTag.id} mr={1} bold color={t.metaTag.color as ThemeColors}>{t.metaTag.name}</FormattedText>)}</div>
            </div>
            <Separator/>
            <LoadingScrollDiv>{description}</LoadingScrollDiv>
            <Separator/>
            <BottomButtonBarDiv>
                <Button mode="filled" type="primary" disabled><Icon icon="calendar-alt" mr={1}/>在时间分区中显示</Button>
                <Button mode="filled" type="primary" disabled><Icon icon="up-right-from-square" mr={1}/>在Hedge App中打开</Button>
            </BottomButtonBarDiv>
        </div>
        <LayouttedDiv border radius="std" backgroundColor="block" padding={2}>
            <img src={props.dataURL} alt="sample image"/>
        </LayouttedDiv>
    </DialogDiv>
}

function QuickFindComplete(props: { dataURL: string, findId: number, images: FindSimilarResultDetailImage[], tags: ({ metaType: "AUTHOR", metaTag: SimpleAuthor } | { metaType: "TOPIC", metaTag: SimpleTopic })[], onClose: () => void }) {
    const [selected, setSelected] = useState<FindSimilarResultDetailImage | null>(null)

    const openInApp = useCallback(() => {
        nativeApp.newTab("QuickFindDetail", {
            path: props.findId!
        })
        props.onClose()
    }, [props.findId, props.onClose])

    const openInAppPartition = () => {
        nativeApp.newTab("PartitionDetail", {
            path: selected!.partitionTime,
            initializer: {locateId: selected!.id}
        })
        props.onClose()
    }

    return <DialogDiv border padding={1} radius="std" backgroundColor="background">
        <div>
            <div>
                <div><FormattedText bold size="large">快速查找</FormattedText><FormattedText ml={1} size="std">共{props.images.length}项</FormattedText></div>
                <div><Icon icon="tags" mr={1}/>{props.tags.map(t => <FormattedText key={t.metaTag.id} mr={1} bold color={t.metaTag.color as ThemeColors}>{t.metaTag.name}</FormattedText>)}</div>
            </div>
            <Separator/>
            <ScrollDiv>
                <SelectableGrid images={props.images} selected={selected} onUpdateSelected={setSelected}/>
            </ScrollDiv>
            <Separator/>
            <BottomButtonBarDiv>
                <Button mode="filled" type="primary" disabled={selected === null} onClick={openInAppPartition}><Icon icon="calendar-alt" mr={1}/>在时间分区中显示</Button>
                <Button mode="filled" type="primary" disabled={props.images.length <= 0} onClick={openInApp}><Icon icon="up-right-from-square" mr={1}/>在Hedge App中打开</Button>
            </BottomButtonBarDiv>
        </div>
        <DetailPane image={selected} originDataURL={props.dataURL}/>
    </DialogDiv>
}

function SelectableGrid(props: {images: FindSimilarResultDetailImage[], selected: FindSimilarResultDetailImage | null, onUpdateSelected: (item: FindSimilarResultDetailImage) => void}) {
    return <AspectGrid spacing={1} columnNum={8} items={props.images} children={(item) => <>
        <SelectableGridImg filepath={item.filePath.sample} alt={`${item.id}`} onClick={() => props.onUpdateSelected(item)}/>
        {item === props.selected && <SelectedBorder/>}
    </>}/>
}

function SelectableGridImg(props: {filepath: string, alt: string, onClick: () => void}) {
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

    return <img src={dataURL} alt={props.alt} onClick={props.onClick}/>
}

function DetailPane(props: {image: FindSimilarResultDetailImage | null, originDataURL: string}) {
    const [dataURL, setDataURL] = useState<string>()

    const [detail, setDetail] = useState<DetailIllust | null>(null)

    useEffect(() => {
        if(props.image !== null) {
            server.illust.get(props.image.id)
                .then(res => res.ok ? res.data : null)
                .then(d => setDetail(d))
            server.app.archiveFiles(props.image.filePath.thumbnail)
                .then(res => res.ok ? res.data : null)
                .then(d => setDataURL(d ?? ""))
        }else if(detail !== null) {
            setDetail(null)
        }

    }, [props.image])

    return <DetailPaneDiv border radius="std" backgroundColor="block" padding={2}>
        {dataURL === undefined && detail === null && <img src={props.originDataURL} alt="sample image"/>}
        {dataURL !== undefined && <ThumbnailImage file={dataURL} alt="sample image"/>}
        {detail !== null && <>
            <LayouttedDiv mt={2} mb={1}>
                <Icon icon="id-card" mr={1}/><b>{detail.id}</b>
            </LayouttedDiv>
            <Separator/>
            <LayouttedDiv mt={1}>
                <SourceInfo source={detail.source}/>
            </LayouttedDiv>
            <LayouttedDiv mt={1}>
                <FileInfoDisplay mode="inline" extension={detail.extension} fileSize={detail.size} resolutionWidth={detail.resolutionWidth} resolutionHeight={detail.resolutionHeight} videoDuration={detail.videoDuration}/>
            </LayouttedDiv>
            <LayouttedDiv mt={1}>
                <PartitionTimeDisplay partitionTime={detail.partitionTime} orderTime={detail.orderTime}/>
            </LayouttedDiv>
        </>}
    </DetailPaneDiv>
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
    @media screen and (min-width: 1400px) {
        width: 1120px;
    }
    height: 60vh;
    transform: translate(-50%, -50%);
    display: flex;
    flex-wrap: nowrap;
    gap: ${SPACINGS[1]};
    > div:first-child {
        width: 60%;
        @media screen and (min-width: 1400px) {
            width: 100%;
        }
        display: flex;
        flex-direction: column;
        > div:first-child {
            display: flex;
            flex-wrap: nowrap;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: ${SPACINGS[1]};
            margin-bottom: ${SPACINGS[1]};
        }
    }
    > div:last-child {
        width: 40%;
        @media screen and (min-width: 1400px) {
            width: 443px;
            flex-shrink: 0;
        }
        > img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
    }
`

const DetailPaneDiv = styled(LayouttedDiv)`
    overflow-y: auto;
    height: 100%;
`

const ScrollDiv = styled.div`
    overflow-y: auto;
    min-height: 30px;
    height: 100%;
    margin-top: ${SPACINGS[1]};
`

const LoadingScrollDiv = styled.div`
    min-height: 30px;
    height: 100%;
    margin-top: ${SPACINGS[1]};
    text-align: center;
`

const BottomButtonBarDiv = styled.div`
    margin-top: ${SPACINGS[1]};
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: ${SPACINGS[1]};
`

const SelectedBorder = styled.div`
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    right: 0;
    border: solid 3px ${LIGHT_MODE_COLORS["primary"]};
    @media (prefers-color-scheme: dark) {
        border-color: ${DARK_MODE_COLORS["primary"]};
        border-width: 2px;
    }

    > div {
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        border: solid 1px white;
        @media (prefers-color-scheme: dark) {
            border-color: black;
        }
    }
`