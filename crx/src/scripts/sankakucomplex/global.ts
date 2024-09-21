import { settings } from "@/functions/setting"
import { onDOMContentLoaded } from "@/utils/document"

onDOMContentLoaded(async () => {
    console.log("[Hedge v3 Helper] sankakucomplex/global script loaded.")
    const setting = await settings.get()
    if(setting.website.sankakucomplex.enableBlockAds) enableBlockAds()
    if(setting.website.sankakucomplex.enableShortcutForbidden) enableShortcutForbidden()
    if(setting.website.sankakucomplex.enablePaginationEnhancement) enablePaginationEnhancement()
    if(setting.website.sankakucomplex.enableTagListEnhancement) enableTagListEnhancement()
    if(setting.website.sankakucomplex.enableImageLinkReplacement) enableImageThumbnailReplacement()
})

/**
 * 功能：屏蔽Tab和CTRL+D快捷键
 * Tab和CTRL+D这两个常用键被占用了，搞不懂怎么设计的键位。关掉它。
 */
function enableShortcutForbidden() {
    document.addEventListener("keydown", e => {
        if(e.code === "Tab") {
            e.stopImmediatePropagation()
        }else if(e.code === "KeyD" && e.ctrlKey) {
            e.stopImmediatePropagation()
        }
    }, true)
}

/**
 * 功能：屏蔽部分广告和弹窗。
 */
function enableBlockAds() {
    const contentDiv = document.querySelector("#content")
    if(contentDiv) {
        for(let i = contentDiv.children.length - 1; i >= contentDiv.children.length - 3; --i) {
            const child = contentDiv.children[i]
            if(child.nodeName === "DIV" && [...child.attributes].map(k => k.name.length).some(k => k === 7)) {
                (child as HTMLDivElement).style.visibility = "hidden"
            }
        }
    }
    const ads = document.querySelectorAll("#sp1.scad")
    for(const item of ads) {
        item.remove()
    }
    const mailNotice = document.querySelectorAll("#has-mail-notice.has-mail")
    for(const item of mailNotice) {
        item.remove()
    }
    document.querySelector("#headerlogo")?.remove()
    document.querySelector("div > ul + ins")?.remove()
    document.querySelector("#news-ticker")?.remove()
}

/**
 * 功能：分页导航增强
 * SC的有一个最大浏览页数限制，超过这个限制就不能继续翻页。
 * 然而，legacy的查询内容是根据next参数而不是page参数决定的，这意味着可以伪造页码，从而继续浏览下去，只不过必须手动翻页罢了。 
 */
function enablePaginationEnhancement() {
    if(!(document.location.pathname === "/" || /^\/.*\/$/.test(document.location.pathname))) {
        //页码增强仅发生在"/"，也就是浏览搜索页面
        return
    }
    const PAGE_LIMIT = 50
    const paginationDivList = document.getElementsByClassName("pagination")
    if(!paginationDivList.length) {
        console.warn("[PaginationEnhancement] Cannot find .pagination Element in this page.")
        return
    }
    const paginationDiv = paginationDivList[0]

    const locationParams = new URLSearchParams(document.location.search)
    const displayPage = locationParams.has("page") ? parseInt(locationParams.get("page")!) : 1
    const realPage = locationParams.has("real_page") ? parseInt(locationParams.get("real_page")!) : displayPage
    if(displayPage === PAGE_LIMIT) {
        const [prevA, nextA] = paginationDiv.getElementsByTagName("a")

        //真实页码超过LIMIT时，PREV按钮需要设置real page，并固定page
        if(realPage > PAGE_LIMIT) {
            const prevURL = new URL(prevA.href)
            prevURL.searchParams.set("page", PAGE_LIMIT.toString())
            prevURL.searchParams.set("real_page", (realPage - 1).toString())
            prevA.href = prevURL.href
        }else if(locationParams.has("real_page")) {
            //或者在LIMIT及之前，如果发现location存在real page，那么PREV按钮上也存在，取消掉它
            const prevURL = new URL(prevA.href)
            prevURL.searchParams.delete("real_page")
            prevA.href = prevURL.href
        }

        //真实页码来到或超过LIMIT时，NEXT按钮需要设置real page，并固定page
        if(realPage >= PAGE_LIMIT) {
            const nextURL = new URL(nextA.href)
            nextURL.searchParams.set("page", PAGE_LIMIT.toString())
            nextURL.searchParams.set("real_page", (realPage + 1).toString())
            nextA.href = nextURL.href
        }

        //真实页码与显示页码不同时，用括号在导航数字后面追加真实页码
        if(realPage !== displayPage) {
            const [pageNumSpan] = paginationDiv.getElementsByTagName("span")
            if(pageNumSpan) {
                pageNumSpan.textContent = `  ${displayPage} (${realPage})  `
            }
        }
    }
}

/**
 * 功能：标签列表增强
 * SC的标签列表在一次改版后只显示名称，不显示数量了。但是显示一部分数量又是很有用的功能。此增强将post/book数量追加到标签名称后面。
 */
function enableTagListEnhancement() {
    //只增强这里列出的几类标签，其他的没有必要
    const tagLiList = document.querySelectorAll("#tag-sidebar li.tag-type-artist,li.tag-type-studio,li.tag-type-copyright,li.tag-type-character")
    for(const tagLi of tagLiList) {
        const tagDiv = tagLi.querySelector("div")
        if(tagDiv !== null) {
            let postCount = "", bookCount = ""
            const childNodes = tagDiv.querySelector(".tooltip > span")?.childNodes ?? []
            for(let i = 0; i < childNodes.length; i++) {
                const childNode = childNodes[i]
                if(childNode.textContent) {
                    if(childNode.nodeName === "#text" && childNode.textContent.startsWith("Posts:")) {
                        const spanNode = childNodes[i + 1]
                        if(spanNode.nodeName === "SPAN") {
                            postCount = (spanNode as HTMLSpanElement).innerText
                        }
                    }else if(childNode.nodeName === "#text" && childNode.textContent.startsWith("Books:")) {
                        const aNode = childNodes[i + 1]
                        if(aNode.nodeName === "A") {
                            bookCount = (aNode as HTMLAnchorElement).innerText
                        } 
                    }
                    if(postCount && bookCount) {
                        break
                    }
                }
            }
            if(bookCount) {
                tagDiv.append(`  (${postCount} / ${bookCount})`)
            }else{
                tagDiv.append(`  (${postCount})`)
            }
        }
    }
}

/**
 * 功能：Image缩略图替换
 * image的链接有s开头和v开头两种。之前曾经存在过问题，v开头链接经常下载异常，导致需要把v开头替换成s开头。
 */
function enableImageThumbnailReplacement() {
    const thumbs = document.getElementsByClassName("thumb") as HTMLCollectionOf<HTMLSpanElement>
    for(const thumb of thumbs) {
        const img = thumb.getElementsByTagName("img")[0] as HTMLImageElement | null
        if(img && img.src && img.src.startsWith("https://v")) {
            img.src = "https://s" + img.src.substring("https://v".length)
        }
    }
}
