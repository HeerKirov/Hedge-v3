import { memo, useCallback } from "react"
import styled, { css } from "styled-components"
import { Button, FormattedText, Icon, Separator } from "@/components/universal"
import { DownloadItem, useDownloadList } from "@/hooks/download"
import { Setting } from "@/functions/setting"
import { numbers } from "@/utils/primitives"
import { useAsyncLoading } from "@/utils/reactivity"
import { DARK_MODE_COLORS, LIGHT_MODE_COLORS, RADIUS_SIZES, SPACINGS } from "@/styles"

export const DownloadPanel = memo(function DownloadPanel(props: {setting: Setting["extension"]["downloadManager"]}) {
    const { downloadList, count, clear } = useDownloadList(props.setting)

    return <RootDiv>
        <ToolBar inProgressCount={count.inProgressCount} interruptedCount={count.interruptedCount} clear={clear}/>
        <DownloadItemList downloadList={downloadList}/>
    </RootDiv>
})

const ToolBar = memo(function ToolBar({ inProgressCount, interruptedCount, clear }: { inProgressCount: number, interruptedCount: number, clear: () => void }) {
    const showDefaultFolder = useCallback(() => chrome.downloads.showDefaultFolder(), [])

    return <ToolBarDiv>
        <FormattedText lineHeight="std" bold ml={2}>下载</FormattedText>
        {inProgressCount > 0 && <FormattedText ml={2} size="small" color="info"><Icon icon="download" fade/> {inProgressCount}</FormattedText>}
        {interruptedCount > 0 && <FormattedText ml={2} size="small" color="danger"><Icon icon="warning"/> {interruptedCount}</FormattedText>}
        <div className="spacer"/>
        <Button square onClick={clear}><Icon icon="trash"/></Button>
        <Separator direction="vertical" spacing={1}/>
        <Button square onClick={showDefaultFolder}><Icon icon="folder-open"/></Button>
    </ToolBarDiv>
})

const DownloadItemList = memo(function DownloadItemList({ downloadList }: { downloadList: DownloadItem[] }) {
    return <DownloadListdiv>
        {downloadList.map(item => <DownloadItemComponent key={item.id} item={item}/>)}
    </DownloadListdiv>
})

const DownloadItemComponent = memo(function DownloadItemComponent({ item }: { item: DownloadItem }) {
    const [icon] = useAsyncLoading(async () => {
        try {
            return await chrome.downloads.getFileIcon(item.id)
        } catch (error) {
            console.warn(`getFileIcon ${item.id} failed.`, error)
        }
    })

    const resume = useCallback(() => chrome.downloads.resume(item.id), [item.id])

    const pause = useCallback(() => chrome.downloads.pause(item.id), [item.id])

    const cancel = useCallback(() => chrome.downloads.cancel(item.id), [item.id])

    const erase = useCallback(() => chrome.downloads.erase({id: item.id}), [item.id])

    const openFile = useCallback(() => chrome.downloads.open(item.id), [item.id])

    const openInFolder = useCallback(() => chrome.downloads.show(item.id), [item.id])

    const progress = item.state === "in_progress" && item.totalBytes !== undefined ? Math.round(item.bytesReceived / item.totalBytes * 10000) / 100 : 0

    return <DownloadItemDiv $progress={progress} $deleted={item.state === "cancelled" || (item.state === "complete" && !item.exists)}>
        <div className="content">
            <img className="file-icon" src={icon ?? undefined}/>
            <div className="info">
                <p className="filename">{item.filename}</p>
                {item.state === "in_progress" ? 
                    <FormattedText size="small" color="secondary">
                        {numbers.toBytesDisplay(item.bytesReceived)} / {item.totalBytes !== undefined ? numbers.toBytesDisplay(item.totalBytes) : "未知大小"}
                        {item.paused ? " - 已暂停" : ""}
                    </FormattedText>
                : item.state === "danger" ? 
                    <FormattedText size="small" color="warning">下载已被阻止</FormattedText>
                : item.state === "interrupted" ? 
                    <FormattedText size="small" color="danger">{INTERRUPTED_REASONS[item.error] ?? item.error}</FormattedText>
                : item.state === "cancelled" ? 
                    <FormattedText size="small" color="secondary">{INTERRUPTED_REASONS[item.error] ?? item.error}</FormattedText> 
                : 
                    <FormattedText size="small" color="secondary">
                        {item.totalBytes !== undefined ? numbers.toBytesDisplay(item.totalBytes) : ""}
                        {item.exists ? "" : " - 已删除"}
                    </FormattedText>
                }
            </div>
            {item.state === "in_progress" ? <>
                {item.paused ? <Button square onClick={resume}><Icon icon="play"/></Button> : <Button square onClick={pause}><Icon icon="pause"/></Button>}
                <Button square onClick={cancel}><Icon icon="stop"/></Button>
            </> : item.state === "danger" ? <>
                <Button square onClick={erase}><Icon icon="close"/></Button>
            </> : item.state === "interrupted" ? <>
                <Button square disabled={!item.canResume} onClick={resume}><Icon icon="play"/></Button>
                <Button square onClick={erase}><Icon icon="close"/></Button>
            </> : item.state === "cancelled" ? <>
                <Button className="hidden-able" square onClick={erase}><Icon icon="close"/></Button>
            </> : <>
                <Button className="hidden-able" square disabled={!item.exists} onClick={openFile}><Icon icon="file"/></Button>
                <Button className="hidden-able" square disabled={!item.exists} onClick={openInFolder}><Icon icon="folder-open"/></Button>
                <Button className="hidden-able" square onClick={erase}><Icon icon="close"/></Button>
            </>}
        </div>
        {item.state === "in_progress" && <div className="progress"/>}
    </DownloadItemDiv>
})

const INTERRUPTED_REASONS: Record<`${chrome.downloads.InterruptReason}`, string | undefined> = {
    [`${chrome.downloads.InterruptReason.CRASH}`]: "下载已崩溃",
    [`${chrome.downloads.InterruptReason.USER_CANCELED}`]: "下载已取消",
    [`${chrome.downloads.InterruptReason.USER_SHUTDOWN}`]: "下载已关闭",
    [`${chrome.downloads.InterruptReason.NETWORK_FAILED}`]: "连接失败",
    [`${chrome.downloads.InterruptReason.NETWORK_TIMEOUT}`]: "连接超时",
    [`${chrome.downloads.InterruptReason.NETWORK_DISCONNECTED}`]: "连接断开",
    [`${chrome.downloads.InterruptReason.NETWORK_SERVER_DOWN}`]: "服务器宕机",
    [`${chrome.downloads.InterruptReason.NETWORK_INVALID_REQUEST}`]: "请求无效",
    [`${chrome.downloads.InterruptReason.FILE_HASH_MISMATCH}`]: "文件哈希不匹配",
    [`${chrome.downloads.InterruptReason.FILE_SAME_AS_SOURCE}`]: "文件与源文件相同",
    [`${chrome.downloads.InterruptReason.FILE_FAILED}`]: "文件下载失败",
    [`${chrome.downloads.InterruptReason.FILE_ACCESS_DENIED}`]: "磁盘读写权限不足",
    [`${chrome.downloads.InterruptReason.FILE_NO_SPACE}`]: "磁盘空间不足",
    [`${chrome.downloads.InterruptReason.FILE_NAME_TOO_LONG}`]: "文件名太长",
    [`${chrome.downloads.InterruptReason.FILE_VIRUS_INFECTED}`]: "文件病毒感染",
    [`${chrome.downloads.InterruptReason.FILE_TRANSIENT_ERROR}`]: "文件传输错误",
    [`${chrome.downloads.InterruptReason.FILE_BLOCKED}`]: "文件被阻止",
    [`${chrome.downloads.InterruptReason.FILE_SECURITY_CHECK_FAILED}`]: "文件安全检查失败",
    [`${chrome.downloads.InterruptReason.FILE_TOO_LARGE}`]: "文件太大",
    [`${chrome.downloads.InterruptReason.FILE_TOO_SHORT}`]: "文件太小",
    [`${chrome.downloads.InterruptReason.SERVER_FAILED}`]: "服务器下载失败",
    [`${chrome.downloads.InterruptReason.SERVER_NO_RANGE}`]: "服务器不支持范围请求",
    [`${chrome.downloads.InterruptReason.SERVER_BAD_CONTENT}`]: "服务器内容不匹配",
    [`${chrome.downloads.InterruptReason.SERVER_UNAUTHORIZED}`]: "服务器未授权",
    [`${chrome.downloads.InterruptReason.SERVER_FORBIDDEN}`]: "服务器拒绝访问",
    [`${chrome.downloads.InterruptReason.SERVER_CERT_PROBLEM}`]: "服务器证书问题",
    [`${chrome.downloads.InterruptReason.SERVER_UNREACHABLE}`]: "服务器不可达",
    [`${chrome.downloads.InterruptReason.SERVER_CONTENT_LENGTH_MISMATCH}`]: "服务器内容长度不匹配",
    [`${chrome.downloads.InterruptReason.SERVER_CROSS_ORIGIN_REDIRECT}`]: "服务器跨域重定向",
}

const RootDiv = styled.div`
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    height: 100%;
    min-height: 0;
    border: solid 1px ${LIGHT_MODE_COLORS["border"]};
    border-radius: ${RADIUS_SIZES["std"]};
    @media (prefers-color-scheme: dark) {
        border-color: ${DARK_MODE_COLORS["border"]};
    }
`

const ToolBarDiv = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex: 0 0 auto;
    padding: ${SPACINGS[1]};
    border-bottom: solid 1px ${LIGHT_MODE_COLORS["border"]};
    @media (prefers-color-scheme: dark) {
        border-bottom-color: ${DARK_MODE_COLORS["border"]};
    }
    > .spacer {
        width: 100%;
    }
    > :not(.spacer) {
        flex: 0 0 auto;
    }
`

const DownloadListdiv = styled.div`
    flex: 1;
    min-height: 0;
    padding: ${SPACINGS[1]};
    overflow-y: auto;
`

const DownloadItemDiv = styled.div<{ $progress: number, $deleted: boolean }>`
    position: relative;
    overflow: hidden;
    border-radius: ${RADIUS_SIZES["std"]};
    height: 3.5rem;
    
    &:hover {
        background-color: rgba(45, 50, 55, 0.09);
    }
    &:not(:hover) > .content .hidden-able {
        visibility: hidden;
    }

    > .progress {
        position: absolute;
        bottom: 0;
        left: 0;
        height: 0.25rem;
        width: ${p => p.$progress}%;
        transition: width 0.1s linear;
        background-color: ${LIGHT_MODE_COLORS["primary"]};
        border-radius: ${RADIUS_SIZES["std"]};
        @media (prefers-color-scheme: dark) {
            background-color: ${DARK_MODE_COLORS["primary"]};
        }
    }
    
    > .content {
        display: flex;
        padding: ${SPACINGS[1]};

        > .file-icon {
            flex: 0 0 auto;
            width: 1.25rem;
            height: 1.25rem;
            margin: ${SPACINGS[1]} ${SPACINGS[1]} 0 0;
        }
        > .info {
            flex: 1 1 auto;
            margin: ${SPACINGS[0.5]} 0 ${SPACINGS[1]} 0;
            width: 100%;
            > .filename {
                line-height: 1.5rem;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                ${p => p.$deleted && css`text-decoration: line-through;`}
            }
        }
    }
`
