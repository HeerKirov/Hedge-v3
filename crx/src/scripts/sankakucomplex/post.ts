import { tz } from "moment-timezone"
import { SourceDataPath } from "@/functions/server/api-all"
import { SourceBookForm, SourceDataUpdateForm, SourceTagForm } from "@/functions/server/api-source-data"
import { settings } from "@/functions/setting"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { SANKAKUCOMPLEX_CONSTANTS } from "@/functions/sites"
import { imageToolbar, similarFinder } from "@/scripts/utils"
import { Result } from "@/utils/primitives"
import { onDOMContentLoaded } from "@/utils/document"

onDOMContentLoaded(async () => {
    console.log("[Hedge v3 Helper] sankakucomplex/post script loaded.")
    const setting = await settings.get()
    const sourceDataPath = getSourceDataPath()
    const sourceData = collectSourceData()
    sendMessage("SUBMIT_PAGE_INFO", {path: sourceDataPath})
    sendMessage("SUBMIT_SOURCE_DATA", {path: sourceDataPath, data: sourceData})

    if(setting.website.sankakucomplex.enableUIOptimize) enableUIOptimize()

    initializeUI(sourceDataPath)
})

receiveMessageForTab(({ type, msg: _, callback }) => {
    if(type === "REPORT_SOURCE_DATA") {
        callback(collectSourceData())
    }else if(type === "REPORT_PAGE_INFO") {
        callback({path: getSourceDataPath()})
    }else if(type === "QUICK_FIND_SIMILAR") {
        const sourceDataPath = getSourceDataPath()
        const sourceData = collectSourceData()
        const file = document.querySelector<HTMLImageElement>("a#image-link img#image")
        similarFinder.quickFind(file?.src, sourceDataPath, sourceData)
    }
    return false
})

/**
 * 功能：进行UI优化
 * - legacy的post页面的Book清单只能通向beta Book。把legacy的加回去。
 * - 移除"查看原始图像"的notice
 */
function enableUIOptimize() {
    //移除origin image notice
    const resizedNotice = document.querySelector("#resized_notice")
    if(resizedNotice) resizedNotice.remove()

    //添加book legacy链接
    const statusNotice = document.querySelectorAll(".content .status-notice")
    if(statusNotice.length) {
        statusNotice.forEach(sn => {
            if(sn.id.startsWith("pool")) {
                const bookId = sn.id.slice("pool".length)
                const legacyA = document.createElement("a")
                legacyA.href = SANKAKUCOMPLEX_CONSTANTS.PATTERNS.BOOK_PATHNAME(bookId)
                legacyA.text = `Legacy pool: ${bookId}`
                sn.append("(")
                sn.appendChild(legacyA)
                sn.append(")")
            }
        })
    }
}

/**
 * 进行image-toolbar, find-similar相关的UI初始化。
 */
function initializeUI(sourcePath: SourceDataPath) {
    const postContent = document.querySelector<HTMLDivElement>("#post-content")
    if(!postContent) {
        console.warn("[initializeUI] Cannot find #post-content.")
        return
    }
    const imageLink = postContent.querySelector<HTMLAnchorElement>("#image-link")
    let url: string
    if(imageLink) {
        if(imageLink.classList.contains("sample") && imageLink.href) {
            url = imageLink.href
        }else if(imageLink.classList.contains("full")) {
            const img = imageLink.querySelector("img")
            if(img) {
                url = img.src
            }else{
                console.warn("[initializeUI] Cannot find #image-link > img.")
                return
            }
        }else{
            console.warn("[initializeUI] Cannot find #image-link with class 'full' or 'sample'.")
            return
        }
    }else{
        const video = postContent.querySelector<HTMLVideoElement>("video#image")
        if(video) {
            url = video.src
        }else{
            console.warn("[initializeUI] Cannot find #image-link or video#image.")
            return
        }
    }

    imageToolbar.config({locale: "sankaku"})
    imageToolbar.add([{index: null, element: postContent, sourcePath, downloadURL: url}])
}

/**
 * 收集来源数据。
 */
function collectSourceData(): Result<SourceDataUpdateForm, string> {
    const tags: SourceTagForm[] = []
    const tagLiList = document.querySelectorAll("#tag-sidebar li")
    for(let i = 0; i < tagLiList.length; ++i) {
        const tagLi = tagLiList[i]
        const tag: SourceTagForm = {code: "", name: undefined, otherName: undefined, type: ""}
        if(tagLi.className.startsWith("tag-type-")) {
            tag.type = tagLi.className.substring("tag-type-".length)
        }else{
            return {ok: false, err: `Tag[${i}]: cannot infer tag type from its class '${tagLi.className}'.`}
        }
        const tagAnchor = tagLi.querySelector<HTMLAnchorElement>("a[itemprop=\"keywords\"]")
        if(tagAnchor !== null && tagAnchor.textContent) {
            tag.code = tagAnchor.textContent.replaceAll("_", " ")
        }else{
            return {ok: false, err: `Tag[${i}]: Cannot find its anchor.`}
        }
        //tips: 网站又改了，已经不能直接从DOM结构获取jp name等信息了，因此这里的代码暂时移除。
        tags.push(tag)
    }

    const books: SourceBookForm[] = []
    //此处依然使用了legacy模式。好处是节省请求；坏处是book的jp name无法获得。
    const statusNotice = document.querySelectorAll(".content .status-notice")
    if(statusNotice.length) {
        for(const sn of statusNotice) {
            if(sn.id.startsWith("pool")) {
                const bookId = sn.id.slice("pool".length)
                const anchor = sn.querySelector("a")
                const title = anchor && anchor.textContent ? anchor.textContent : undefined
                books.push({code: bookId, title})
            }
        }
    }

    const relations: number[] = []
    //此处依然使用了legacy模式。好处是节省请求；坏处是能获得的children数量有限，只有5个。
    const parentPreviewDiv = document.querySelector("div#parent-preview")
    if(parentPreviewDiv) {
        const spanList = parentPreviewDiv.querySelectorAll<HTMLSpanElement>("span.thumb")
        for(const span of spanList) {
            const id = parseInt(span.id.slice(1))
            relations.push(id)
        }
    }
    const childPreviewDiv = document.querySelector("div#child-preview")
    if(childPreviewDiv) {
        const spanList = childPreviewDiv.querySelectorAll<HTMLSpanElement>("span.thumb")
        for(const span of spanList) {
            const id = parseInt(span.id.slice(1))
            relations.push(id)
        }
    }

    let publishTime: string | undefined
    //这里的选取器并不稳固，它将stats下的第一个anchor当作posted发布时间
    const publishAnchor = document.querySelector<HTMLAnchorElement>("#stats > a")
    if(publishAnchor) {
        //anchor的title是发布时间，但它的时区有点怪，似乎固定使用美国东部时区America/New_York
        try {
            publishTime = tz(publishAnchor.title, "America/New_York").toDate().toISOString()
        }catch(e){
            console.error(`Cannot analysis publish time [${publishAnchor.title}]`, e)
        }
    }

    return {
        ok: true,
        value: {tags, books, relations, publishTime}
    }
}

/**
 * 获得当前页面的SourceDataPath。
 */
function getSourceDataPath(): SourceDataPath {
    const sourceSite = SANKAKUCOMPLEX_CONSTANTS.SITE_NAME
    const pid = getPID()
    return {sourceSite, sourceId: pid, sourcePart: null, sourcePartName: null}
}

/**
 * 获得PID。
 */
function getPID(): string {
    const res = SANKAKUCOMPLEX_CONSTANTS.REGEXES.POST_PATHNAME.exec(document.location.pathname)
    if(res && res.groups) {
        return res.groups["PID"]
    }else{
        throw new Error("Cannot analyse pathname.")
    }
}
