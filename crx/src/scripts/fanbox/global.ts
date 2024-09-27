import { FANBOX_CONSTANTS } from "@/functions/sites"
import { documents, onDOMContentLoaded } from "@/utils/document"
import { Result } from "@/utils/primitives"

onDOMContentLoaded(async () => {
    console.log("[Hedge v3 Helper] fanbox/global script loaded.")
    const creatorId = ifAndGetCreator()
    if(creatorId !== null) {
        enableUIOptimize(creatorId)
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
                        const anchors = [...addedNode.querySelectorAll<HTMLAnchorElement>(`h1 > a[href=\"/@${creatorId}\"]`)]
                        if(anchors.length > 0) {
                            callback(anchors)
                            observer.disconnect()
                        }
                    }
                }
            }
        })


        //机制决定img都是懒加载的，此时的img应该都没有src。不过以防万一还是加了初始化容错
        const anchors = [...document.querySelectorAll<HTMLAnchorElement>(`h1 > a[href=\"/@${creatorId}\"]`)]
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
    return match && match.groups ? match.groups["CREATOR"] ?? null : null
}