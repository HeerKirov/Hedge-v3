import { tz } from "moment-timezone"
import { SourceDataPath } from "@/functions/server/api-all"
import { SourceDataUpdateForm, SourceTagForm } from "@/functions/server/api-source-data"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { KEMONO_CONSTANTS } from "@/functions/sites"
import { imageToolbar, similarFinder } from "@/scripts/utils"
import { onDOMContentLoaded } from "@/utils/document"
import { Result } from "@/utils/primitives"

onDOMContentLoaded(() => {
    function observeMainInitialize(callback: () => void) {
        if(document.querySelector("main") && document.querySelector("meta[name=\"published\"]")) {
            callback()
            return
        }
        const ready = {main: false, metaTime: false}
        const observer = new MutationObserver(mutationsList => {
            for(const mutation of mutationsList) {
                for(const addedNode of mutation.addedNodes) {
                    if(addedNode instanceof Element && addedNode.querySelector("main")) {
                        ready.main = true
                    }else if(addedNode instanceof HTMLMetaElement && addedNode.name === "published") {
                        ready.metaTime = true
                    }
                    if(ready.metaTime && ready.main) {
                        callback()
                        observer.disconnect()
                        return
                    }
                }
            }
        })
        observer.observe(document, { childList: true, subtree: true })
    }

    observeMainInitialize(async () => {
        console.log("[Hedge v3 Helper] kemono/post script loaded.")
        const sourcePath = getSourceDataPath()
        if(sourcePath !== null) {
            const sourceData = await collectSourceData()
            console.log(sourcePath, sourceData)
            sendMessage("SUBMIT_PAGE_INFO", {path: sourcePath})
            sendMessage("SUBMIT_SOURCE_DATA", {path: sourcePath, data: sourceData})
        }

        initializeUI(sourcePath)
    })

})

receiveMessageForTab(({ type, msg: _, callback }) => {
    if(type === "REPORT_SOURCE_DATA") {
        collectSourceData().then(r => callback(r))
        return true
    }else if(type === "REPORT_PAGE_INFO") {
        callback({path: getSourceDataPath()})
    }else if(type === "QUICK_FIND_SIMILAR") {
        const sourceDataPath = getSourceDataPath()
        if(sourceDataPath !== null) {
            collectSourceData().then(sourceData => {
                const images = [...document.querySelectorAll<HTMLImageElement>(".post__files .post__thumbnail .fileThumb img")]
                const img = images.length >= 2 ? images[1] : images.length >= 1 ? images[0] : null
                similarFinder.quickFind(img?.src, sourceDataPath, sourceData)
            })
            return true
        }
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
async function collectSourceData(): Promise<Result<SourceDataUpdateForm, string>> {
    const { uid } = getIdentityInfo()
    const tags: SourceTagForm[] = []

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

