import { SourceDataPath } from "@/functions/server/api-all"
import { SourceDataUpdateForm, SourceTagForm } from "@/functions/server/api-source-data"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { settings } from "@/functions/setting"
import { sessions } from "@/functions/storage"
import { FANTIA_CONSTANTS } from "@/functions/sites"
import { imageToolbar, similarFinder } from "@/scripts/utils"
import { onDOMContentObserved } from "@/utils/document"
import { Result } from "@/utils/primitives"

onDOMContentObserved({
    observe: { subtree: true, childList: true },
    mutation: mutation => {
        if(mutation.target instanceof HTMLBodyElement) {
            const p = [...document.querySelectorAll<HTMLPictureElement>(".image-container picture").values()]
            if(p.length > 0) {
                return true
            }
        }
        return false
    },
    init: () => document.querySelectorAll<HTMLPictureElement>(".image-container picture").length > 0,
    preCondition: () => FANTIA_CONSTANTS.REGEXES.POST_PATHNAME.test(document.location.pathname)
}, async () => {
    console.log("[Hedge v3 Helper] fantia/post script loaded.")
    const setting = await settings.get()
    const sourceDataPath = getSourceDataPath()
    const sourceData = await collectSourceData()
    sendMessage("SUBMIT_PAGE_INFO", {path: sourceDataPath})
    sendMessage("SUBMIT_SOURCE_DATA", {path: sourceDataPath, data: sourceData})
    if(setting.toolkit.downloadToolbar.enabled) await initializeUI(sourceDataPath)
})

receiveMessageForTab(({ type, msg: _, callback }) => {
    if(type === "REPORT_SOURCE_DATA") {
        collectSourceData().then(r => callback(r))
        return true
    }else if(type === "REPORT_PAGE_INFO") {
        callback({path: getSourceDataPath()})
    }else if(type === "QUICK_FIND_SIMILAR") {
        const sourceDataPath = getSourceDataPath()
        collectSourceData().then(sourceData => {
            const file = document.querySelector<HTMLImageElement>(".image-container picture img")
            similarFinder.quickFind(file?.src, sourceDataPath, sourceData)
        })
    }
    return false
})

/**
 * 进行image-toolbar, find-similar相关的UI初始化。
 */
async function initializeUI(sourcePath: SourceDataPath) {
    imageToolbar.config({locale: "fantia"})

    let index = 1
    const nodes = [...document.querySelectorAll<HTMLPictureElement>(".image-container picture").values()].map(node => {
        const src = node.querySelector("img")!.src
        const m = src.match(/uploads\/post_content_photo\/file\/(?<FID>\d+)/)
        const fid = (m && m.groups) ? m.groups["FID"] : null
        const i = index++
        const sp: SourceDataPath = {...sourcePath, sourcePart: i, sourcePartName: fid}
        return {index: i, element: node, sourcePath: sp, downloadURL: `https://fantia.jp/posts/${sourcePath.sourceId}/post_content_photo/${fid}#${i}`}
    })

    for(const { sourcePath } of nodes) {
        if(sourcePath && sourcePath.sourcePart !== null && sourcePath.sourcePartName !== null) {
            // console.log("add page num", {pid: sourcePath.sourceId, pname: sourcePath.sourcePartName}, {page: sourcePath.sourcePart})
            await sessions.cache.fantiaPageNum.set({pid: sourcePath.sourceId, pname: sourcePath.sourcePartName}, {page: sourcePath.sourcePart})
        }
    }
    imageToolbar.add(nodes)
}

/**
 * 收集来源数据。
 */
async function collectSourceData(): Promise<Result<SourceDataUpdateForm, string>> {
    const tags: SourceTagForm[] = []

    //查找作者，作为tag写入。作者的type固定为"artist"，code为"{UID}"
    const artistAnchor = document.querySelector<HTMLAnchorElement>("h1.fanclub-name a")
    if(artistAnchor !== null) {
        const matcher = artistAnchor.textContent!.match(/^(?<CLUB>.*)\((?<NAME>.*)\)$/)
        if(!matcher || !matcher.groups) {
            return {ok: false, err: `Artist: Cannot analyse artist anchor title.`}
        }
        const name = matcher.groups["NAME"]
        const club = matcher.groups["CLUB"]
        const url = new URL(artistAnchor.href)
        const match = url.pathname.match(FANTIA_CONSTANTS.REGEXES.USER_PATHNAME)
        if(!match || !match.groups) {
            return {ok: false, err: `Artist: cannot analyse artist anchor href.`}
        }
        const userId = match.groups["UID"]
        tags.push({code: userId, name: name, otherName: club, type: "artist"})
    }else{
        return {ok: false, err: `Artist: cannot find artist section.`}
    }

    let description: string | undefined
    //tips: 从meta获得的description没有换行，只能从DOM获得
    const descriptionDiv = document.querySelector<HTMLDivElement>(".wysiwyg.mb-30")
    if(descriptionDiv && descriptionDiv.innerText) {
        description = descriptionDiv.innerText
    }

    let title: string | undefined
    const titleHeading = document.querySelector<HTMLHeadingElement>("h1.post-title")
    if(titleHeading !== null && titleHeading.textContent) {
        title = titleHeading.textContent
    }

    let publishTime: string | undefined
    const publishTimeSpan = document.querySelector<HTMLSpanElement>("small.post-date span")
    if(publishTimeSpan && publishTimeSpan.textContent) {
        publishTime = new Date(publishTimeSpan.textContent).toISOString()
    }

    return {
        ok: true,
        value: {tags, title, description, publishTime}
    }
}

/**
 * 获得当前页面的SourceDataPath。需要注意的是，fantia的页面构成只能解析到id，没有page参数。
 */
function getSourceDataPath(): SourceDataPath {
    const sourceSite = FANTIA_CONSTANTS.SITE_NAME
    const { pid } = getIdentityInfo()
    return {sourceSite, sourceId: pid, sourcePart: null, sourcePartName: null}
}

/**
 * 获得PID。
 */
function getIdentityInfo(): {pid: string} {
    const match = document.location.pathname.match(FANTIA_CONSTANTS.REGEXES.POST_PATHNAME)
    if(match && match.groups) {
        const pid = match.groups["PID"]
        return {pid}
    }else{
        throw new Error("Cannot analyse pathname.")
    }
}