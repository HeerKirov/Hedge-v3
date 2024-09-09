import { Setting, settings } from "@/functions/setting"
import { sessions } from "@/functions/storage"
import {
    DOWNLOAD_EXTENSIONS,
    DOWNLOAD_RENAME_SITES,
    EHENTAI_CONSTANTS, GELBOORU_CONSTANTS, IDOL_SANKAKUCOMPLEX_CONSTANTS, KEMONO_CONSTANTS, PIXIV_CONSTANTS,
    SANKAKUCOMPLEX_CONSTANTS
} from "@/functions/sites"
import { autoCollectSourceData } from "@/services/source-data"

export async function downloadURL(options: {url: string, referrer?: string}) {
    await sessions.cache.downloadItemInfo.set(options.url, {referrer: options.referrer ?? ""})
    await chrome.downloads.download({url: options.url})
}

/**
 * 功能：文件下载重命名建议模块。
 * 按照既定的规则解析某些来源的下载，然后给出建议的重命名。
 */
export function determiningFilename(downloadItem: chrome.downloads.DownloadItem, suggest: (suggestion?: chrome.downloads.DownloadFilenameSuggestion) => void): boolean | void {
    const [ filenameWithoutExt, extension ] = splitNameAndExtension(downloadItem.filename)

    settings.get().then(async setting => {
        if(!extension || !getFinalExtensions(setting).includes(extension)) {
            suggest()
            return
        }

        const url = downloadItem.url
        const info = await sessions.cache.downloadItemInfo.get(url)
        const referrer = info?.referrer ?? downloadItem.referrer
        console.log(`[determiningFilename] url=[${url}], referrer=[${referrer}], filename=[${filenameWithoutExt}]`)

        const result = matchRulesAndArgs(referrer, url, filenameWithoutExt, setting)
        if(result === null) {
            suggest()
            return
        }
        if(result.processor) {
            const finalArgs = await MATCH_PROCESSORS[result.processor](result.args)
            if(finalArgs === null) {
                suggest()
                return
            }
            suggest({filename: replaceWithArgs(result.rename, finalArgs) + (extension ? "." + extension : "")})
            autoCollectSourceData({sourceSite: result.siteName, args: finalArgs, setting}).finally()
        }else{
            suggest({filename: replaceWithArgs(result.rename, result.args) + (extension ? "." + extension : "")})
            autoCollectSourceData({sourceSite: result.siteName, args: result.args, setting}).finally()
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
function matchRulesAndArgs(referrer: string, url: string, filename: string, setting: Setting): {siteName: string, rename: string, processor: string | undefined, args: Record<string, string>} | null {
    function match(re: RegExp, goal: string, args: Record<string, string>): boolean {
        const matches = re.exec(goal)
        if(matches) {
            if(matches.groups) Object.entries(matches.groups).forEach(([k, v]) => args[k] = v)
            return true
        }else{
            return false
        }
    }

    for(const rule of DOWNLOAD_RENAME_RULES) {
        const site = DOWNLOAD_RENAME_SITES[rule.siteName]
        const overrideRule = setting.download.overrideRules[rule.siteName]
        if(overrideRule && !overrideRule.enable) {
            //跳过被禁用的规则
            continue
        }

        const args: Record<string, string> = {}
        if(rule.referrer && !match(rule.referrer, referrer, args)) continue
        if(rule.url && !match(rule.url, url, args)) continue
        if(rule.filename && !match(rule.filename, filename, args)) continue

        return {siteName: rule.siteName, rename: overrideRule?.rename ?? site.rename, processor: rule.processor, args}
    }
    for(const rule of setting.download.customRules) {
        const args: Record<string, string> = {}
        if(rule.referrer && !match(new RegExp(rule.referrer), referrer, args)) continue
        if(rule.url && !match(new RegExp(rule.url), url, args)) continue
        if(rule.filename && !match(new RegExp(rule.filename), filename, args)) continue

        return {siteName: "<custom>", rename: rule.rename, processor: undefined, args}
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
 * 获得最终扩展名列表。
 */
function getFinalExtensions(setting: Setting): string[] {
    return setting.download.customExtensions.length ? [...DOWNLOAD_EXTENSIONS, ...setting.download.customExtensions] : DOWNLOAD_EXTENSIONS
}

const MATCH_PROCESSORS: Readonly<Record<string, (args: Record<string, string>) => Promise<Record<string, string> | null>>> = {
    async "ehentai-original"(args) {
        //点击“下载原始文件”时的下载项。其url可解析，能从中获得galleryId, pageNum。
        //为了补全信息，还需要获取imageHash。
        const gid = args["GID"]
        const page = args["PAGE"]
        //首先尝试从session缓存中获取数据
        const data = await sessions.reflect.ehentaiGalleryImageHash.get({gid, page})
        if(data !== undefined) {
            return {
                "GID": gid,
                "PAGE": page,
                "PHASH": data.imageHash
            }
        }else{
            //如果session缓存没有数据，则自行尝试在tabs中搜索
            const tabs = await chrome.tabs.query({currentWindow: true, url: EHENTAI_CONSTANTS.PATTERNS.ANY_IMAGE_URL})
            for(const tab of tabs) {
                if(tab.url) {
                    const url = new URL(tab.url)
                    const res = EHENTAI_CONSTANTS.REGEXES.IMAGE_PATHNAME.exec(url.pathname)
                    if(res && res.groups && res.groups["GID"] === gid && res.groups["PAGE"] === page) {
                        const pHash = res.groups["PHASH"]
                        return {
                            "GID": gid,
                            "PAGE": page,
                            "PHASH": pHash
                        }
                    }
                }
            }

            console.log(`[ehentaiOriginalProcessor] Cannot find EHentai image ${gid}-${page} tab.`)
            return null
        }
    },
    async "ehentai-save-image"(_) {
        //右键另存为图片，这种下载方式无法从下载项中获取任何有效信息。
        //解决思路是利用“下载时一定位于当前页面”的巧合，将当前激活页面当作原始页。因此，这也限制了在保存之前不能随意切换tab。
        //从URL就能获取所需的imageHash, galleryId, pageNum。
        const tabs = await chrome.tabs.query({currentWindow: true, active: true, url: EHENTAI_CONSTANTS.PATTERNS.ANY_IMAGE_URL})
        if(tabs.length > 0 && tabs[0].url !== undefined) {
            const url = new URL(tabs[0].url)
            const res = EHENTAI_CONSTANTS.REGEXES.IMAGE_PATHNAME.exec(url.pathname)
            if(res && res.groups) {
                const gid = res.groups["GID"]
                const page = res.groups["PAGE"]
                const pHash = res.groups["PHASH"]
                return {
                    "GID": gid,
                    "PAGE": page,
                    "PHASH": pHash
                }
            }else{
                console.error(`[ehentaiSaveAsProcessor] Cannot analyse active tab url [${tabs[0].url}].`)
            }
        }else{
            console.error("[ehentaiSaveAsProcessor] Cannot find active EHentai image tab.")
        }
        return null
    }
}

const DOWNLOAD_RENAME_RULES: Readonly<MatchRule[]> = [
    {
        siteName: "sankakucomplex",
        referrer: SANKAKUCOMPLEX_CONSTANTS.REGEXES.POST_URL
    },
    {
        siteName: "ehentai",
        url: EHENTAI_CONSTANTS.REGEXES.FULLIMG_URL,
        processor: "ehentai-original"
    },
    {
        siteName: "ehentai",
        referrer: EHENTAI_CONSTANTS.REGEXES.HOMEPAGE_URL,
        processor: "ehentai-save-image"
    },
    {
        siteName: "ehentai",
        referrer: EHENTAI_CONSTANTS.REGEXES.IMAGE_URL
    },
    {
        siteName: "pixiv",
        referrer: PIXIV_CONSTANTS.REGEXES.HOMEPAGE_URL,
        filename: /(?<PID>\d+)_p(?<PAGE>\d+)/
    },
    {
        siteName: "gelbooru",
        referrer: GELBOORU_CONSTANTS.REGEXES.POST_URL
    },
    {
        siteName: "idolcomplex",
        referrer: IDOL_SANKAKUCOMPLEX_CONSTANTS.REGEXES.POST_URL
    },
    {
        siteName: "kemono",
        referrer: KEMONO_CONSTANTS.REGEXES.POST_URL
    },
]

interface MatchRule {
    siteName: string
    referrer?: RegExp
    url?: RegExp
    filename?: RegExp
    processor?: string
}
