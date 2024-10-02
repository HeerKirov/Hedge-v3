import { SourceDataPath } from "@/functions/server/api-all"
import { SourceDataUpdateForm, SourceTagForm } from "@/functions/server/api-source-data"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { FANBOX_CONSTANTS } from "@/functions/sites"
import { imageToolbar, similarFinder } from "@/scripts/utils"
import { onDOMContentLoaded } from "@/utils/document"
import { Result } from "@/utils/primitives"

onDOMContentLoaded(async () => {
    if(FANBOX_CONSTANTS.REGEXES.POST_PATHNAME.test(document.location.pathname)) {
        console.log("[Hedge v3 Helper] fanbox/post script loaded.")
        const sourceDataPath = getSourceDataPath()
        const sourceData = await collectSourceData()
        sendMessage("SUBMIT_PAGE_INFO", {path: sourceDataPath})
        sendMessage("SUBMIT_SOURCE_DATA", {path: sourceDataPath, data: sourceData})

        initializeUI(sourceDataPath)
    }
})

receiveMessageForTab(({ type, msg: _, callback }) => {
    if(type === "REPORT_SOURCE_DATA") {
        collectSourceData().then(r => callback(r))
        return true
    }else if(type === "REPORT_PAGE_INFO") {
        callback({path: getSourceDataPath()})
    }else if(type === "QUICK_FIND_SIMILAR") {
        const sourceDataPath = getSourceDataPath()
        collectSourceData().then(sourceData => {
            const file = document.querySelector<HTMLImageElement>("article img")
            similarFinder.quickFind(file?.src, sourceDataPath, sourceData)
        })
    }
    return false
})

/**
 * 进行image-toolbar, find-similar相关的UI初始化。
 */
function initializeUI(sourcePath: SourceDataPath) {
    function observeAllPresentations(callback: (nodes: {index: number, element: HTMLDivElement, sourcePath: SourceDataPath, downloadURL: string}[]) => void) {
        let imgList: HTMLImageElement[] | undefined

        const callbackWithProcessor = (nodes: HTMLImageElement[]) => {
            if(imgList === undefined) imgList = [...document.querySelectorAll<HTMLImageElement>("article img")]
            const ret = nodes.filter(node => node.parentElement?.parentElement instanceof HTMLAnchorElement).map(node => {
                const index = imgList!.indexOf(node) + 1
                const downloadURL = (node.parentElement!.parentElement as HTMLAnchorElement).href
                return {index, downloadURL, sourcePath: {...sourcePath, sourcePart: index}, element: node.parentElement!.parentElement!.parentElement as HTMLDivElement}
            })
            callback(ret)
        }

        const observer = new MutationObserver(mutationsList => {
            const values: HTMLImageElement[] = []
            for(const mutation of mutationsList) {
                if(mutation.type === "attributes" && mutation.attributeName === "src" && mutation.target instanceof HTMLImageElement && mutation.target.src) {
                    values.push(mutation.target)
                }
            }
            if(values.length > 0) callbackWithProcessor(values)
        })

        observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["src"] })

        //机制决定img都是懒加载的，此时的img应该都没有src。不过以防万一还是加了初始化容错
        const initValues = [...document.querySelectorAll<HTMLImageElement>("article img").values()].filter(n => !!n.src)
        if(initValues.length > 0) callbackWithProcessor(initValues)
    }

    imageToolbar.config({locale: "fanbox"})

    observeAllPresentations(nodes => imageToolbar.add(nodes))
}

/**
 * 收集来源数据。
 */
async function collectSourceData(): Promise<Result<SourceDataUpdateForm, string>> {
    const { pid } = getIdentityInfo()
    try {
        const response = await fetch(`https://api.fanbox.cc/post.info?postId=${pid}`, {credentials: "include"})
        if(response.ok) {
            const body = (await response.json())["body"]

            const tags: SourceTagForm[] = []

            //查找作者，作为tag写入。作者的type固定为`artist`，code为"{userId}"，name为"{creatorId}"，otherName为"{name}"
            tags.push({code: body["user"]["userId"], name: body["creatorId"], otherName: body["user"]["name"], type: "artist"})

            //查找标签列表，作为tag写入。标签的type固定为"tag"，code为"{TAG}"
            tags.push(...(body["tags"] as string[]).map(tag => (<SourceTagForm>{code: tag, type: "tag"})))

            const title: string | undefined = body["title"] || undefined

            const description: string | undefined = body["excerpt"] || undefined

            const publishTime = new Date(body["publishedDatetime"]).toISOString()

            return {ok: true, value: {tags, title, description, publishTime}}
        }else{
            const body = await response.text()
            console.error("[collectSourceData] Fetch error.", body)
            return {ok: false, err: body}
        }
    }catch(err) {
        console.error("[collectSourceData] Fetch connection error.", err)
        return {ok: false, err: err instanceof Error ? err.message : typeof err === "string" ? err : (err?.toString() ?? "")}
    }
}

/**
 * 获得当前页面的SourceDataPath。需要注意的是，fanbox的页面构成只能解析到id，没有page参数。
 */
function getSourceDataPath(): SourceDataPath {
    const sourceSite = FANBOX_CONSTANTS.SITE_NAME
    const { pid } = getIdentityInfo()
    return {sourceSite, sourceId: pid, sourcePart: null, sourcePartName: null}
}

/**
 * 获得PID。
 */
function getIdentityInfo(): {pid: string} {
    const match = document.location.pathname.match(FANBOX_CONSTANTS.REGEXES.POST_PATHNAME)
    if(match && match.groups) {
        const pid = match.groups["PID"]
        return {pid}
    }else{
        throw new Error("Cannot analyse pathname.")
    }
}