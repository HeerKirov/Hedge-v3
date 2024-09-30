import { styled } from "styled-components"
import { IconProp } from "@fortawesome/fontawesome-svg-core"
import { FormattedText, Icon, LayouttedDiv } from "@/components"
import { SourceDataPath } from "@/functions/server/api-all"
import { server } from "@/functions/server"
import { useEndpoint } from "@/hooks/server"
import { numbers } from "@/utils/primitives"

export interface FileInfoDisplayProps {
    extension?: string
    fileSize?: number
    resolutionWidth?: number
    resolutionHeight?: number
    videoDuration?: number
    mode?: "block" | "inline" | "simple"
}

export function FileInfoDisplay(props: FileInfoDisplayProps) {
    const EXTENSIONS: Record<string, {name: string, icon: IconProp}> = {
        "jpg": {name: "JPEG图像", icon: "image"},
        "jpeg": {name: "JPEG图像", icon: "image"},
        "png": {name: "PNG图像", icon: "image"},
        "gif": {name: "GIF动态图像", icon: "image"},
        "mp4": {name: "MP4视频", icon: "video"},
        "webm": {name: "WEBM视频", icon: "video"}
    }

    function isVideo(extension: string): boolean {
        return extension === "mp4" || extension === "webm"
    }

    if(props.mode === "simple") {
        return <span>
            {props.extension !== undefined && <>
                <Icon icon={EXTENSIONS[props.extension]?.icon ?? 'question'}/>
                {EXTENSIONS[props.extension]?.name ?? `未知类型${props.extension.toUpperCase()}`}
            </>}
        </span>
    }else if(props.mode === "inline") {
        return <span>
            {props.extension !== undefined && <span>
                <Icon mr={1} icon={EXTENSIONS[props.extension]?.icon ?? 'question'}/>
                {EXTENSIONS[props.extension]?.name ?? `未知类型${props.extension.toUpperCase()}`}
                {isVideo(props.extension) && props.videoDuration !== undefined && <FormattedText color="secondary">{numbers.toHourTimesDisplay(props.videoDuration)}</FormattedText>}
            </span>}
            {(props.resolutionWidth !== undefined || props.resolutionHeight !== undefined || props.fileSize !== undefined) && <FormattedText ml={2}>
                {(props.resolutionWidth !== undefined || props.resolutionHeight !== undefined) && <>
                    <Icon mr={1} icon="bullseye"/>
                    {props.resolutionWidth} x {props.resolutionHeight}
                </>}
                {props.fileSize !== undefined && <FormattedText color="secondary" ml={1}>({numbers.toBytesDisplay(props.fileSize)})</FormattedText>}
            </FormattedText>}
        </span>
    }else{
        return <div>
            {props.extension !== undefined && <p>
                <Icon mr={1} icon={EXTENSIONS[props.extension]?.icon ?? 'question'}/>
                {EXTENSIONS[props.extension]?.name ?? `未知类型${props.extension.toUpperCase()}`}
                {isVideo(props.extension) && props.videoDuration !== undefined && <FormattedText color="secondary">{numbers.toHourTimesDisplay(props.videoDuration)}</FormattedText>}
            </p>}
            {(props.resolutionWidth !== undefined || props.resolutionHeight !== undefined || props.fileSize !== undefined) && <LayouttedDiv mt={1}>
                {(props.resolutionWidth !== undefined || props.resolutionHeight !== undefined) && <>
                    <Icon mr={1} icon="bullseye"/>
                    {props.resolutionWidth} x {props.resolutionHeight}
                </>}
                {props.fileSize !== undefined && <FormattedText color="secondary" ml={1}>({numbers.toBytesDisplay(props.fileSize)})</FormattedText>}
            </LayouttedDiv>}
        </div>
    }
}

export function SourceInfo(props: {source: SourceDataPath | null}) {
    const { data: sites } = useEndpoint(server.setting.sites)

    const site = props.source != null ? sites?.find(s => s.name === props.source!.sourceSite) ?? null : null

    const siteTitle = site?.title ?? props.source?.sourceSite

    return props.source !== null ? <p>
        <Icon icon="pager" mr={1}/>
        <span>
            {siteTitle}
            <FormattedText bold ml={1}>{props.source.sourceId}</FormattedText>
            {props.source.sourcePart !== null && <FormattedText ml={1}>p{props.source.sourcePart}</FormattedText>}
            {props.source.sourcePartName !== null && <FormattedText color="secondary">/{props.source.sourcePartName}</FormattedText>}
        </span>
    </p> : <p>
        <FormattedText color="secondary">
            <Icon icon="pager" mr={1}/>
            无来源信息
        </FormattedText>
    </p>
}

export function PartitionTimeDisplay(props: {partitionTime: string, orderTime: string}) {
    const pt = new Date(props.partitionTime)
    const ot = new Date(props.orderTime)

    const ten = (i: number) => i >= 10 ? i : `0${i}`

    const dateText = `${pt.getFullYear()}年${pt.getMonth() + 1}月${pt.getDate()}日`

    const offset = Math.floor(((ot as any) - (pt as any)) / (1000 * 60 * 60 * 24))

    const timeText = `${ten(ot.getHours())}:${ten(ot.getMinutes())}:${ten(ot.getSeconds())}`

    const orderTimeText = `${ot.getFullYear()}年${ot.getMonth() + 1}月${ot.getDate()}日 ${timeText}`

    return <PartitionTimeDisplayDiv>
        <p>
            <Icon icon={offset !== null && offset <= 1 && offset >= -1 ? 'business-time' : 'clock'}/>
            <FormattedText ml={2} mr={1} bold>{dateText}</FormattedText>
            {(offset !== 0 && offset <= 1 && offset >= -1) && <FormattedText color="danger" mr={1}>({ offset > 0 ? '+' : '-' }{ offset > 0 ? offset : -offset })</FormattedText>}
            {(offset <= 1 && offset >= -1) && <span>{timeText}</span>}
        </p>
        {(offset > 1 || offset < -1) && <p>
            <Icon icon="business-time"/>
            <FormattedText ml={2} mr={1} size="small">{orderTimeText}</FormattedText>
        </p>}
    </PartitionTimeDisplayDiv>
}

const PartitionTimeDisplayDiv = styled.div`
    p > * {
        vertical-align: middle;
    }
`