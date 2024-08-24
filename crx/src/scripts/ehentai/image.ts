import { SourceDataPath } from "@/functions/server/api-all"
import { Setting, settings } from "@/functions/setting"
import { sessions } from "@/functions/storage"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { EHENTAI_CONSTANTS } from "@/functions/sites"
import { initializeUI, QuickFindController } from "@/scripts/utils"
import { onDOMContentLoaded } from "@/utils/document"

let ui: QuickFindController | undefined

onDOMContentLoaded(async () => {
    console.log("[Hedge v3 Helper] ehentai/image script loaded.")
    const setting = await settings.get()
    loadActiveTabInfo(setting)
    loadGalleryPageHash()
    if(setting.tool.ehentai.enableUIOptimize) enableOptimizeUI()
    ui = initializeUI()
})

chrome.runtime.onMessage.addListener(receiveMessageForTab(({ type, msg: _, callback }) => {
    if(type === "REPORT_SOURCE_DATA_PATH") {
        settings.get().then(setting => {
            callback(reportSourceDataPath(setting))
        })
        return true
    }else if(type === "QUICK_FIND_SIMILAR") {
        settings.get().then(async setting => {
            const sourceDataPath = reportSourceDataPath(setting)
            const sourceData = await sendMessage("GET_SOURCE_DATA", {siteName: "ehentai", sourceId: sourceDataPath.sourceId})
            const files = [...document.querySelectorAll<HTMLImageElement>("div#i3 img#img")]
            if(ui) {
                const f = await Promise.all(files.map(f => ui!.getImageDataURL(f)))
                ui!.openQuickFindModal(setting, f.length > 0 ? f[0] : undefined, sourceDataPath, sourceData)
            }
        })
        return false
    }else{
        return false
    }
}))

/**
 * 加载active tab在action badge上的标示信息。
 */
function loadActiveTabInfo(setting: Setting) {
    const sourceDataPath = reportSourceDataPath(setting)
    sendMessage("SET_ACTIVE_TAB_BADGE", {path: sourceDataPath})
}

/**
 * 加载gallery page数据。将image hash信息保存到session。
 */
function loadGalleryPageHash() {
    const { gid, page, imageHash } = getIdentityInfo()
    sessions.reflect.ehentaiGalleryImageHash.set({gid: gid.toString(), page: page.toString()}, {imageHash}).finally()
}

/**
 * 功能：UI优化。
 * - 使title标题始终保持单行。
 * - 使底部工具栏始终保持单行。
 * - 有些图像没有最下方的图像下载链接，因为加载的图像就是它们的原图像。为保持操作统一，添加了一个下载链接，用扩展API实现其下载操作。
 * - 有下载链接的，将链接也替换为扩展API实现。
 */
function enableOptimizeUI() {
    const h1 = document.querySelector<HTMLHeadingElement>("div.sni h1")
    if(h1) {
        h1.style.overflow = "hidden"
        h1.style.textOverflow = "ellipsis"
        h1.style.whiteSpace = "nowrap"
    }

    const i1 = document.querySelector<HTMLDivElement>("#i1")
    if(i1) {
        i1.style.minWidth = "740px"
    }

    const i6 = document.querySelector<HTMLDivElement>("#i6")
    if(!i6) {
        console.warn("[enableOptimizeUI] Cannot find div#i6.")
        return
    }else{
        i6.style.flexFlow = "row nowrap"
    }

    if(i6.childElementCount === 4) {
        //4个元素表明此图像有original，最后一个元素的下载链接就是original的链接
        const anchor = document.querySelector<HTMLAnchorElement>("#i6 div:last-child a")
        if(!anchor) {
            console.warn("[enableOptimizeUI] Cannot find #i6 div a.")
            return
        }

        const url = anchor.href
        anchor.onclick = (e: MouseEvent) => {
            console.log(e, url, document.URL);
            (e.target as HTMLAnchorElement).style.color = "burlywood"
            sendMessage("DOWNLOAD_URL", {url, referrer: document.URL})
            return false
        }
    }else if(i6.childElementCount === 3) {
        //只有3个元素表明此图像没有original，使用直接下载链接，因此需要在下方补充一个下载链接
        const img = document.querySelector<HTMLImageElement>("#img")
        if(!img) {
            console.warn("[enableOptimizeUI] Cannot find #img.")
            return
        }

        const i = document.createElement("img")
        i.src = "https://ehgt.org/g/mr.gif"
        i.className = "mr"

        const anchor = document.createElement("a")
        anchor.textContent = "(Download original from img link)"
        anchor.style.cursor = "pointer"
        anchor.onclick = (e: MouseEvent) => {
            (e.target as HTMLAnchorElement).style.color = "burlywood"
            sendMessage("DOWNLOAD_URL", {url: img.src, referrer: document.URL})
            return false
        }

        const div = document.createElement("div")
        div.appendChild(document.createTextNode(" "))
        div.appendChild(i)
        div.appendChild(anchor)

        i6.appendChild(div)
    }else{
        console.warn(`[enableOptimizeUI] div#i6 has ${i6.childElementCount} div. its illegal.`)
    }
}

/**
 * 事件：获得当前页面的SourceDataPath。当前页面为image页，可以获得gid、page和imageHash。
 */
function reportSourceDataPath(setting: Setting): SourceDataPath {
    const overrideRule = setting.sourceData.overrideRules["ehentai"]
    const sourceSite = overrideRule?.sourceSite ?? "ehentai"
    const { gid, page, imageHash } = getIdentityInfo()
    return {sourceSite, sourceId: gid, sourcePart: page, sourcePartName: imageHash}
}

/**
 * 获得GalleryId、Page和ImageHash。
 */
function getIdentityInfo(): {gid: string, page: number, imageHash: string} {
    const re = EHENTAI_CONSTANTS.REGEXES.IMAGE_PATHNAME
    const match = document.location.pathname.match(re)
    if(match && match.groups) {
        const gid = match.groups["GID"]
        const page = parseInt(match.groups["PAGE"])
        const imageHash = match.groups["PHASH"]
        return {gid, page, imageHash}
    }else{
        throw new Error("Cannot analyse pathname.")
    }
}
