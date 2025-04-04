import { SourceDataPath } from "@/functions/server/api-all"
import { Setting, settings } from "@/functions/setting"
import { sessions } from "@/functions/storage"
import { ATTACHMENT_RULES, DETERMINING_RULES } from "@/functions/sites"
import { sourceDataManager } from "@/services/source-data"
import { notify } from "@/services/notification"

export async function downloadURL(options: {url: string, sourcePath?: SourceDataPath, collectSourceData?: boolean}) {
    if(!options.url.trim()) {
        notify({
            title: "下载文件失败",
            message: "下载URL为空。"
        })
        return
    }
    if(options.sourcePath !== undefined) {
        await sessions.cache.downloadItemInfo.set(options.url, {sourcePath: options.sourcePath, collectSourceData: options.collectSourceData ?? false})
    }
    await chrome.downloads.download({url: options.url})
}

/**
 * 功能：文件下载重命名建议模块。
 * 它首先根据download.url，提取附加信息。
 * 附加信息中存在sourcePath时，将其作为downloadToolbar的下载项处理。此时仅根据来源信息按照固定模板重命名，并且根据选项收集来源数据。
 * 不存在sourcePath时，走determiningFilename功能，首先经扩展名过滤，其次经规则匹配后，对其进行重命名。
 */
export function determiningFilename(downloadItem: chrome.downloads.DownloadItem, suggest: (suggestion?: chrome.downloads.DownloadFilenameSuggestion) => void): boolean | void {
    const [ filenameWithoutExt, extension ] = splitNameAndExtension(downloadItem.filename)

    settings.get().then(async setting => {
        const url = downloadItem.url
        const info = await sessions.cache.downloadItemInfo.get(url)
        if(info) {
            //在从info提取获得文件名时，此文件是通过download API指定下载的。使用已准备好的文件名。
            console.log(`[determiningFilename] url=[${url}], filename=[${filenameWithoutExt}]`)
            const filename = generateSourceName(info.sourcePath)
            suggest({filename: filename + (extension ? "." + extension : "")})
            if(info.collectSourceData && setting.toolkit.downloadToolbar.autoCollectSourceData && !await sessions.cache.closeAutoCollect()) {
                await sourceDataManager.collect({...info.sourcePath, type: "auto"})
            }
        }else{
            //否则，此文件是用户行为触发的下载。使用建议规则集。
            console.log(`[determiningFilename] url=[${url}], referrer=[${downloadItem.referrer}], filename=[${filenameWithoutExt}]`)
            if(!extension) {
                suggest()
                return
            }
            if(setting.toolkit.determiningFilename.enabled && (BUILTIN_EXTENSIONS.includes(extension) || setting.toolkit.determiningFilename.extensions.includes(extension))) {
                const result = await matchRulesAndArgs(downloadItem.referrer, url, filenameWithoutExt, setting)
                if(result !== null) {
                    suggest({filename: result.determining + (extension ? "." + extension : "")})
                    if(result.sourcePath !== null && setting.toolkit.downloadToolbar.autoCollectSourceData && !await sessions.cache.closeAutoCollect()) {
                        await sourceDataManager.collect({...result.sourcePath, type: "auto"})
                    }
                    return
                }
            }
            if(setting.toolkit.determiningFilename.enabledAttachment && EXTENDED_EXTENSIONS.includes(extension)) {
                const result = matchAttachmentRulesAndArgs(downloadItem.referrer, url, filenameWithoutExt)
                if(result !== null) {
                    suggest({filename: result.prefix + filenameWithoutExt + (extension ? "." + extension : "")})
                    if(result.sourcePath !== null && setting.toolkit.downloadToolbar.autoCollectSourceData && !await sessions.cache.closeAutoCollect()) {
                        await sourceDataManager.collect({...result.sourcePath, type: "auto"})
                    }
                    return
                }
            }
            suggest()
        }
        //tips: info的信息不应该被移除。当文件下载失败时，它还会再走一次determiningFilename机制，此时就会出现找不到info而出现默认命名的情况
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
 * 对给出的项，逐规则进行匹配，发现完成匹配的规则，根据此规则生成的建议名称，以及sourcePath。
 */
async function matchRulesAndArgs(referrer: string, url: string, filename: string, setting: Setting): Promise<{ determining: string, sourcePath: SourceDataPath | null } | null> {
    function match(re: RegExp, goal: string, args: Record<string, string>): boolean {
        const matches = re.exec(goal)
        if(matches) {
            if(matches.groups) Object.entries(matches.groups).forEach(([k, v]) => args[k] = v)
            return true
        }else{
            return false
        }
    }

    for(const rule of DETERMINING_RULES) {
        const args: Record<string, string> = {}
        if(rule.referrer && !match(rule.referrer, referrer, args)) continue
        if(rule.url && !match(rule.url, url, args)) continue
        if(rule.filename && !match(rule.filename, filename, args)) continue

        const sourcePath: SourceDataPath = rule.sourcePath ? await rule.sourcePath?.(args) : {sourceSite: args["SITE"] ?? rule.siteName, sourceId: args["ID"], sourcePart: args["PART"] ? parseInt(args["PART"]) : null, sourcePartName: args["PNAME"] ?? null}
        const determining = generateSourceName(sourcePath)
        return {determining, sourcePath: rule.collectSourceData ? sourcePath : null}
    }
    for(const rule of setting.toolkit.determiningFilename.rules) {
        const args: Record<string, string> = {}
        if(rule.referrer && !match(new RegExp(rule.referrer), referrer, args)) continue
        if(rule.url && !match(new RegExp(rule.url), url, args)) continue
        if(rule.filename && !match(new RegExp(rule.filename), filename, args)) continue

        const determining = replaceWithArgs(rule.rename, args)
        return {determining, sourcePath: null}
    }
    
    return null
}

/**
 * 对给出的项，逐规则进行匹配，发现完成匹配的规则，根据此规则生成的建议名称，以及sourcePath。
 */
function matchAttachmentRulesAndArgs(referrer: string, url: string, filename: string): {prefix: string, sourcePath: SourceDataPath | null} | null {
    function match(re: RegExp, goal: string, args: Record<string, string>): boolean {
        const matches = re.exec(goal)
        if(matches) {
            if(matches.groups) Object.entries(matches.groups).forEach(([k, v]) => args[k] = v)
            return true
        }else{
            return false
        }
    }

    for(const rule of ATTACHMENT_RULES) {
        const args: Record<string, string> = {}
        if(rule.referrer && !match(rule.referrer, referrer, args)) continue
        if(rule.url && !match(rule.url, url, args)) continue
        if(rule.filename && !match(rule.filename, filename, args)) continue

        const sourcePath: SourceDataPath = rule.sourcePath?.(args) ?? {sourceSite: args["SITE"] ?? rule.siteName, sourceId: args["ID"], sourcePart: args["PART"] ? parseInt(args["PART"]) : null, sourcePartName: args["PNAME"] ?? null}
        const prefix = rule.prefix?.(args) ?? `[${args["ID"]}]`
        return {prefix, sourcePath}
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

const BUILTIN_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "webm", "mp4", "ogv"]

const EXTENDED_EXTENSIONS = ["zip", "7z", "clip", "psd", "jpeg", "jpg", "png", "gif", "webp", "webm", "mp4", "ogv"]