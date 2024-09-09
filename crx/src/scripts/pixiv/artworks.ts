import { SourceDataPath } from "@/functions/server/api-all"
import { SourceDataUpdateForm, SourceTagForm } from "@/functions/server/api-source-data"
import { Setting, settings } from "@/functions/setting"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { PIXIV_CONSTANTS } from "@/functions/sites"
import { initializeUI, QuickFindController } from "@/scripts/utils"
import { Result } from "@/utils/primitives"
import { onDOMContentLoaded } from "@/utils/document"

let ui: QuickFindController | undefined

onDOMContentLoaded(async () => {
    console.log("[Hedge v3 Helper] pixiv/artworks script loaded.")
    const setting = await settings.get()
    const sourceDataPath = getSourceDataPath(setting)
    const sourceData = collectSourceData()
    sendMessage("SUBMIT_PAGE_INFO", {path: sourceDataPath})
    sendMessage("SUBMIT_SOURCE_DATA", {path: sourceDataPath, data: sourceData})
    ui = initializeUI()
})

receiveMessageForTab(({ type, msg: _, callback }) => {
    if(type === "REPORT_SOURCE_DATA") {
        callback(collectSourceData())
        return false
    }else if(type === "REPORT_PAGE_INFO") {
        settings.get().then(setting => {
            callback({path: getSourceDataPath(setting)})
        })
        return true
    }else if(type === "QUICK_FIND_SIMILAR") {
        settings.get().then(setting => {
            const sourceDataPath = getSourceDataPath(setting)
            const sourceData = collectSourceData()
            const files = [...document.querySelectorAll<HTMLImageElement>("div[role=presentation] > a > img")]
            if(ui) {
                Promise.all(files.map(f => ui!.getImageDataURL(f)))
                    .then(files => ui!.openQuickFindModal(setting, files.length > 0 ? files[0] : undefined, sourceDataPath, sourceData))
            }
        })
        return false
    }else{
        return false
    }
})

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
    const descriptionMeta = document.querySelector<HTMLMetaElement>("meta[property=\"og:description\"]")
    if(descriptionMeta !== null) {
        description = descriptionMeta.content || undefined
    }else{
        const descriptionDiv = document.querySelector<HTMLDivElement>("figcaption h1 + div")
        if(descriptionDiv !== null && descriptionDiv.textContent) {
            description = descriptionDiv.textContent
        }
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
function getSourceDataPath(setting: Setting): SourceDataPath {
    const overrideRule = setting.sourceData.overrideRules["pixiv"]
    const sourceSite = overrideRule?.sourceSite ?? "pixiv"
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
