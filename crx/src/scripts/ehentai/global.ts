import { receiveMessageForTab } from "@/functions/messages"
import { EHENTAI_CONSTANTS } from "@/functions/sites"
import { onDOMContentLoaded } from "@/utils/document"
import { Result } from "@/utils/primitives"

onDOMContentLoaded(() => {
    console.log("[Hedge v3 Helper] ehentai/global script loaded.")
})

receiveMessageForTab(({ type, msg: _, callback }) => {
    if(type === "REPORT_ARTWORKS_INFO") {
        callback(getArtworksInfo())
    }
    return false
})

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