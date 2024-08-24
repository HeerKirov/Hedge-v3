import { Result } from "@/utils/primitives"
import { SourceDataUpdateForm } from "@/functions/server/api-source-data"
import { IdResponse, SourceDataPath, SourceTagPath } from "./server/api-all"
import { SourceMappingTargetDetail } from "@/functions/server/api-source-tag-mapping.ts";
import { QuickFindResult, QuickFindUploadForm } from "@/functions/server/api-find-similar.ts";
import { Response } from "@/functions/server";

//== 消息函数 ==

/**
 * tab: 接收一条消息。
 */
export function receiveMessageForTab(onMessage: <T extends ServiceSenderMessagesList>(msg: T, sender: chrome.runtime.MessageSender) => boolean) {
    return function(msg: any, sender: chrome.runtime.MessageSender, callback: (response?: any) => void) {
        const m = {type: msg.type, msg: msg.msg, callback}
        return onMessage(m, sender)
    }
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

export type ServiceSenderMessagesList = Test | ReportSourceData | ReportSourceDataPath | QuickFindSimilar

export type ContentScriptMessagesList = SetActiveTabBadge | DownloadURL | CaptureVisibleTab | GetSourceData | SourceTagMappingGet | QuickFindUpload | QuickFindGet | ArchiveGet

//== service worker发送至content script的消息类型定义 ==

type Test = MsgTemplate<"TEST", {test: number}>

type ReportSourceData = MsgTemplateWithCallback<"REPORT_SOURCE_DATA", undefined, Result<SourceDataUpdateForm, string>>

type ReportSourceDataPath = MsgTemplateWithCallback<"REPORT_SOURCE_DATA_PATH", undefined, SourceDataPath>

type QuickFindSimilar = MsgTemplate<"QUICK_FIND_SIMILAR", undefined>

//== content script发送至service worker的消息类型定义

type SetActiveTabBadge = MsgTemplate<"SET_ACTIVE_TAB_BADGE", {path: SourceDataPath}>

type DownloadURL = MsgTemplate<"DOWNLOAD_URL", {url: string, referrer: string}>

type CaptureVisibleTab = MsgTemplateWithCallback<"CAPTURE_VISIBLE_TAB", undefined, string>

type GetSourceData = MsgTemplateWithCallback<"GET_SOURCE_DATA", {siteName: string, sourceId: string}, Result<SourceDataUpdateForm, string>>

type SourceTagMappingGet = MsgTemplateWithCallback<"SOURCE_TAG_MAPPING_GET", SourceTagPath, Response<SourceMappingTargetDetail[]>>

type QuickFindUpload = MsgTemplateWithCallback<"QUICK_FIND_UPLOAD", QuickFindUploadForm, Response<IdResponse>>

type QuickFindGet = MsgTemplateWithCallback<"QUICK_FIND_GET", {id: number}, Response<QuickFindResult>>

type ArchiveGet = MsgTemplateWithCallback<"ARCHIVE_GET", {filepath: string}, Response<string>>
