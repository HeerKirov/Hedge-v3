import { tz } from "moment-timezone"
import { SourceDataPath } from "@/functions/server/api-all"
import { SourceDataUpdateForm, SourceTagForm } from "@/functions/server/api-source-data"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { FANBOX_CONSTANTS, KEMONO_CONSTANTS } from "@/functions/sites"
import { settings } from "@/functions/setting"
import { imageToolbar, similarFinder } from "@/scripts/utils"
import { onDOMContentObserved, onObserving } from "@/utils/document"
import { Result } from "@/utils/primitives"

onDOMContentObserved({
    target: document,
    observe: { childList: true, subtree: true },
    mutation: [
        record => {
            for(const addedNode of record.addedNodes) {
                if(addedNode instanceof Element && addedNode.querySelector("main")) {
                    return true
                }
            }
            return false
        },
        record => {
            for(const addedNode of record.addedNodes) {
                if(addedNode instanceof HTMLMetaElement && addedNode.name === "id") {
                    return true
                }else if(addedNode instanceof Element && addedNode.querySelector("meta")?.name === "id") {
                    return true
                }
            }
            return false
        }
    ],
    init: [
        () => !!document.querySelector("main"),
        () => !!document.querySelector("meta[name=\"id\"]")
    ]
}, async () => {
    console.log("[Hedge v3 Helper] kemono/post script loaded.")
    const setting = await settings.get()
    const sourcePath = getSourceDataPath()
    if(sourcePath !== null) {
        const sourceData = await collectSourceData()
        console.log(sourcePath, sourceData)
        sendMessage("SUBMIT_PAGE_INFO", {path: sourcePath})
        sendMessage("SUBMIT_SOURCE_DATA", {path: sourcePath, data: sourceData})
        enableDownloadOrdinal(sourcePath)
    }else{
        sendMessage("NOTIFICATION", {title: "来源数据收集异常", message: `无法从${document.location.pathname}找到来源数据，请检查控制台。`})
    }

    initializeUI(sourcePath)
    if(setting.website.kemono.enableLinkReplace) enableLinkReplace()

    enablePasswordTableEnhance()
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
    imageToolbar.config({locale: "kemono", collectSourceData: sourceDataPath !== null})

    function deploy() {
        const imageLinks = [...document.querySelectorAll<HTMLDivElement>(".post__files .post__thumbnail")]
        imageToolbar.add(imageLinks.map((node, index) => ({
            index,
            element: node,
            sourcePath: sourceDataPath !== null ? {...sourceDataPath, sourcePart: index} : null,
            downloadURL: node.querySelector<HTMLAnchorElement>(".fileThumb")!.href
        })))
    }

    deploy()

    onObserving<HTMLDivElement>({
        target: document.querySelector("main")!,
        observe: { childList: true, subtree: true },
        mutation: mutation => {
            const returns = []
            for(const addedNode of mutation.addedNodes) {
                if(addedNode instanceof HTMLDivElement && addedNode.classList.contains(".post__body")) {
                    returns.push(addedNode)
                }else if(addedNode instanceof HTMLElement && addedNode.querySelector(".post__body")) {
                    returns.push(addedNode.querySelector(".post__body"))
                }
            }
            return returns
        },
    }, deploy)
}

/**
 * 功能: 将直接列出的下载资源添加一个直接下载为可识别名称的链接。
 */
function enableDownloadOrdinal(sourcePath: SourceDataPath) {
    onObserving<HTMLAnchorElement>({
        target: document.querySelector("main")!,
        observe: { childList: true, subtree: true },
        mutation: mutation => {
            const returns: HTMLAnchorElement[] = []
            for(const addedNode of mutation.addedNodes) {
                if(addedNode instanceof HTMLAnchorElement && addedNode.className.includes("post__attachment-link")) {
                    returns.push(addedNode)
                }else if(addedNode instanceof HTMLElement && addedNode.querySelector("a.post__attachment-link")) {
                    const anchors = addedNode.querySelectorAll<HTMLAnchorElement>("a.post__attachment-link")
                    returns.push(...anchors)
                }
            }
            return returns
        },
        init: () => document.querySelectorAll<HTMLAnchorElement>(".post__attachments a.post__attachment-link"),
    }, element => {
        if(element instanceof HTMLAnchorElement) {
            if(element.href.endsWith(".mp4") || element.href.endsWith(".webm")) {
                if(element.parentElement?.parentElement?.className.includes("post__attachments")) {
                    let i = 1, index: number | null = null
                    for(const childNode of element.parentElement.parentElement.childNodes) {
                        if(childNode === element.parentElement) {
                            index = i
                            break
                        }else{
                            i += 1
                        }
                    }

                    const fIdx = element.href.lastIndexOf("?f=")
                    const ext = element.href.substring(element.href.lastIndexOf(".") + 1)
                    const anchor = document.createElement("a")
                    anchor.href = element.href.substring(0, fIdx >= 0 ? fIdx : element.href.length) + `?f=${sourcePath.sourceSite}_${sourcePath.sourceId}_${index}.${ext}`
                    anchor.download = `${sourcePath.sourceSite}_${sourcePath.sourceId}_${index}.${ext}`
                    anchor.innerText = `(Link of ${sourcePath.sourceSite}_${sourcePath.sourceId} p${index})`
                    const span = document.createElement("span")
                    span.style.marginLeft = "8px"
                    span.appendChild(anchor)
                    element.parentElement.appendChild(span)
                }
            }
        }
    })
}

/**
 * 功能：将指向原网站的内嵌链接替换为指向K站。
 */
function enableLinkReplace() {
    const { site, uid } = getIdentityInfo()
    if(site === "fanbox") {
        onObserving<HTMLSpanElement | HTMLAnchorElement | HTMLParagraphElement>({
            target: document.querySelector("main")!,
            observe: { childList: true, subtree: true },
            mutation: mutation => {
                const returns: (HTMLSpanElement | HTMLAnchorElement | HTMLParagraphElement)[] = []
                for(const addedNode of mutation.addedNodes) {
                    if(addedNode instanceof HTMLAnchorElement) {
                        returns.push(addedNode)
                    }else if(addedNode instanceof HTMLSpanElement || addedNode instanceof HTMLParagraphElement) {
                        returns.push(addedNode)
                    }else if(addedNode instanceof HTMLElement && addedNode.querySelector("a")) {
                        const anchors = addedNode.querySelectorAll("a")
                        returns.push(...anchors)
                    }else if(addedNode instanceof HTMLElement && (addedNode.querySelector("span") || addedNode.querySelector("p"))) {
                        const spans = addedNode.querySelectorAll("span")
                        returns.push(...spans)
                        const ps = addedNode.querySelectorAll("p")
                        returns.push(...ps)
                    }
                }
                return returns
            },
            init: () => [
                ...document.querySelectorAll<HTMLAnchorElement>(".post__content a"),
                ...document.querySelectorAll<HTMLSpanElement>(".post__content span"),
                ...document.querySelectorAll<HTMLParagraphElement>(".post__content p"),
            ],
        }, element => {
            if(element instanceof HTMLAnchorElement) {
                const url = new URL(element.href)
                if(url.host.match(FANBOX_CONSTANTS.REGEXES.HOST)) {
                    const matcher = url.pathname.match(FANBOX_CONSTANTS.REGEXES.POST_PATHNAME)
                    if(matcher && matcher.groups) {
                        const pid = matcher.groups["PID"]
                        element.href = `${location.protocol}//${location.host}/${site}/user/${uid}/post/${pid}`
                        console.log("replace anchor to", element.href)
                    }
                }
            }else if(element instanceof HTMLSpanElement || element instanceof HTMLParagraphElement) {
                if(element.textContent && element.textContent.startsWith("https://")) {
                    try {
                        const url = new URL(element.textContent)
                        if(url.host.match(FANBOX_CONSTANTS.REGEXES.HOST)) {
                            const matcher = url.pathname.match(FANBOX_CONSTANTS.REGEXES.POST_PATHNAME)
                            if(matcher && matcher.groups) {
                                const pid = matcher.groups["PID"]
                                const anchor = document.createElement("a")
                                anchor.href = `${location.protocol}//${location.host}/${site}/user/${uid}/post/${pid}`
                                anchor.innerText = "(Link in Kemono)"
                                console.log("append anchor to", anchor.href)
                                element.appendChild(anchor)
                            }
                        }
                    }catch(e) {
                        console.error(e)
                    }
                }
            }
        })
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
    let publishTime: string | undefined
    if(!publishedMeta) {
        console.warn("Cannot find meta[name=published].")
        publishTime = undefined
    }else{
        publishTime = tz(publishedMeta.content, "UTC").toDate().toISOString()
    }

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

