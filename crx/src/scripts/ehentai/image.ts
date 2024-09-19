import { SourceDataPath } from "@/functions/server/api-all"
import { Setting, settings } from "@/functions/setting"
import { sessions } from "@/functions/storage"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { EHENTAI_CONSTANTS } from "@/functions/sites"
import { initializeQuickFindUI, QuickFindController } from "@/scripts/utils"
import { imageToolbar } from "@/scripts/utils/image-toolbar.tsx"
import { onDOMContentLoaded } from "@/utils/document"

let quickFind: QuickFindController | undefined

onDOMContentLoaded(async () => {
    console.log("[Hedge v3 Helper] ehentai/image script loaded.")
    const setting = await settings.get()
    const sourceDataPath = getSourceDataPath(setting)
    sendMessage("SUBMIT_PAGE_INFO", {path: sourceDataPath})

    const { gid, page, imageHash } = getIdentityInfo()
    sessions.reflect.ehentaiGalleryImageHash.set({gid, page: page.toString()}, {imageHash}).finally()

    if(setting.tool.ehentai.enableUIOptimize) enableOptimizeUI()

    quickFind = initializeQuickFindUI()

    initializeUI(page)
})

receiveMessageForTab(({ type, msg: _, callback }) => {
    if(type === "REPORT_PAGE_INFO") {
        settings.get().then(setting => {
            callback({path: getSourceDataPath(setting)})
        })
        return true
    }else if(type === "QUICK_FIND_SIMILAR") {
        settings.get().then(async setting => {
            const sourceDataPath = getSourceDataPath(setting)
            const sourceData = await sendMessage("GET_SOURCE_DATA", {sourceSite: "ehentai", sourceId: sourceDataPath.sourceId})
            const files = [...document.querySelectorAll<HTMLImageElement>("div#i3 img#img")]
            if(quickFind) {
                const f = await Promise.all(files.map(f => quickFind!.getImageDataURL(f)))
                quickFind!.openQuickFindModal(setting, f.length > 0 ? f[0] : undefined, sourceDataPath, sourceData !== null ? {ok: true, value: sourceData} : {ok: false, err: "Source data from manager is null."})
            }
        })
        return false
    }else{
        return false
    }
})


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
}

/**
 * 进行image-toolbar, find-similar相关的UI初始化。
 */
function initializeUI(page: number) {
    const i3 = document.querySelector<HTMLDivElement>("#i3")
    if(!i3) {
        console.warn("[initializeUI] Cannot find div#i3.")
        return
    }
    const i6 = document.querySelector<HTMLDivElement>("#i6")
    if(!i6) {
        console.warn("[initializeUI] Cannot find div#i6.")
        return
    }
    let downloadURL: string
    if(i6.childElementCount === 4) {
        //4个元素表明此图像有original，最后一个元素的下载链接就是original的链接
        const anchor = document.querySelector<HTMLAnchorElement>("#i6 div:last-child a")
        if(!anchor) {
            console.warn("[initializeUI] Cannot find #i6 div a.")
            return
        }
        downloadURL = anchor.href
    }else if(i6.childElementCount === 3) {
        //只有3个元素表明此图像没有original，使用直接使用图像地址
        const img = document.querySelector<HTMLImageElement>("#img")
        if(!img) {
            console.warn("[initializeUI] Cannot find #img.")
            return
        }
        downloadURL = img.src
    }else{
        console.warn(`[initializeUI] div#i6 has ${i6.childElementCount} div. it is unexpect.`)
        return
    }
    imageToolbar.locale("ehentai-image")
    imageToolbar.add([{index: page, element: i3, downloadURL}])
}

/**
 * 获得当前页面的SourceDataPath。当前页面为image页，可以获得gid、page和imageHash。
 */
function getSourceDataPath(setting: Setting): SourceDataPath {
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
