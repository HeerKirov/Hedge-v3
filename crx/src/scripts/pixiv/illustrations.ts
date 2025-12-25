import { SourceDataUpdateForm, SourceTag } from "@/functions/server/api-source-data"
import { receiveMessageForTab } from "@/functions/messages"
import { settings } from "@/functions/setting"
import { PIXIV_CONSTANTS } from "@/functions/sites"
import { artworksToolbar } from "@/scripts/utils"
import { onDOMContentLoaded, onObserving } from "@/utils/document"
import { Result } from "@/utils/primitives"
import { analyseSourceDataFromPreloadData } from "./utils"

onDOMContentLoaded(async () => {
    console.log("[Hedge v3 Helper] pixiv/illustrations script loaded.")
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
 * 进行image-toolbar, find-similar相关的UI初始化。
 */
function initializeUI() {
    artworksToolbar.config({locale: "pixiv"})

    onObserving<HTMLDivElement>({
        target: document.querySelector("main")!,
        observe: { childList: true, subtree: true },
        mutation: mutation => {
            const returns = []
            for(const addedNode of mutation.addedNodes) {
                if(addedNode instanceof HTMLElement) {
                    const anchors = addedNode.querySelectorAll<HTMLAnchorElement>("a[data-gtm-value]")
                    for(const anchor of anchors) {
                        if(anchor.href.includes("/artworks/")) {
                            const div = anchor.parentElement?.parentElement?.parentElement as HTMLDivElement
                            returns.push(div)
                        }
                    }
                }
            }
            return returns
        },
        init: () => [...document.querySelectorAll<HTMLDivElement>("ul > li > div")].filter(n => n.querySelector("a[data-gtm-value]"))
    }, (item, index) => {
        const href = item.querySelector<HTMLAnchorElement>("a[data-gtm-value]")!.href
        const hrefURL = new URL(href)
        const match = hrefURL.pathname.match(PIXIV_CONSTANTS.REGEXES.ARTWORK_PATHNAME)
        const sourceDataPath = match && match.groups ? {sourceSite: PIXIV_CONSTANTS.SITE_NAME, sourceId: match.groups["PID"], sourcePart: null, sourcePartName: null} : null
        artworksToolbar.add([{
            index,
            element: item,
            sourceDataPath,
            sourceDataProvider: async () => {
                if(sourceDataPath !== null) {
                    return await requestSourceDataOfArtwork(sourceDataPath.sourceId)
                }
                return {ok: false, err: "Source data path is null."}
            },
            thumbnailSrc: () => {
                const imgSrc = item.querySelector<HTMLImageElement>("img")?.src
                if (!imgSrc) return null
                // Match the path containing /img/YYYY/MM/DD/HH/MM/SS/ID_p*_*
                const match = imgSrc.match(/img\/(\d{4}\/\d{2}\/\d{2}\/\d{2}\/\d{2}\/\d{2})\/(\d+_p\d+)/)
                if (match) {
                    const datePart = match[1] // "2025/09/01/00/00/13"
                    const idPart = match[2]   // "134568849"
                    return `https://i.pximg.net/img-master/img/${datePart}/${idPart}_master1200.jpg`
                }
                return null
            },
            downloadURL: null
        }])
    })
}

/**
 * 从当前页面查询最新的POST名称。
 */
function getArtworksInfo(): Result<{agent: SourceTag | null, agentSite: string, latestPost: string | null, firstPage: boolean}, string> {
    const h1 = document.querySelector("h1")
    const match = document.location.pathname.match(PIXIV_CONSTANTS.REGEXES.ANY_USER_PATHNAME)
    const agent: SourceTag | null = h1 && match?.groups ? {code: match.groups["UID"], name: h1.textContent, otherName: null, type: "artist"} : null

    let latestPost: string | null = null, page: number = 1
    const hrefs = [...document.querySelectorAll<HTMLAnchorElement>("ul > li[size='1'][offset='0'] a")].filter(a => a.querySelector("img") === null).map(a => a.href)
    for(const href of hrefs) {
        const url = new URL(href)
        const match = url.pathname.match(PIXIV_CONSTANTS.REGEXES.ARTWORK_PATHNAME)
        if(match && match.groups) {
            const urlParams = new URLSearchParams(window.location.search)
            latestPost = match.groups["PID"]
            page = urlParams.has("p") ? parseInt(urlParams.get("p") as string, 10) : 1
            break
        }
    }
    return {ok: true, value: {agent, agentSite: PIXIV_CONSTANTS.SITE_NAME, latestPost, firstPage: page === 1}}
}

/**
 * 使用API直接请求对应artworks的来源数据。
 */
async function requestSourceDataOfArtwork(artworksId: string): Promise<Result<SourceDataUpdateForm, string>> {
    const response = await fetch(`/ajax/illust/${artworksId}?lang=zh`)
    if(!response.ok) {
        return {ok: false, err: `Failed to request source data of artwork [artworksId=${artworksId}].`}
    }
    const json = await response.json()
    
    return analyseSourceDataFromPreloadData(json)
}