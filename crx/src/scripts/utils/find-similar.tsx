import React, { SyntheticEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import ReactDOM from "react-dom/client"
import { css, styled, StyleSheetManager } from "styled-components"
import { Button, FormattedText, Icon, Separator, LayouttedDiv, ThumbnailImage } from "@/components/universal"
import { AspectGrid } from "@/components/layouts"
import { PartitionTimeDisplay, FileInfoDisplay, SourceInfo } from "@/components/content"
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
    quickFind(src: string | ThumbnailInfo | null | undefined, sourcePath: SourceDataPath, sourceData: Result<SourceDataUpdateForm, string>): void {
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

let messageChannel: EventTrigger<{src: string | ThumbnailInfo, sourcePath: SourceDataPath, sourceData: SourceDataUpdateForm}> | undefined

/**
 * 解析缩略图样式信息
 */
export interface ThumbnailInfo {
    url: string
    offsetX: number
    offsetY: number
    width: number
    height: number
    _isThumbnailInfo: true // 用于类型判断
}

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

export function QuickFindComponent({ channel }: {channel: EventTrigger<{src: string | ThumbnailInfo, sourcePath: SourceDataPath, sourceData: SourceDataUpdateForm}>}) {
    const [status, setStatus] = useState<"CLOSE" | "CAPTURE" | "LOADING" | "COMPLETE">("CLOSE")
    const [originData, setOriginData] = useState<{src: string | ThumbnailInfo, sourcePath: SourceDataPath, sourceData: SourceDataUpdateForm}>()
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
        const callback = async (originData: {src: string | ThumbnailInfo, sourcePath: SourceDataPath, sourceData: SourceDataUpdateForm}) => {
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

function QuickFindCapture(props: {src: string | ThumbnailInfo, onCompleted: (dataURL: string) => void}) {
    const [size, setSize] = useState<{width: number, height: number}>()
    const [imgNaturalSize, setImgNaturalSize] = useState<{width: number, height: number} | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)

    // 判断是否是 ThumbnailInfo
    const isThumbnailInfo = (src: string | ThumbnailInfo): src is ThumbnailInfo => {
        return typeof src === "object" && "_isThumbnailInfo" in src
    }

    const onLoad = size !== undefined ? undefined : (e: SyntheticEvent<HTMLImageElement>) => {
        const img = e.currentTarget
        setImgNaturalSize({width: img.naturalWidth, height: img.naturalHeight})
        
        if(isThumbnailInfo(props.src)) {
            // 如果是 ThumbnailInfo，使用裁剪区域的尺寸
            const cropWidth = props.src.width
            const cropHeight = props.src.height
            if(cropWidth > window.innerWidth * 0.8 || cropHeight > window.innerHeight * 0.8) {
                const rate = Math.min(window.innerWidth * 0.8 / cropWidth, window.innerHeight * 0.8 / cropHeight)
                setSize({width: cropWidth * rate, height: cropHeight * rate})
            } else {
                setSize({width: cropWidth, height: cropHeight})
            }
        }else if(img.width > window.innerWidth * 0.8 || img.height > window.innerHeight * 0.8) {
            const rate = Math.min(window.innerWidth * 0.8 / img.width, window.innerHeight * 0.8 / img.height)
            setSize({width: img.width * rate, height: img.height * rate})
        }else{
            setSize({width: img.width, height: img.height})
        }
    }

    function captureImage(dataURL: string, imgWidth: number, imgHeight: number, imgRect: DOMRect, cropInfo: ThumbnailInfo | null, imgNaturalSize: {width: number, height: number} | null): Promise<string> {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")!
        const tempImg = new Image()
        return new Promise(resolve => {
            tempImg.onload = () => {
                const rate = Math.min(tempImg.width / window.innerWidth, tempImg.height / window.innerHeight)
                
                if(cropInfo && imgNaturalSize) {
                    // 如果有裁剪信息，按照裁剪区域来裁剪
                    canvas.width = cropInfo.width
                    canvas.height = cropInfo.height
                    // imgRect 是裁剪区域在屏幕上的位置，需要转换为截图中的位置
                    // 裁剪区域正好在屏幕中央，所以直接使用 imgRect
                    ctx.drawImage(tempImg, imgRect.x * rate, imgRect.y * rate, imgRect.width * rate, imgRect.height * rate, 0, 0, cropInfo.width, cropInfo.height)
                } else {
                    // 普通图片，按原逻辑处理
                    canvas.height = imgHeight
                    canvas.width = imgWidth
                    ctx.drawImage(tempImg, imgRect.x * rate, imgRect.y * rate, imgRect.width * rate, imgRect.height * rate, 0, 0, imgWidth, imgHeight)
                }
                resolve(canvas.toDataURL("image/jpeg"))
            }
            tempImg.src = dataURL
        })
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            const element = containerRef.current
            const cropInfo = isThumbnailInfo(props.src) ? props.src : null
            if(size !== undefined && element !== null) {
                const elementWidth = element.clientWidth || size.width
                const elementHeight = element.clientHeight || size.height
                const elementRect = element.getBoundingClientRect()
                sendMessage("CAPTURE_VISIBLE_TAB", undefined)
                    .then(capture => captureImage(capture, elementWidth, elementHeight, elementRect, cropInfo, imgNaturalSize))
                    .then(dataURL => props.onCompleted(dataURL))
            }
        }, 100)
        return () => clearTimeout(timer)
    }, [size, props.src, imgNaturalSize])

    const imgSrc = isThumbnailInfo(props.src) ? props.src.url : props.src

    const imgSize = useMemo(() => {
        if(isThumbnailInfo(props.src) && size && imgNaturalSize) {
            // 使用包装器 div 来实现裁剪
            // 计算缩放比例（显示尺寸相对于裁剪区域尺寸的比例）
            const scaleX = size.width / props.src.width
            const scaleY = size.height / props.src.height
            
            // 完整图片的显示尺寸（按相同的缩放比例）
            const imgDisplayWidth = imgNaturalSize.width * scaleX
            const imgDisplayHeight = imgNaturalSize.height * scaleY
            
            // 计算图片的偏移量，让裁剪区域显示在容器中央
            // offsetX 是负值（如 -200px），表示背景图片向左移动了 200px
            // 我们需要让图片向左移动 offsetX * scale，这样裁剪区域就会在容器中
            const imgOffsetX = props.src.offsetX * scaleX
            const imgOffsetY = props.src.offsetY * scaleY
            
            return {
                width: imgDisplayWidth,
                height: imgDisplayHeight,
                offsetX: imgOffsetX,
                offsetY: imgOffsetY
            }
        }else{
            return size
        }
    }, [size, props.src, imgNaturalSize])

    return <CaptureWrapper ref={containerRef} $size={size}>
        <CaptureImg $size={imgSize} onLoad={onLoad} src={imgSrc}/>
    </CaptureWrapper>
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

const CaptureWrapper = styled.div<{ $size?: { width: number, height: number } }>`
    ${p => p.$size && css`
        width: ${p.$size.width}px;
        height: ${p.$size.height}px;
    `}
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    z-index: 1000;
    overflow: hidden;
    background-color: ${LIGHT_MODE_COLORS["background"]};
`

const CaptureImg = styled.img<{ $size?: {width: number, height: number, offsetX?: number, offsetY?: number} }>`
    ${p => p.$size !== undefined && css`
        width: ${p.$size.width}px; 
        height: ${p.$size.height}px;
        ${p.$size.offsetX !== undefined && p.$size.offsetY !== undefined && css`transform: translate(${p.$size.offsetX}px, ${p.$size.offsetY}px);`}
    `}
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