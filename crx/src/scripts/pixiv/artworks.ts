import { SourceDataPath } from "@/functions/server/api-all"
import { SourceDataUpdateForm, SourceTagForm } from "@/functions/server/api-source-data"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { PIXIV_CONSTANTS } from "@/functions/sites"
import { settings } from "@/functions/setting"
import { imageToolbar, similarFinder } from "@/scripts/utils"
import { Result } from "@/utils/primitives"
import { onDOMContentObserved, onObserving } from "@/utils/document"

onDOMContentObserved({
    observe: { subtree: true, childList: true },
    mutation: mutation => {
        if(document.querySelector<HTMLAnchorElement>("aside > section > h2 > div > div > a")) {
            return true
        }
        return false
    },
    init: () => document.querySelector<HTMLAnchorElement>("aside > section > h2 > div > div > a") !== null
}, async () => {
    console.log("[Hedge v3 Helper] pixiv/artworks script loaded.")
    const setting = await settings.get()
    const sourceDataPath = getSourceDataPath()
    const sourceData = collectSourceData()
    sendMessage("SUBMIT_PAGE_INFO", {path: sourceDataPath})
    sendMessage("SUBMIT_SOURCE_DATA", {path: sourceDataPath, data: sourceData})

    if(setting.toolkit.downloadToolbar.enabled) initializeUI(sourceDataPath)
})

receiveMessageForTab(({ type, msg: _, callback }) => {
    if(type === "REPORT_SOURCE_DATA") {
        callback(collectSourceData())
    }else if(type === "REPORT_PAGE_INFO") {
        callback({path: getSourceDataPath()})
    }else if(type === "QUICK_FIND_SIMILAR") {
        const sourceDataPath = getSourceDataPath()
        const sourceData = collectSourceData()
        const file = document.querySelector<HTMLImageElement>("div[role=presentation] > a > img")
        similarFinder.quickFind(file?.src, sourceDataPath, sourceData)
    }
    return false
})

/**
 * 进行image-toolbar, find-similar相关的UI初始化。
 */
function initializeUI(sourceDataPath: SourceDataPath) {
    imageToolbar.config({locale: "pixiv"})

    onObserving<HTMLImageElement>({
        target: document.querySelector("main")!,
        observe: { childList: true, subtree: true },
        mutation(mutation) {
            const returns = []
            for(const addedNode of mutation.addedNodes) {
                if(addedNode instanceof HTMLImageElement) {
                    const parent = addedNode.parentElement?.parentElement
                    if(parent instanceof HTMLDivElement && parent.role === "presentation") {
                        returns.push(addedNode)
                    }
                }else if(addedNode instanceof HTMLElement) {
                    const images = addedNode.querySelectorAll<HTMLImageElement>("div[role=presentation] > a > img")
                    returns.push(...images)
                }
            }
            return returns
        },
        init() {
            return document.querySelectorAll<HTMLImageElement>("div[role=presentation] > a > img")
        },
    }, (node, index) => {
        const anchor = node.parentElement! as HTMLAnchorElement
        const div = anchor.parentElement! as HTMLDivElement
        imageToolbar.add([{
            index: null,
            element: div,
            sourcePath: {...sourceDataPath, sourcePart: index},
            downloadURL: null,
            thumbnailSrc: () => node.src
        }])
    })

}

/**
 * 收集来源数据。
 */
function collectSourceData(): Result<SourceDataUpdateForm, string> {
    const tags: SourceTagForm[] = []

    //查找作者，作为tag写入。作者的type固定为"artist"，code为"{UID}"
    const artistAnchor = document.querySelector<HTMLAnchorElement>("aside > section > h2 > div > div > a")
    if(artistAnchor !== null) {
        const artistName = artistAnchor.querySelector("div")?.textContent
        if(!artistName) {
            return {ok: false, err: `Artist: artist name is empty.`}
        }
        const url = new URL(artistAnchor.href)
        const match = url.pathname.match(PIXIV_CONSTANTS.REGEXES.USER_PATHNAME)
        if(match && match.groups) {
            const userId = match.groups["UID"]
            tags.push({code: userId, name: artistName, type: "artist"})
        }else{
            return {ok: false, err: `Artist: cannot analyse artist anchor href.`}
        }
    }else{
        return {ok: false, err: `Artist: cannot find artist section.`}
    }

    //查找标签列表，作为tag写入。标签的type固定为"tag"，code为"{NAME}"
    //AI生成标记与R-18标记作为tag写入，type固定为"meta"
    const tagSpanList = document.querySelectorAll("figcaption footer ul > li > span")
    for(let i = 0; i < tagSpanList.length; ++i) {
        const tagSpan = tagSpanList[i]
        const subSpanList = tagSpan.getElementsByTagName("span")
        if(subSpanList.length >= 2) {
            const name = subSpanList[0].querySelector("a")?.textContent
            if(!name) {
                return {ok: false, err: `Tag[${i}]: tag name is empty.`}
            }
            const otherName = subSpanList[1].querySelector("a")?.textContent
            if(!otherName) {
                return {ok: false, err: `Tag[${i}]: tag other name is empty.`}
            }
            tags.push({code: name, name, otherName, type: "tag"})
        }else if(subSpanList.length === 1) {
            const name = subSpanList[0].querySelector("a")?.textContent
            if(!name) {
                return {ok: false, err: `Tag[${i}]: tag name is empty.`}
            }
            tags.push({code: name, name, type: "tag"})
        }else{
            const anchor = tagSpan.getElementsByTagName("a")
            if(anchor.length > 0) {
                if(anchor[0].textContent === "R-18" || anchor[0].href === "/tags/R-18/artworks") {
                    tags.push({code: "R-18", type: "meta"})
                }else if(anchor[0].textContent === "R-18G" || anchor[0].href === "/tags/R-18G/artworks") {
                    tags.push({code: "R-18G", type: "meta"})
                }else if(anchor[0].textContent?.startsWith("AI")) {
                    tags.push({code: "AI-CREATED", name: "AI生成", type: "meta"})
                }
            }
        }
    }

    let description: string | undefined
    //tips: 从meta获得的description没有换行，只能从DOM获得
    const descriptionParagraph = document.querySelector<HTMLParagraphElement>("figcaption h1 + div > div > p")
    if(descriptionParagraph !== null) {
        description = descriptionParagraph.innerText
    }

    let title: string | undefined
    const titleHeading = document.querySelector<HTMLHeadingElement>("figcaption h1")
    if(titleHeading !== null && titleHeading.textContent) {
        title = titleHeading.textContent
    }

    let publishTime: string | undefined
    const publishTimeDiv = document.querySelector<HTMLTimeElement>("time")
    if(publishTimeDiv) {
        publishTime = publishTimeDiv.dateTime
    }

    return {
        ok: true,
        value: {tags, title, description, publishTime}
    }
}

/**
 * 获得当前页面的SourceDataPath。需要注意的是，pixiv的页面构成只能解析到id，没有page参数。
 */
function getSourceDataPath(): SourceDataPath {
    const sourceSite = PIXIV_CONSTANTS.SITE_NAME
    const pid = getPID()
    return {sourceSite, sourceId: pid, sourcePart: null, sourcePartName: null}
}

/**
 * 获得PID。
 */
function getPID(): string {
    const match = document.location.pathname.match(PIXIV_CONSTANTS.REGEXES.ARTWORK_PATHNAME)
    if(match && match.groups) {
        return match.groups["PID"]
    }else{
        throw new Error("Cannot analyse pathname.")
    }
}
