import { receiveMessageForTab } from "@/functions/messages"
import { EHENTAI_CONSTANTS } from "@/functions/sites"
import { SourceDataUpdateForm, SourceTag } from "@/functions/server/api-source-data"
import { SourceDataPath } from "@/functions/server/api-all"
import { settings } from "@/functions/setting"
import { artworksToolbar } from "@/scripts/utils"
import { onDOMContentLoaded } from "@/utils/document"
import { Result } from "@/utils/primitives"
import { analyseSearchKeywords, analyseSourceDataFromGalleryDOM, isTagKeyword } from "./utils"

onDOMContentLoaded(async () => {
    console.log("[Hedge v3 Helper] ehentai/global script loaded.")
    const setting = await settings.get()

    if(setting.toolkit.downloadToolbar.enabled) initializeUI()
})

receiveMessageForTab(({ type, msg: _, callback }) => {
    if(type === "REPORT_ARTWORKS_INFO") {
        callback(getArtworksInfo())
    }
    return false
})

/**
 * 进行artworks-toolbar, find-similar相关的UI初始化。
 */
function initializeUI() {
    const divs = [...document.querySelectorAll<HTMLDivElement>(".itg > .gl1t")]

    const nodes = divs.map((item, index) => {
        const anchor = item.querySelector<HTMLAnchorElement>(":scope > a")
        if(!anchor) {
            console.warn(`[initializeUI] Cannot find anchor in div[class="itg > .gl1t"][index=${index}].`)
            return undefined
        }
        const url = new URL(anchor.href)
        const match = url.pathname.match(EHENTAI_CONSTANTS.REGEXES.GALLERY_PATHNAME)
        if(!match || !match.groups) {
            console.warn(`[initializeUI] Cannot analyse URL for a[href=${anchor.href}].`)
            return undefined
        }
        const gid = match.groups["GID"]
        const sourceDataPath: SourceDataPath = {sourceSite: EHENTAI_CONSTANTS.SITE_NAME, sourceId: gid, sourcePart: null, sourcePartName: null}
        const thumbnailSrc = () => {
            const img = item.querySelector<HTMLImageElement>(".gl3t img")
            return img?.src ?? null
        }
        const sourceDataProvider = async () => requestSourceDataOfGallery(anchor.href)
        return {index, element: item, sourceDataPath, thumbnailSrc, downloadURL: null, sourceDataProvider}
    }).filter(item => item !== undefined)
    
    artworksToolbar.config({locale: "ehentai"})
    artworksToolbar.add(nodes)
}

function getArtworksInfo(): Result<{agent: SourceTag | null, agentSite: string, latestPost: string | null, firstPage: boolean}, string> {
    let latestPost: string | null = null, firstPage = true
    const hrefs = [...document.querySelectorAll<HTMLAnchorElement>(".itg > .gl1t > a")].map(a => a.href)
    for(const href of hrefs) {
        const url = new URL(href)
        const match = url.pathname.match(EHENTAI_CONSTANTS.REGEXES.GALLERY_PATHNAME)
        if(match && match.groups) {
            const urlParams = new URLSearchParams(window.location.search)
            latestPost = match.groups["GID"]
            firstPage = !urlParams.has("next") && !urlParams.has("prev")
            break
        }
    }
    const agent = getAgent()
    return {ok: true, value: {agent, agentSite: EHENTAI_CONSTANTS.SITE_NAME, latestPost, firstPage}}
}

function getAgent(): SourceTag | null {
    const matchTag = document.location.pathname.match(EHENTAI_CONSTANTS.REGEXES.HOMEPAGE_TAG_PATHNAME)
    if(matchTag && matchTag.groups) {
        const type = matchTag.groups["TYPE"]
        const name = matchTag.groups["NAME"].replaceAll("+", " ")
        return type === "artist" || type === "group" ? {code: name, name: null, otherName: null, type} : null
    }
    if(EHENTAI_CONSTANTS.REGEXES.HOMEPAGE_PATHNAME.test(document.location.pathname)) {
        const params = new URLSearchParams(document.location.search)
        const search = params.get("f_search")
        if(search) {
            const keywords = analyseSearchKeywords(search)
            for(const keyword of keywords) {
                const tag = isTagKeyword(keyword)
                if(tag && (tag.type === "artist" || tag.type === "group")) {
                    return {code: tag.name, name: null, otherName: null, type: tag.type}
                }
            }
        }
    }
    return null
}

async function requestSourceDataOfGallery(href: string): Promise<Result<SourceDataUpdateForm, string>> {
    const response = await fetch(href)
    if(!response.ok) {
        return {ok: false, err: `Failed to request source data of gallery [href=${href}].`}
    }
    const text = await response.text()
    const doc = new DOMParser().parseFromString(text, "text/html")

    return analyseSourceDataFromGalleryDOM(doc, new URL(href).pathname)
}