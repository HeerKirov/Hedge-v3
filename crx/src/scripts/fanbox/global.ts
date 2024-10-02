import { FANBOX_CONSTANTS } from "@/functions/sites"
import { settings } from "@/functions/setting"
import { documents, onDOMContentLoaded } from "@/utils/document"
import { Result } from "@/utils/primitives"

onDOMContentLoaded(async () => {
    console.log("[Hedge v3 Helper] fanbox/global script loaded.")

    const creatorId = ifAndGetCreator()
    if(creatorId !== null) {
        const setting = await settings.get()
        if(setting.website.fanbox.enableUIOptimize) {
            enableUIOptimize(creatorId)
        }
    }
})

/**
 * 功能：修改UI。
 * - 在creator name后添加creatorId和userId的显示。
 */
function enableUIOptimize(creatorId: string) {
    function observeCreatorHeader(callback: (anchors: HTMLAnchorElement[]) => void) {
        const observer = new MutationObserver(mutationsList => {
            for(const mutation of mutationsList) {
                for(const addedNode of mutation.addedNodes) {
                    if(addedNode instanceof HTMLElement) {
                        const anchors = [...addedNode.querySelectorAll<HTMLAnchorElement>("h1 > a")]
                        if(anchors.length > 0) {
                            callback(anchors)
                            observer.disconnect()
                        }
                    }
                }
            }
        })

        const anchors = [...document.querySelectorAll<HTMLAnchorElement>("h1 > a")]
        if(anchors.length > 0) {
            callback(anchors)
            observer.disconnect()
        }else{
            observer.observe(document.body, { childList: true, subtree: true })
        }
    }

    const creatorInfoPromise = fetchCreatorInfo(creatorId)

    observeCreatorHeader(async anchors => {
        const creatorInfo = await creatorInfoPromise
        const userId = creatorInfo.ok ? creatorInfo.value["user"]["userId"] : null
        for(const anchor of anchors) {
            anchor.after(
                documents.createElement("span", {"style": "font-size: 1rem; margin-left: 8px; -webkit-user-select: none"}, ["(@"]),
                documents.createElement("span", {"style": "font-size: 1rem"}, [creatorId]),
                documents.createElement("span", {"style": "font-size: 1rem; margin-left: 2px; -webkit-user-select: none"}, ["/#"]),
                documents.createElement("span", {"style": "font-size: 1rem"}, [userId]),
                documents.createElement("span", {"style": "font-size: 1rem; margin-left: 2px; -webkit-user-select: none"}, [")"]),
            )
        }
    })
}

/**
 * 根据creatorId，获得creator的信息。
 */
async function fetchCreatorInfo(creatorId: string): Promise<Result<any, string>> {
    try {
        const response = await fetch(`https://api.fanbox.cc/creator.get?creatorId=${creatorId}`, {credentials: "include"})
        if(response.ok) {
            return {ok: true, value: (await response.json())["body"]}
        }else{
            const body = await response.text()
            console.error("[fetchCreatorInfo] Fetch error.", body)
            return {ok: false, err: body}
        }
    }catch(err) {
        console.error("[fetchCreatorInfo] Fetch connection error.", err)
        return {ok: false, err: err instanceof Error ? err.message : typeof err === "string" ? err : (err?.toString() ?? "")}
    }
}

/**
 * 如果当前页面是任意@creator页，返回creatorId。否则返回null。
 */
function ifAndGetCreator(): string | null {
    const match = document.location.pathname.match(FANBOX_CONSTANTS.REGEXES.ANY_CREATOR_PATHNAME)
    if(FANBOX_CONSTANTS.HOSTS.includes(document.location.host) && match && match.groups && match.groups["CREATOR"]) {
        return match.groups["CREATOR"]
    }
    const match2 = document.location.host.match(FANBOX_CONSTANTS.REGEXES.HOST)
    if(match2 && match2.groups && match2.groups["CREATOR"] && match2.groups["CREATOR"] !== "www") {
        return match2.groups["CREATOR"]
    }
    return null
}