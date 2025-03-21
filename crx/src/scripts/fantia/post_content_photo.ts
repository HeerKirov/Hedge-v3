import { SourceDataPath } from "@/functions/server/api-all"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { FANTIA_CONSTANTS } from "@/functions/sites"
import { similarFinder } from "@/scripts/utils"
import { onDOMContentLoaded } from "@/utils/document"

onDOMContentLoaded(() => {
    console.log("[Hedge v3 Helper] fantia/photo script loaded.")
    const sourceDataPath = getSourceDataPath()
    sendMessage("SUBMIT_PAGE_INFO", {path: sourceDataPath})
})

receiveMessageForTab(({ type, msg: _, callback }) => {
    if(type === "REPORT_PAGE_INFO") {
        callback({path: getSourceDataPath()})
    }else if(type === "QUICK_FIND_SIMILAR") {
        const sourceDataPath = getSourceDataPath()
        sendMessage("GET_SOURCE_DATA", {sourceSite: sourceDataPath.sourceSite, sourceId: sourceDataPath.sourceId}).then(sourceData => {
            const file = document.querySelector<HTMLImageElement>("img")
            similarFinder.quickFind(file?.src, sourceDataPath, sourceData !== null ? {ok: true, value: sourceData} : {ok: false, err: "Source data from manager is null."})
        })
    }
    return false
})

/**
 * 获得当前页面的SourceDataPath。
 */
function getSourceDataPath(): SourceDataPath {
    const sourceSite = FANTIA_CONSTANTS.SITE_NAME
    const { pid, page, pageId } = getIdentityInfo()
    return {sourceSite, sourceId: pid, sourcePart: page, sourcePartName: pageId}
}

/**
 * 获得PID, 页码，和页ID
 */
function getIdentityInfo(): {pid: string, page: number, pageId: string} {
    const re = FANTIA_CONSTANTS.REGEXES.PHOTO_PATHNAME
    let page: number
    if(document.location.hash.startsWith('#')) {
        page = parseInt(document.location.hash.substring(1))
    }else{
        throw new Error("Cannot find page num from 'location.hash'.")
    }
    const match = document.location.pathname.match(re)

    if(match && match.groups) {
        const pid = match.groups["PID"]
        const pageId = match.groups["PNAME"]
        return {pid, page, pageId}
    }else{
        throw new Error("Cannot analyse pathname.")
    }
}
