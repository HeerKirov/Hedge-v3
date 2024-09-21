import { SourceDataPath } from "@/functions/server/api-all"
import { SourceDataUpdateForm, SourceTagForm } from "@/functions/server/api-source-data"
import { settings } from "@/functions/setting"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { PIXIV_CONSTANTS, SOURCE_DATA_COLLECT_SITES } from "@/functions/sites"
import { imageToolbar, initializeQuickFindUI, QuickFindController } from "@/scripts/utils"
import { Result } from "@/utils/primitives"
import { onDOMContentLoaded } from "@/utils/document"

let quickFind: QuickFindController | undefined

/**
 * 前置的预加载数据额外收集器。
 * 根据观察，偶尔会存在既不存在meta，也不存在DOM的瞬间。为了解决这个问题，在脚本预载时缓存meta内容，供后续使用。
 */
const collectSourceDataInCache = (function () {
    const cacheData = document.querySelector("meta#meta-preload-data") ? collectSourceDataFromPreloadData() : undefined
    return () => cacheData
})()

onDOMContentLoaded(() => {
    console.log("[Hedge v3 Helper] pixiv/artworks script loaded.")
    const sourceDataPath = getSourceDataPath()
    const sourceData = collectSourceData()
    sendMessage("SUBMIT_PAGE_INFO", {path: sourceDataPath})
    sendMessage("SUBMIT_SOURCE_DATA", {path: sourceDataPath, data: sourceData})

    quickFind = initializeQuickFindUI()

    initializeUI(sourceDataPath)
})

receiveMessageForTab(({ type, msg: _, callback }) => {
    if(type === "REPORT_SOURCE_DATA") {
        callback(collectSourceData())
    }else if(type === "REPORT_PAGE_INFO") {
        callback({path: getSourceDataPath()})
    }else if(type === "QUICK_FIND_SIMILAR") {
        settings.get().then(setting => {
            const sourceDataPath = getSourceDataPath()
            const sourceData = collectSourceData()
            const files = [...document.querySelectorAll<HTMLImageElement>("div[role=presentation] > a > img")]
            if(quickFind) {
                Promise.all(files.map(f => quickFind!.getImageDataURL(f)))
                    .then(files => quickFind!.openQuickFindModal(setting, files.length > 0 ? files[0] : undefined, sourceDataPath, sourceData))
            }
        })
    }
    return false
})

/**
 * 进行image-toolbar, find-similar相关的UI初始化。
 */
function initializeUI(sourcePath: SourceDataPath) {
    function observeAllPresentations(callback: (nodes: HTMLDivElement[]) => void) {
        const observer = new MutationObserver(mutationsList => {
            const values: HTMLDivElement[] = []
            for(const mutation of mutationsList) {
                if(mutation.type === "childList") {
                    mutation.addedNodes.forEach(node => {
                        if(node instanceof HTMLDivElement) {
                            if(node.role === "presentation" && node?.parentElement?.parentElement?.role === "presentation") {
                                values.push(node)
                            }else{
                                const list = [...node.querySelectorAll<HTMLDivElement>("div[role=presentation] > div > div[role=presentation]").values()]
                                values.push(...list)
                            }
                        }
                    })
                }
            }
            if(values.length > 0) callback(values)
        })

        observer.observe(document.body, { childList: true, subtree: true })

        //进行一波初始化回调
        const initValues = [...document.querySelectorAll<HTMLDivElement>("div[role=presentation] > div > div[role=presentation]").values()]
        if(initValues.length > 0) callback(initValues)
    }

    imageToolbar.locale("pixiv")
    observeAllPresentations(nodes => {
        imageToolbar.add(nodes.map(node => {
            const index = node.previousElementSibling ? parseInt(node.previousElementSibling.id) : 1
            return {
                index,
                element: node,
                sourcePath: {...sourcePath, sourcePart: index},
                downloadURL: () => node.querySelector("a")!.href
            }
        }))
    })
}

/**
 * 收集来源数据。
 */
function collectSourceData(): Result<SourceDataUpdateForm, string> {
    //pixiv在初始状态下不包含DOM结构，而是包含preload-data。因此在初次加载时可以从这里解析数据。
    //而加载完成后preload-data会被移除，因此可以转而从DOM获取数据。
    const cache = collectSourceDataInCache()
    if(cache?.ok) {
        return cache
    }else if(document.querySelector("meta#meta-preload-data")) {
        return collectSourceDataFromPreloadData()
    }else{
        return collectSourceDataFromDOM()
    }
}

/**
 * 从预加载数据收集来源数据。
 */
function collectSourceDataFromPreloadData(): Result<SourceDataUpdateForm, string> {
    const preloadData = JSON.parse(document.querySelector<HTMLMetaElement>("meta#meta-preload-data")!.content)
    const illustData = Object.values(preloadData["illust"])[0] as any

    const tags: SourceTagForm[] = []

    //查找作者，作为tag写入。作者的type固定为"artist"，code为"{UID}"
    for(const userData of Object.values(preloadData["user"])) {
        const userId = (userData as any)["userId"]
        const artistName = (userData as any)["name"]
        tags.push({code: userId, name: artistName, type: "artist"})
    }

    //查找标签列表，作为tag写入。标签的type固定为"tag"，code为"{NAME}"
    for(const tag of illustData["tags"]["tags"]) {
        const name = tag["tag"]
        const otherName = tag["translation"]?.["en"] ?? undefined
        tags.push({code: name, name, otherName, type: "tag"})
    }

    const title = illustData["title"] ?? undefined

    let description: string | undefined
    if(illustData["description"]) {
        description = illustData["description"].replaceAll(/<br\s*\/?>/g, "\n")
    }

    let publishTime: string | undefined
    if(illustData["createDate"]) {
        const date = new Date(illustData["createDate"])
        publishTime = date.toISOString()
    }

    return {
        ok: true,
        value: {tags, title, description, publishTime}
    }
}

/**
 * 从DOM结构收集来源数据。
 */
function collectSourceDataFromDOM(): Result<SourceDataUpdateForm, string> {
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
        }
        //没有span的可能是R-18标记
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
    const sourceSite = SOURCE_DATA_COLLECT_SITES["pixiv"].sourceSite
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
