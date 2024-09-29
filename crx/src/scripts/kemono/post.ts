import { tz } from "moment-timezone"
import { SourceDataPath } from "@/functions/server/api-all"
import { SourceDataUpdateForm, SourceTagForm } from "@/functions/server/api-source-data"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { KEMONO_CONSTANTS } from "@/functions/sites"
import { imageToolbar, similarFinder } from "@/scripts/utils"
import { onDOMContentLoaded } from "@/utils/document"
import { Result } from "@/utils/primitives"

onDOMContentLoaded(() => {
    console.log("[Hedge v3 Helper] kemono/post script loaded.")
    const sourcePath = getSourceDataPath()
    if(sourcePath !== null) {
        const sourceData = collectSourceData()
        console.log(sourcePath, sourceData)
        sendMessage("SUBMIT_PAGE_INFO", {path: sourcePath})
        sendMessage("SUBMIT_SOURCE_DATA", {path: sourcePath, data: sourceData})
    }

    initializeUI(sourcePath)
})

receiveMessageForTab(({ type, msg: _, callback }) => {
    if(type === "REPORT_SOURCE_DATA") {
        callback(collectSourceData())
    }else if(type === "REPORT_PAGE_INFO") {
        callback({path: getSourceDataPath()})
    }else if(type === "QUICK_FIND_SIMILAR") {
        const sourceDataPath = getSourceDataPath()
        if(sourceDataPath !== null) {
            const sourceData = collectSourceData()
            const file = document.querySelector<HTMLImageElement>("a#image-link img#image")
            similarFinder.quickFind(file?.src, sourceDataPath, sourceData)
        }
        return false
    }
    return false
})

/**
 * 进行image-toolbar, find-similar相关的UI初始化。
 */
function initializeUI(sourceDataPath: SourceDataPath | null) {
    const imageLinks = [...document.querySelectorAll<HTMLDivElement>(".post__files .post__thumbnail")]

    imageToolbar.config({locale: "kemono", collectSourceData: sourceDataPath !== null})
    imageToolbar.add(imageLinks.map((node, index) => ({
        index,
        element: node,
        sourcePath: sourceDataPath !== null ? {...sourceDataPath, sourcePart: index} : null,
        downloadURL: node.querySelector<HTMLAnchorElement>(".fileThumb")!.href
    })))
}

/**
 * 收集来源数据。
 */
function collectSourceData(): Result<SourceDataUpdateForm, string> {
    const tags: SourceTagForm[] = []

    //添加uid作为tag。在目前支持的site(fanbox, fantia, patreon, gumroad)中，所有site都将uid存储为artist类型。
    const uid = document.querySelector<HTMLMetaElement>("meta[name=\"user\"]")?.content
    if(!uid) {
        return {ok: false, err: `Cannot find meta[name=user].`}
    }
    tags.push({code: uid, type: "artist"})

    const titleSpan = document.querySelector<HTMLSpanElement>(".post__title > span:first-child")
    if(!titleSpan) {
        return {ok: false, err: `Cannot find post title span.`}
    }
    const title = titleSpan.innerText

    const contentDiv = document.querySelector<HTMLDivElement>(".post__content")
    const description = contentDiv?.innerText?.trim() || undefined

    const publishedMeta = document.querySelector<HTMLMetaElement>("meta[name=\"published\"]")
    if(!publishedMeta) {
        return {ok: false, err: `Cannot find meta[name=published].`}
    }
    const publishTime = tz(publishedMeta.content, "UTC").toDate().toISOString()

    return {
        ok: true,
        value: {tags, title, description, publishTime}
    }
}

/**
 * 获得当前页面的SourceDataPath。
 */
function getSourceDataPath(): SourceDataPath | null {
    const { site, pid } = getIdentityInfo()
    if(KEMONO_CONSTANTS.AVAILABLE_SERVICES.includes(site as any)) {
        return {sourceSite: site, sourceId: pid, sourcePart: null, sourcePartName: null}
    }else{
        return null
    }
}

/**
 * 获取关键信息。
 */
function getIdentityInfo(): {site: string, uid: string, pid: string} {
    const match = document.location.pathname.match(KEMONO_CONSTANTS.REGEXES.POST_PATHNAME)
    if(match && match.groups) {
        const site = match.groups["SITE"]
        const uid = match.groups["UID"]
        const pid = match.groups["PID"]
        return {site, uid, pid}
    }
    throw new Error("Cannot analyse pathname.")
}

