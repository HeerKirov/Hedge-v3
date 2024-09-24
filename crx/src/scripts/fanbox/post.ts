import { SourceDataPath } from "@/functions/server/api-all"
import { onDOMContentLoaded } from "@/utils/document"
import { imageToolbar } from "@/scripts/utils"
import { FANBOX_CONSTANTS } from "@/functions/sites"

onDOMContentLoaded(() => {
    console.log("[Hedge v3 Helper] fanbox/post script loaded.")
    const sourceDataPath = getSourceDataPath()
    initializeUI(sourceDataPath)
})

//TODO 添加fanbox source data

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
 * 获得当前页面的SourceDataPath。需要注意的是，fanbox的页面构成只能解析到id，没有page参数。
 */
function getSourceDataPath(): SourceDataPath {
    const sourceSite = FANBOX_CONSTANTS.SITE_NAME
    const { pid } = getIdentityInfo()
    return {sourceSite, sourceId: pid, sourcePart: null, sourcePartName: null}
}

/**
 * 获得PID和作者名。
 */
function getIdentityInfo(): {pid: string, artist: string} {
    const match = document.location.pathname.match(FANBOX_CONSTANTS.REGEXES.POST_PATHNAME)
    if(match && match.groups) {
        const pid = match.groups["PID"]
        const artist = match.groups["ARTIST"]
        return {pid, artist}
    }else{
        throw new Error("Cannot analyse pathname.")
    }
}