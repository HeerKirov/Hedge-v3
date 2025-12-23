import { Result } from "@/utils/primitives"
import { SourceDataUpdateForm } from "@/functions/server/api-source-data"
import { SourceDataPath } from "@/functions/server/api-all"
import { BasicException, Response } from "@/functions/server"

//== 消息函数 ==

/**
 * tab: 接收一条消息。
 */
export function receiveMessageForTab(onMessage: <T extends ServiceSenderMessagesList>(msg: T, sender: chrome.runtime.MessageSender) => boolean) {
    chrome.runtime.onMessage.addListener(function(msg: any, sender: chrome.runtime.MessageSender, callback: (response?: any) => void) {
        const m = {type: msg.type, msg: msg.msg, callback}
        return onMessage(m, sender)
    })
}

/**
 * tab: 发送一条消息。
 */
export function sendMessage<T extends keyof ContentScriptMessages>(type: T, msg: ContentScriptMessages[T]["msg"]): T extends ContentScriptCallbackTypes ? Promise<Parameters<ContentScriptMessages[T]["callback"]>[0]> : void {
    return chrome.runtime.sendMessage({type, msg}) as any
}

//== 类型定义与导出的消息列表 ==

export type MsgTemplate<T extends string, B> = { type: T, msg: B, callback: undefined }

export type MsgTemplateWithCallback<T extends string, B, CB> = { type: T, msg: B, callback(r: CB): void }

export type ServiceSenderMessages = { [T in ServiceSenderMessagesList as T["type"]]: T }

export type ServiceSenderCallbackTypes = Extract<ServiceSenderMessagesList, MsgTemplateWithCallback<string, any, any>>["type"];

export type ContentScriptMessages = { [T in ContentScriptMessagesList as T["type"]]: T }

export type ContentScriptCallbackTypes = Extract<ContentScriptMessagesList, MsgTemplateWithCallback<string, any, any>>["type"];

//== 联合消息列表 ==

export type ServiceSenderMessagesList = ReportSourceData | ReportArtworksInfo | ReportPageInfo | QuickFindSimilar | DownloadAll

export type ContentScriptMessagesList = SubmitPageInfo | SubmitSourceData | GetSourceData | CollectSourceData | DownloadURL | CreateNotification | CaptureVisibleTab | FetchRequest

//== service worker发送至content script的消息类型定义 ==

type ReportSourceData = MsgTemplateWithCallback<"REPORT_SOURCE_DATA", undefined, Result<SourceDataUpdateForm, string>>

/**
 * 要求页面提交当前列表页的部分信息。
 */
type ReportArtworksInfo = MsgTemplateWithCallback<"REPORT_ARTWORKS_INFO", undefined, Result<{latestPost: string, firstPage: boolean}, string>>

/**
 * 要求页面提交当前详情页的部分信息。
 */
type ReportPageInfo = MsgTemplateWithCallback<"REPORT_PAGE_INFO", undefined, {path: SourceDataPath | null}>

type QuickFindSimilar = MsgTemplate<"QUICK_FIND_SIMILAR", undefined>

type DownloadAll = MsgTemplate<"DOWNLOAD_ALL", undefined>

//== content script发送至service worker的消息类型定义

/**
 * 向service worker提交当前页面的部分基本信息(主要是其path)，这些信息会被用于设置扩展中与当前页面相关的部分，如badge。
 */
type SubmitPageInfo = MsgTemplate<"SUBMIT_PAGE_INFO", {path: SourceDataPath}>

/**
 * 向来源数据管理模块提交当前页面所包含的source data & path信息。这些信息会被缓存用作后续其他用处。
 */
type SubmitSourceData = MsgTemplateWithCallback<"SUBMIT_SOURCE_DATA", {path: SourceDataPath, data: Result<SourceDataUpdateForm, string>}, void>

/**
 * 向来源数据管理模块请求指定的source data。
 */
type GetSourceData = MsgTemplateWithCallback<"GET_SOURCE_DATA", {sourceSite: string, sourceId: string}, Result<SourceDataUpdateForm, string>>

/**
 * 向来源数据管理模块要求上传指定source data到服务器。
 */
type CollectSourceData = MsgTemplateWithCallback<"COLLECT_SOURCE_DATA", {sourceSite: string, sourceId: string}, boolean>

/**
 * 向下载管理模块发出一个下载请求。在指定sourcePath后，它将按照下载工具的流程处理，使用来源信息重命名。否则，走重命名建议模块。
 */
type DownloadURL = MsgTemplate<"DOWNLOAD_URL", {url: string, sourcePath?: SourceDataPath, collectSourceData?: boolean}>

/**
 * 向通知模块发出一个通知。
 */
type CreateNotification = MsgTemplate<"NOTIFICATION", {notificationId?: string, title: string, message: string, buttons?: [{title: string}]}>

/**
 * 要求对当前页面进行截屏，获得截屏的dataURL。
 */
type CaptureVisibleTab = MsgTemplateWithCallback<"CAPTURE_VISIBLE_TAB", undefined, string>

/**
 * 向service worker的server模块提交一个server网络请求。它不应该被调用，仅用作server的内部实现。
 */
type FetchRequest = MsgTemplateWithCallback<"FETCH_REQUEST", {url: string, method?: any, query?: {[name: string]: any}, data?: any}, Response<unknown, BasicException>>
