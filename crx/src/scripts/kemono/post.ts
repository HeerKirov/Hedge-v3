import { onDOMContentLoaded } from "@/utils/document"
import { imageToolbar } from "@/scripts/utils";

onDOMContentLoaded(() => {
    console.log("[Hedge v3 Helper] kemono/post script loaded.")

    initializeUI()
})

/**
 * 进行image-toolbar, find-similar相关的UI初始化。
 */
function initializeUI() {
    const imageLinks = [...document.querySelectorAll<HTMLDivElement>(".post__files .post__thumbnail")]

    imageToolbar.locale("kemono")
    imageToolbar.add(imageLinks.map((node, index) => ({
        index,
        element: node,
        downloadURL: node.querySelector<HTMLAnchorElement>(".fileThumb")!.href
    })))
}
