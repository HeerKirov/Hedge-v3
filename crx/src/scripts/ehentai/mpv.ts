import { SourceDataPath } from "@/functions/server/api-all"
import { EHENTAI_CONSTANTS } from "@/functions/sites"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { onDOMContentLoaded } from "@/utils/document"
import { imageToolbar } from "@/scripts/utils"

onDOMContentLoaded(() => {
    console.log("[Hedge v3 Helper] ehentai/image script loaded.")
    const sourceDataPath = getSourceDataPath()
    sendMessage("SUBMIT_PAGE_INFO", {path: sourceDataPath})

    initializeUI(sourceDataPath)
})

receiveMessageForTab(({ type, msg: _, callback }) => {
    if(type === "REPORT_PAGE_INFO") {
        callback({path: getSourceDataPath()})
    }
    return false
})

/**
 * 进行image-toolbar, find-similar相关的UI初始化。
 */
function initializeUI(sourcePath: SourceDataPath) {
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

        observer.observe(document.querySelector("#pane_images")!, { childList: true, subtree: true })

        //进行一波初始化回调
        const initValues = [...document.querySelectorAll<HTMLDivElement>("#pane_images > div.mimg").values()].filter(n => n.hasChildNodes())
        if(initValues.length > 0) callback(initValues)
    }

    imageToolbar.config({locale: "ehentai-mpv"})
    observeAllPresentations(nodes => imageToolbar.add(nodes.map(node => {
        const index = parseInt(node.id.substring("image_".length))
        const normalURL = (node.querySelector("div.mbar > div > a > img[title=\"Open image in normal viewer\"]")?.parentElement as HTMLAnchorElement)?.href
        const { imageHash } = getIdentityInfo(normalURL)
        return {
            index,
            sourcePath: {...sourcePath, sourcePart: index, sourcePartName: imageHash},
            element: node,
            downloadURL: () => {
                const fullImgURL = node.querySelector<HTMLAnchorElement>("div.mbar > div:first-child > a")?.href
                if(fullImgURL !== undefined) {
                    return fullImgURL
                }else if(node.querySelector("div.mbar > div:first-child > img[title=\"Original Image\"]") !== undefined) {
                    return node.querySelector<HTMLImageElement>(`a > img#imgsrc_${index}`)?.src
                }else{
                    return undefined
                }
            }
        }
    })))

}

/**
 * 获得当前页面的SourceDataPath。需要注意的是，当前页面为mpv页，没有page参数。
 */
function getSourceDataPath(): SourceDataPath {
    const sourceSite = EHENTAI_CONSTANTS.SITE_NAME
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

/**
 * 获得GalleryId、Page和ImageHash。
 */
function getIdentityInfo(viewURL: string): {gid: string, page: number, imageHash: string} {
    const url = new URL(viewURL)
    const match = url.pathname.match(EHENTAI_CONSTANTS.REGEXES.IMAGE_PATHNAME)
    if(match && match.groups) {
        const gid = match.groups["GID"]
        const page = parseInt(match.groups["PAGE"])
        const imageHash = match.groups["PHASH"]
        return {gid, page, imageHash}
    }else{
        throw new Error("Cannot analyse pathname.")
    }
}