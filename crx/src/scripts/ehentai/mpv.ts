import { SourceDataPath } from "@/functions/server/api-all"
import { EHENTAI_CONSTANTS } from "@/functions/sites"
import { Setting, settings } from "@/functions/setting"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { onDOMContentLoaded } from "@/utils/document"
import { imageToolbar } from "@/scripts/utils"


onDOMContentLoaded(async () => {
    console.log("[Hedge v3 Helper] ehentai/image script loaded.")
    const setting = await settings.get()
    const sourceDataPath = getSourceDataPath(setting)
    sendMessage("SUBMIT_PAGE_INFO", {path: sourceDataPath})

    initializeUI()
})

receiveMessageForTab(({ type, msg: _, callback }) => {
    if(type === "REPORT_PAGE_INFO") {
        settings.get().then(setting => {
            callback({path: getSourceDataPath(setting)})
        })
        return true
    }else{
        return false
    }
})

/**
 * 进行image-toolbar, find-similar相关的UI初始化。
 */
function initializeUI() {
    function observeAllPresentations(callback: (nodes: HTMLDivElement[]) => void) {
        const observer = new MutationObserver(mutationsList => {
            const values: HTMLDivElement[] = []
            for(const mutation of mutationsList) {
                if(mutation.type === "childList" && mutation.target instanceof HTMLDivElement && mutation.target.id.startsWith("image_")) {
                    const i0 = mutation.addedNodes.item(0)
                    const i2 = mutation.addedNodes.item(2)
                    if(i0 instanceof HTMLAnchorElement && i2 instanceof HTMLDivElement && i2.classList.contains("mbar")) {
                        values.push(mutation.target)
                    }
                }
            }
            if(values.length > 0) callback(values)
        })

        observer.observe(document.querySelector("#pane_images_inner")!, { childList: true, subtree: true })

        //进行一波初始化回调
        const initValues = [...document.querySelectorAll<HTMLDivElement>("#pane_images_inner > div.mimg").values()].filter(n => n.hasChildNodes())
        if(initValues.length > 0) callback(initValues)
    }

    imageToolbar.locale("ehentai-mpv")
    observeAllPresentations(nodes => imageToolbar.add(nodes.map(node => ({
        index: parseInt(node.id.substring("image_".length)),
        element: node,
        downloadURL: () => node.querySelector<HTMLAnchorElement>("div.mbar > div:first-child > a")?.href
    }))))

}

/**
 * 获得当前页面的SourceDataPath。需要注意的是，当前页面为mpv页，没有page参数。
 */
function getSourceDataPath(setting: Setting): SourceDataPath {
    const overrideRule = setting.sourceData.overrideRules["ehentai"]
    const sourceSite = overrideRule?.sourceSite ?? "ehentai"
    const gid = getGalleryId()
    return {sourceSite, sourceId: gid, sourcePart: null, sourcePartName: null}
}

/**
 * 获得GalleryId。
 */
function getGalleryId(): string {
    const match = document.location.pathname.match(EHENTAI_CONSTANTS.REGEXES.MPV_PATHNAME)
    if(match && match.groups) {
        return match.groups["GID"]
    }else{
        throw new Error("Cannot analyse pathname.")
    }
}
