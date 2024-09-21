import { onDOMContentLoaded } from "@/utils/document"
import { imageToolbar } from "@/scripts/utils"

onDOMContentLoaded(() => {
    console.log("[Hedge v3 Helper] fanbox/post script loaded.")

    initializeUI()
})

/**
 * 进行image-toolbar, find-similar相关的UI初始化。
 */
function initializeUI() {
    function observeAllPresentations(callback: (nodes: {index: number, element: HTMLDivElement, downloadURL: string}[]) => void) {
        let imgList: HTMLImageElement[] | undefined

        const callbackWithProcessor = (nodes: HTMLImageElement[]) => {
            if(imgList === undefined) imgList = [...document.querySelectorAll<HTMLImageElement>("article img")]
            const ret = nodes.filter(node => node.parentElement?.parentElement instanceof HTMLAnchorElement).map(node => {
                const index = imgList!.indexOf(node) + 1
                const downloadURL = (node.parentElement!.parentElement as HTMLAnchorElement).href
                return {index, downloadURL, element: node.parentElement!.parentElement!.parentElement as HTMLDivElement}
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

    imageToolbar.locale("fanbox")

    observeAllPresentations(nodes => imageToolbar.add(nodes))
}