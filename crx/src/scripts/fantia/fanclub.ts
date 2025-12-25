import { FANTIA_CONSTANTS } from "@/functions/sites"
import { onDOMContentLoaded } from "@/utils/document"
import { Result } from "@/utils/primitives"
import { receiveMessageForTab } from "@/functions/messages"
import { SourceTag } from "@/functions/server/api-source-data"
import { analyseArtistFromDOM } from "./utils"

onDOMContentLoaded(async () => {
    console.log("[Hedge v3 Helper] fantia/fanclub script loaded.")
})

receiveMessageForTab(({ type, msg: _, callback }) => {
    if(type === "REPORT_ARTWORKS_INFO") {
        callback(getArtworksInfo())
    }
    return false
})

function getArtworksInfo(): Result<{agent: SourceTag | null, agentSite: string, latestPost: string | null, firstPage: boolean}, string> {
    let latestPost: string | null = null, firstPage = true

    const hrefs = [...document.querySelectorAll<HTMLAnchorElement>(".post > a")].map(a => a.href)
    for(const href of hrefs) {
        const url = new URL(href)
        const match = url.pathname.match(FANTIA_CONSTANTS.REGEXES.POST_PATHNAME)
        if(match && match.groups) {
            latestPost = match.groups["PID"]
            break
        }
    }

    if(FANTIA_CONSTANTS.REGEXES.USER_POSTS_PATHNAME.test(document.location.pathname)) {
        const page = new URLSearchParams(window.location.search).get("page")
        if(page) firstPage = parseInt(page) === 1
    }

    const artistResponse = analyseArtistFromDOM(document)

    const agent: SourceTag | null = artistResponse.ok ? {code: artistResponse.value.code, name: artistResponse.value.name ?? null, otherName: artistResponse.value.otherName ?? null, type: "artist"} : null

    return {ok: true, value: {agent, agentSite: FANTIA_CONSTANTS.SITE_NAME, latestPost, firstPage}}
}