import { receiveMessageForTab } from "@/functions/messages"
import { SourceTag } from "@/functions/server/api-source-data"
import { KEMONO_CONSTANTS } from "@/functions/sites"
import { onDOMContentLoaded } from "@/utils/document"
import { Result } from "@/utils/primitives"

onDOMContentLoaded(() => {
    console.log("[Hedge v3 Helper] kemono/posts script loaded.")
})

receiveMessageForTab(({ type, msg: _, callback }) => {
    if(type === "REPORT_ARTWORKS_INFO") {
        callback(getArtworksInfo())
    }
    return false
})

function getArtworksInfo(): Result<{agent: SourceTag | null, agentSite: string, latestPost: string | null, firstPage: boolean}, string> {
    let latestPost: string | null = null, firstPage = true, agentSite = KEMONO_CONSTANTS.SITE_NAME, userId: string | null = null
    const hrefs = [...document.querySelectorAll<HTMLAnchorElement>(".post-card > a")].map(a => a.href)
    for(const href of hrefs) {
        const url = new URL(href)
        const match = url.pathname.match(KEMONO_CONSTANTS.REGEXES.POST_PATHNAME)
        if(match && match.groups) {
            const urlParams = new URLSearchParams(window.location.search)
            latestPost = match.groups["PID"]
            firstPage = !urlParams.has("o")
            break
        }
    }

    const match = document.location.pathname.match(KEMONO_CONSTANTS.REGEXES.USER_POSTS_PATHNAME)
    if(match && match.groups) {
        agentSite = match.groups["SITE"]
        userId = match.groups["UID"]
    }
    
    const agent: SourceTag | null = userId ? {code: userId, name: userId, otherName: null, type: "artist"} : null
    return {ok: true, value: {agent, agentSite, latestPost, firstPage}}
}