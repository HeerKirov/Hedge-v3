import { sendMessage } from "@/functions/messages"
import { onDOMContentLoaded } from "@/utils/document"

onDOMContentLoaded(() => {
    console.log("[Hedge v3 Helper] kemono/post script loaded.")
    enablePostContentEnhancement()
})

/**
 * 功能：增强post内容。
 * 将对图像内容追加下载功能和重命名。
 */
function enablePostContentEnhancement() {
    const imageLinks = document.querySelectorAll<HTMLAnchorElement>(".post__files .post__thumbnail .fileThumb")

    for(let i = 0; i < imageLinks.length; i++) {
        const imageLink = imageLinks[i]
        const url = imageLink.href
        const referrer = `${document.URL}#part=${i}`
        imageLink.href = "#"
        imageLink.onclick = () => {
            sendMessage("DOWNLOAD_URL", {url, referrer})
            return false
        }
        const label = document.createElement("label")
        label.textContent = i.toString()
        label.style.color = "white"
        imageLink.appendChild(label)
    }

    console.log(`[enablePostContentEnhancement] ${imageLinks.length} post files enhanced.`)
}