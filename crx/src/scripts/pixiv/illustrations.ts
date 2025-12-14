import { receiveMessageForTab } from "@/functions/messages"
import { PIXIV_CONSTANTS } from "@/functions/sites"
import { onDOMContentLoaded } from "@/utils/document"
import { Result } from "@/utils/primitives"

onDOMContentLoaded(() => {
    console.log("[Hedge v3 Helper] pixiv/illustrations script loaded.")
})

receiveMessageForTab(({ type, msg: _, callback }) => {
    if(type === "REPORT_ARTWORKS_INFO") {
        callback(getArtworksInfo())
    }
    return false
})

/**
 * 从当前页面查询最新的POST名称。
 */
function getArtworksInfo(): Result<{latestPost: string, firstPage: boolean}, string> {
    const hrefs = [...document.querySelectorAll<HTMLAnchorElement>("ul > li[size='1'][offset='0'] a")].filter(a => a.querySelector("img") === null).map(a => a.href)
    if(hrefs.length <= 0) {
        return {ok: false, err: "No latest post found."}
    }
    for(const href of hrefs) {
        const url = new URL(href)
        const match = url.pathname.match(PIXIV_CONSTANTS.REGEXES.ARTWORK_PATHNAME)
        if(match && match.groups) {``
            const post = match.groups["PID"]
            const urlParams = new URLSearchParams(window.location.search)
            const page = urlParams.has("p") ? parseInt(urlParams.get("p") as string, 10) : 1
            return {ok: true, value: {latestPost: post, firstPage: page === 1}}
        }
    }
    return {ok: false, err: "No available post found."}
}