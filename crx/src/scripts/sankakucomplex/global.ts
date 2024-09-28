import { settings } from "@/functions/setting"
import { onDOMContentLoaded } from "@/utils/document"

onDOMContentLoaded(async () => {
    console.log("[Hedge v3 Helper] sankakucomplex/global script loaded.")
    const setting = await settings.get()
    if(setting.website.sankakucomplex.enableBlockAds) enableBlockAds()
    if(setting.website.sankakucomplex.enablePaginationEnhancement) enablePaginationEnhancement()
})

/**
 * 功能：屏蔽部分广告和冗余UI。
 */
function enableBlockAds() {
    //不记得是什么了
    const contentDiv = document.querySelector("#content")
    if(contentDiv) {
        for(let i = contentDiv.children.length - 1; i >= contentDiv.children.length - 3; --i) {
            const child = contentDiv.children[i]
            if(child.nodeName === "DIV" && [...child.attributes].map(k => k.name.length).some(k => k === 7)) {
                (child as HTMLDivElement).style.visibility = "hidden"
            }
        }
    }
    //不记得是什么了
    document.querySelectorAll("#sp1.scad").forEach(it => it.remove())
    //新邮件提醒，当广告处理了
    document.querySelectorAll("#has-mail-notice.has-mail").forEach(it => it.remove())
    //不记得是什么了
    document.querySelector("div > ul + ins")?.remove()
    //不记得是什么了
    document.querySelector("#news-ticker")?.remove()
    //悬浮的按钮，AI的推广
    document.querySelector(".companion--toggle_button")?.remove()
    //顶栏广告区域
    document.querySelector(".carousel.topbar-carousel")?.remove()
    //顶栏，不是广告，属于UI，但有点碍眼
    document.querySelector(".top-bar")?.remove()
    //标题栏，不是广告，属于UI，但有点碍眼
    document.querySelector("h2#page-title")?.remove()
    //内容区域里的AI推广
    document.querySelector(".carousel.ai-carousel")?.remove()
    //内容区域里的广告推广
    document.querySelector(".carousel.companion-carousel")?.remove()
    //提示开会员的notice
    document.querySelector(".carousel a[href=\"https://get.sankaku.plus/\"]")?.closest(".carousel")!.remove()
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
