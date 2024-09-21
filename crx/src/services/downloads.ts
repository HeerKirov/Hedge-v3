import { SourceDataPath } from "@/functions/server/api-all"
import { Setting, settings } from "@/functions/setting"
import { sessions } from "@/functions/storage"
import { sourceDataManager } from "@/services/source-data"
import { NOTIFICATIONS } from "@/services/notification"

export async function downloadURL(options: {url: string, referrer: string, sourcePath?: SourceDataPath}) {
    if(!options.url.trim()) {
        chrome.notifications.create(NOTIFICATIONS.AUTO_COLLECT_SERVER_DISCONNECTED, {
            type: "basic",
            iconUrl: "/public/favicon.png",
            title: "下载文件失败",
            message: "下载URL为空。"
        })
        return
    }
    await sessions.cache.downloadItemInfo.set(options.url, {referrer: options.referrer ?? "", sourcePath: options.sourcePath})
    await chrome.downloads.download({url: options.url})
}

/**
 * 功能：文件下载重命名建议模块。
 * 它首先根据download.url，提取附加信息。
 * 附加信息中存在sourcePath时，将其作为downloadToolbar的下载项处理。此时仅根据来源信息按照固定模板重命名，并且根据选项收集来源数据。
 * 不存在sourcePath时，走determiningFilename功能，首先经扩展名过滤，其次经规则匹配后，对其进行重命名。
 */
export function determiningFilename(downloadItem: chrome.downloads.DownloadItem, suggest: (suggestion?: chrome.downloads.DownloadFilenameSuggestion) => void): boolean | void {
    console.log(downloadItem)
    const [ filenameWithoutExt, extension ] = splitNameAndExtension(downloadItem.filename)

    settings.get().then(async setting => {
        const url = downloadItem.url
        const info = await sessions.cache.downloadItemInfo.get(url)
        try {
            if(info?.sourcePath) {
                console.log(`[determiningFilename] url=[${url}], source=[${info.sourcePath.sourceSite}-${info.sourcePath.sourceId}/p${info.sourcePath.sourcePart}/${info.sourcePath.sourcePartName}], filename=[${filenameWithoutExt}]`)
                suggest({filename: generateSourceName(info.sourcePath) + (extension ? "." + extension : "")})
                if(setting.toolkit.downloadToolbar.autoCollectSourceData && !await sessions.cache.closeAutoCollect()) await sourceDataManager.collect({...info.sourcePath, type: "auto"})
            }else{
                console.log(`[determiningFilename] url=[${url}], referrer=[${info?.referrer ?? downloadItem.referrer}], filename=[${filenameWithoutExt}]`)
                if(!extension || !setting.toolkit.determiningFilename.extensions.includes(extension)) {
                    suggest()
                    return
                }
                const result = matchRulesAndArgs(info?.referrer ?? downloadItem.referrer, url, filenameWithoutExt, setting)
                if(result === null) {
                    suggest()
                    return
                }
                suggest({filename: replaceWithArgs(result.rename, result.args) + (extension ? "." + extension : "")})
            }
        }finally{
            await sessions.cache.downloadItemInfo.del(url)
        }
    })

    return true
}

/**
 * 将文件名分隔为不包含扩展名的名称部分和扩展名。
 */
function splitNameAndExtension(filename: string): [string, string | null] {
    const i = filename.lastIndexOf(".")
    return i >= 0 ? [filename.substring(0, i), filename.substring(i + 1)] : [filename, null]
}

/**
 * 对给出的项，逐规则进行匹配，发现完成匹配的规则，返回此规则与匹配获得的参数。
 */
function matchRulesAndArgs(referrer: string, url: string, filename: string, setting: Setting): {rename: string, args: Record<string, string>} | null {
    function match(re: RegExp, goal: string, args: Record<string, string>): boolean {
        const matches = re.exec(goal)
        if(matches) {
            if(matches.groups) Object.entries(matches.groups).forEach(([k, v]) => args[k] = v)
            return true
        }else{
            return false
        }
    }

    for(const rule of setting.toolkit.determiningFilename.rules) {
        const args: Record<string, string> = {}
        if(rule.referrer && !match(new RegExp(rule.referrer), referrer, args)) continue
        if(rule.url && !match(new RegExp(rule.url), url, args)) continue
        if(rule.filename && !match(new RegExp(rule.filename), filename, args)) continue

        return {rename: rule.rename, args}
    }
    
    return null
}

/**
 * 替换模板中的所有参数，生成字符串。
 */
function replaceWithArgs(template: string, args: Record<string, string>): string {
    return Object.entries(args).reduce((name, [key, value]) => name.replace(`$<${key}>`, value), template)
}

/**
 * 将sourcePath拼接成标准文件名。
 */
function generateSourceName(sourcePath: SourceDataPath): string {
    return `${sourcePath.sourceSite}_${sourcePath.sourceId}`
        + (sourcePath.sourcePart !== null ? `_${sourcePath.sourcePart}` : '')
        + (sourcePath.sourcePartName !== null ? `_${sourcePath.sourcePartName}` : '')
}