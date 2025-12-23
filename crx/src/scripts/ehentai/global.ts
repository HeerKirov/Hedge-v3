import { receiveMessageForTab } from "@/functions/messages"
import { EHENTAI_CONSTANTS } from "@/functions/sites"
import { SourceDataUpdateForm } from "@/functions/server/api-source-data"
import { SourceDataPath } from "@/functions/server/api-all"
import { artworksToolbar } from "@/scripts/utils"
import { onDOMContentLoaded } from "@/utils/document"
import { Result } from "@/utils/primitives"
import { analyseSourceDataFromGalleryDOM } from "./utils"

onDOMContentLoaded(() => {
    console.log("[Hedge v3 Helper] ehentai/global script loaded.")

    initializeUI()
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

function getArtworksInfo(): Result<{latestPost: string, firstPage: boolean}, string> {
    const hrefs = [...document.querySelectorAll<HTMLAnchorElement>(".itg > .gl1t > a")].map(a => a.href)
    if(hrefs.length <= 0) {
        return {ok: false, err: "No latest post found."}
    }
    for(const href of hrefs) {
        const url = new URL(href)
        const match = url.pathname.match(EHENTAI_CONSTANTS.REGEXES.GALLERY_PATHNAME)
        if(match && match.groups) {
            const post = match.groups["GID"]
            const urlParams = new URLSearchParams(window.location.search)
            const firstPage = !urlParams.has("next") && !urlParams.has("prev")
            return {ok: true, value: {latestPost: post, firstPage}}
        }
    }
    return {ok: false, err: "No available post found."}
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