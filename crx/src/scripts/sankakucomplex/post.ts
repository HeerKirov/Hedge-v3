import { SourceDataPath } from "@/functions/server/api-all"
import { settings } from "@/functions/setting"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { SANKAKUCOMPLEX_CONSTANTS } from "@/functions/sites"
import { imageToolbar, similarFinder } from "@/scripts/utils"
import { onDOMContentLoaded } from "@/utils/document"
import { analyseDownloadURLFromPostDOM, analyseSourceDataFromPostDOM } from "./utils"

onDOMContentLoaded(async () => {
    console.log("[Hedge v3 Helper] sankakucomplex/post script loaded.")
    const setting = await settings.get()
    const sourceDataPath = getSourceDataPath()
    const sourceData = analyseSourceDataFromPostDOM(document)
    sendMessage("SUBMIT_PAGE_INFO", {path: sourceDataPath})
    sendMessage("SUBMIT_SOURCE_DATA", {path: sourceDataPath, data: sourceData})

    if(setting.website.sankakucomplex.enableUIOptimize) enableUIOptimize()

    if(setting.toolkit.downloadToolbar.enabled) initializeUI(sourceDataPath)
})

receiveMessageForTab(({ type, msg: _, callback }) => {
    if(type === "REPORT_SOURCE_DATA") {
        callback(analyseSourceDataFromPostDOM(document))
    }else if(type === "REPORT_PAGE_INFO") {
        callback({path: getSourceDataPath()})
    }else if(type === "QUICK_FIND_SIMILAR") {
        const sourceDataPath = getSourceDataPath()
        const sourceData = analyseSourceDataFromPostDOM(document)
        const file = document.querySelector<HTMLImageElement>("a#image-link img#image")
        similarFinder.quickFind(file?.src, sourceDataPath, sourceData)
    }
    return false
})

/**
 * 功能：进行UI优化
 * - legacy的post页面的Book清单只能通向beta Book。把legacy的加回去。
 * - 移除"查看原始图像"的notice
 */
function enableUIOptimize() {
    //移除origin image notice
    const resizedNotice = document.querySelector("#resized_notice")
    if(resizedNotice) resizedNotice.remove()
}

/**
 * 进行image-toolbar, find-similar相关的UI初始化。
 */
function initializeUI(sourcePath: SourceDataPath) {
    const { downloadURL, thumbnailURL, element } = analyseDownloadURLFromPostDOM(document)

    if(downloadURL) {
        imageToolbar.config({locale: "sankaku"})
        imageToolbar.add([{index: null, element, sourcePath, downloadURL, thumbnailSrc: thumbnailURL}])
    }
}

/**
 * 获得当前页面的SourceDataPath。
 */
function getSourceDataPath(): SourceDataPath {
    const sourceSite = SANKAKUCOMPLEX_CONSTANTS.SITE_NAME
    const pid = getPID()
    return {sourceSite, sourceId: pid, sourcePart: null, sourcePartName: null}
}

/**
 * 获得PID。
 */
function getPID(): string {
    const res = SANKAKUCOMPLEX_CONSTANTS.REGEXES.POST_PATHNAME.exec(document.location.pathname)
    if(res && res.groups) {
        return res.groups["PID"]
    }else{
        throw new Error("Cannot analyse pathname.")
    }
}
