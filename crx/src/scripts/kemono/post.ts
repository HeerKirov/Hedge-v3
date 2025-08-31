import { tz } from "moment-timezone"
import { SourceDataPath } from "@/functions/server/api-all"
import { SourceDataUpdateForm, SourceTagForm } from "@/functions/server/api-source-data"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { FANBOX_CONSTANTS, KEMONO_CONSTANTS } from "@/functions/sites"
import { settings } from "@/functions/setting"
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
        const setting = await settings.get()
        const sourcePath = getSourceDataPath()
        if(sourcePath !== null) {
            const sourceData = await collectSourceData()
            console.log(sourcePath, sourceData)
            sendMessage("SUBMIT_PAGE_INFO", {path: sourcePath})
            sendMessage("SUBMIT_SOURCE_DATA", {path: sourcePath, data: sourceData})
        }else{
            sendMessage("NOTIFICATION", {title: "来源数据收集异常", message: `无法从${document.location.pathname}找到来源数据，请检查控制台。`})
        }

        initializeUI(sourcePath)

        if(setting.website.kemono.enableLinkReplace) enableLinkReplace()
        enablePasswordTableEnhance()
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
 * 功能：将指向原网站的内嵌链接替换为指向K站。
 */
function enableLinkReplace() {
    const { site, uid } = getIdentityInfo()
    if(site === "fanbox") {
        function processAnchor(anchor: HTMLAnchorElement) {
            const url = new URL(anchor.href)
            if(url.host.match(FANBOX_CONSTANTS.REGEXES.HOST)) {
                const matcher = url.pathname.match(FANBOX_CONSTANTS.REGEXES.POST_PATHNAME)
                if(matcher && matcher.groups) {
                    const pid = matcher.groups["PID"]
                    anchor.href = `${location.protocol}//${location.host}/${site}/user/${uid}/post/${pid}`
                    console.log("replace anchor to", anchor.href)
                }
            }
        }
        function processSpan(span: HTMLSpanElement | HTMLParagraphElement) {
            if(span.textContent && span.textContent.startsWith("https://"))
            try {
                const url = new URL(span.textContent)
                if(url.host.match(FANBOX_CONSTANTS.REGEXES.HOST)) {
                    const matcher = url.pathname.match(FANBOX_CONSTANTS.REGEXES.POST_PATHNAME)
                    if(matcher && matcher.groups) {
                        const pid = matcher.groups["PID"]
                        const anchor = document.createElement("a")
                        anchor.href = `${location.protocol}//${location.host}/${site}/user/${uid}/post/${pid}`
                        anchor.innerText = "(Link in Kemono)"
                        console.log("append anchor to", anchor.href)
                        span.appendChild(anchor)
                    }
                }
            }catch(e) {
                console.error(e)
            }
        }
        const observer = new MutationObserver(mutationsList => {
            for(const mutation of mutationsList) {
                for(const addedNode of mutation.addedNodes) {
                    if(addedNode instanceof HTMLAnchorElement) {
                        processAnchor(addedNode)
                    }else if(addedNode instanceof HTMLSpanElement || addedNode instanceof HTMLParagraphElement) {
                        processSpan(addedNode)
                    }else if(addedNode instanceof HTMLElement && addedNode.querySelector("a")) {
                        const anchors = addedNode.querySelectorAll("a")
                        for(const addedNode of anchors) {
                            processAnchor(addedNode)
                        }
                    }else if(addedNode instanceof HTMLElement && (addedNode.querySelector("span") || addedNode.querySelector("p"))) {
                        const spans = addedNode.querySelectorAll("span")
                        for(const addedNode of spans) processSpan(addedNode)
                        const ps = addedNode.querySelectorAll("p")
                        for(const addedNode of ps) processSpan(addedNode)
                    }

                }
            }
        })
        observer.observe(document.querySelector("main")!, { childList: true, subtree: true })

        const anchorList = [...document.querySelectorAll<HTMLAnchorElement>(".post__content a")]
        for(const anchor of anchorList) processAnchor(anchor)
        const spanList = [...document.querySelectorAll<HTMLAnchorElement>(".post__content span")]
        for(const span of spanList) processSpan(span)
        const pList = [...document.querySelectorAll<HTMLAnchorElement>(".post__content p")]
        for(const p of pList) processSpan(p)
    }
}

/**
 * 功能：密码表增强。仅针对某一个特定ARTIST的一个品质级改动。
 */
function enablePasswordTableEnhance() {
    const { site, uid } = getIdentityInfo()
    if(site === "fanbox" && uid === "7904682") {
        function processParagraph(p: HTMLParagraphElement) {
            if(p.textContent && (p.textContent.startsWith("#1 ▷") || p.textContent.startsWith("#2 ▷") || p.textContent.startsWith("#3 ▷") || p.textContent.startsWith("#4 ▷") || p.textContent.startsWith("#5 ▷"))) {
                const span = p.querySelector("span")
                if(span) {
                    span.style.fontWeight = "700"
                    span.style.color = "yellow"
                }
            }
        }
        const observer = new MutationObserver(mutationsList => {
            for(const mutation of mutationsList) {
                for(const addedNode of mutation.addedNodes) {
                    if(addedNode instanceof HTMLParagraphElement) {
                        processParagraph(addedNode)
                    }else if(addedNode instanceof HTMLElement && addedNode.querySelector("p")) {
                        const anchors = addedNode.querySelectorAll("p")
                        for(const addedNode of anchors) {
                            processParagraph(addedNode)
                        }
                    }
                }
            }
        })
        observer.observe(document.querySelector("main")!, { childList: true, subtree: true })
        const pList = [...document.querySelectorAll<HTMLParagraphElement>(".post__content p")]
        for(const p of pList) {
            processParagraph(p)
        }
    }
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
    const { site, uid, pid } = getIdentityInfo()
    if(KEMONO_CONSTANTS.AVAILABLE_SERVICES.includes(site as any)) {
        if(site === "gumroad") {
            //gumroad的id结构相比之下比较特殊，它的pid不是全站唯一的，因此必须添加uid加以限制
            return {sourceSite: site, sourceId: `${uid}.${pid}`, sourcePart: null, sourcePartName: null}
        }else{
            return {sourceSite: site, sourceId: pid, sourcePart: null, sourcePartName: null}
        }
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

