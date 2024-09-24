import { onDOMContentLoaded } from "@/utils/document"
import { imageToolbar } from "@/scripts/utils"

onDOMContentLoaded(() => {
    console.log("[Hedge v3 Helper] kemono/post script loaded.")

    initializeUI()
})

//TODO 添加 kemono source data

/**
 * 进行image-toolbar, find-similar相关的UI初始化。
 */
function initializeUI() {
    const imageLinks = [...document.querySelectorAll<HTMLDivElement>(".post__files .post__thumbnail")]

    imageToolbar.config({locale: "kemono", collectSourceData: false})
    imageToolbar.add(imageLinks.map((node, index) => ({
        index,
        element: node,
        sourcePath: null, //TODO 添加kemono的来源数据支持
        downloadURL: node.querySelector<HTMLAnchorElement>(".fileThumb")!.href
    })))
}
