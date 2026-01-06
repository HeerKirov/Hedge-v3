import { SourceDataPath } from "@/functions/server/api-all"
import { Setting, settings } from "@/functions/setting"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { EHENTAI_CONSTANTS } from "@/functions/sites"
import { artworksToolbar, type ThumbnailInfo } from "@/scripts/utils"
import { numbers } from "@/utils/primitives"
import { documents, onDOMContentLoaded } from "@/utils/document"
import { analyseSourceDataFromGalleryDOM, analyseDownloadURLFromImageDOM } from "./utils"

onDOMContentLoaded(async () => {
    console.log("[Hedge v3 Helper] ehentai/gallery script loaded.")
    const setting = await settings.get()
    const sourceDataPath = getSourceDataPath()
    if(!isContentWarning()) {
        const sourceData = analyseSourceDataFromGalleryDOM(document, document.location.pathname)
        sendMessage("SUBMIT_PAGE_INFO", {path: sourceDataPath})
        sendMessage("SUBMIT_SOURCE_DATA", {path: sourceDataPath, data: sourceData})

        if(setting.website.ehentai.enableRenameScript) enableRenameFile()
        if(setting.website.ehentai.enableCommentCNBlock || setting.website.ehentai.enableCommentVoteBlock || setting.website.ehentai.enableCommentKeywordBlock || setting.website.ehentai.enableCommentUserBlock) {
            enableCommentFilter(setting)
        }

        if(setting.toolkit.downloadToolbar.enabled) initializeUI(sourceDataPath)
    }
})

receiveMessageForTab(({ type, msg: _, callback }) => {
    if(type === "REPORT_SOURCE_DATA") {
        callback(analyseSourceDataFromGalleryDOM(document, document.location.pathname))
    }else if(type === "REPORT_PAGE_INFO") {
        callback({path: getSourceDataPath()})
    }
    return false
})

/**
 * 进行artworks-toolbar, find-similar相关的UI初始化。
 */
function initializeUI(sourcePath: SourceDataPath) {
    const gdtElement = document.querySelector("#gdt")
    if(!gdtElement) {
        console.warn("[initializeUI] #gdt element not found.")
        return
    }
    
    const anchors = [...document.querySelectorAll<HTMLAnchorElement>("#gdt > a")]
    const wrappedElements: Map<HTMLAnchorElement, HTMLDivElement> = new Map()
    
    // 为每个 <a> 标签包裹一个新的 <div>，使用包裹后的 <div> 作为挂载点，而不是直接使用 <a>
    for(const anchor of anchors) {
        const wrapperDiv = document.createElement("div")
        const parentNode = anchor.parentNode
        const nextSibling = anchor.nextSibling

        parentNode?.removeChild(anchor)
        wrapperDiv.appendChild(anchor)
        if(nextSibling) {
            parentNode?.insertBefore(wrapperDiv, nextSibling)
        } else {
            parentNode?.appendChild(wrapperDiv)
        }
        wrappedElements.set(anchor, wrapperDiv)
    }
    
    const nodes = anchors.map(item => {
        const url = new URL(item.href)
        const match = url.pathname.match(EHENTAI_CONSTANTS.REGEXES.IMAGE_PATHNAME)
        if(!match || !match.groups) {
            console.warn(`[initializeUI] Cannot analyse URL for a[href=${item.href}].`)
            return undefined
        }
        const index = parseInt(match.groups["PAGE"])
        const pHash = match.groups["PHASH"]
        const wrapperElement = wrappedElements.get(item)!
        const sourceDataPath: SourceDataPath = {...sourcePath, sourcePart: index, sourcePartName: pHash}
        const thumbnailSrc = () => {
            // 获取item(anchor)下的div > div结构上的style，提取background中的url(...)
            const innerDiv = item.querySelector("div > div")
            if (innerDiv && innerDiv instanceof HTMLElement && innerDiv.hasAttribute("style")) {
                const style = innerDiv.getAttribute("style") || ""
                return parseThumbnailStyle(style, innerDiv)
            }
            return null
        }
        const downloadURL = async () => requestDownloadURLOfImage(item.href)
        return {index, element: wrapperElement, sourceDataPath, thumbnailSrc, downloadURL}
    }).filter(item => item !== undefined)
    
    artworksToolbar.config({locale: "ehentai-gallery"})
    artworksToolbar.add(nodes)
}

/**
 * 功能：评论区屏蔽机制。
 * - 根据block keywords，屏蔽包含这些关键字的评论。
 * - 根据block users，屏蔽这些用户发送的评论，包括这些用户的名字。
 * - 开启block vote时，屏蔽Vote投票数过低的评论。
 * - 开启中文智能屏蔽时，引入一系列更本地化的屏蔽规则。
 *   - 存在Vote过低的评论，且存在block keyword/user的评论，且同时存在至少2条Vote较高的评论，且这些评论都包含中文时，遮蔽评论区的所有中文评论。
 *   - 处于特别关照的parody下时，条件降低为vote/keyword/user其一 & 至少1条高vote & 包含中文，且遮蔽会进一步增强为直接删除所有中文评论。
 */
function enableCommentFilter(setting: Setting) {
    const { enableCommentCNBlock: blockCN, enableCommentVoteBlock: blockVote, enableCommentKeywordBlock, enableCommentUserBlock, commentBlockKeywords, commentBlockUsers } = setting.website.ehentai
    const blockKeywords = enableCommentKeywordBlock ? commentBlockKeywords : []
    const blockUsers = enableCommentUserBlock ? commentBlockUsers : []
    const divs = document.querySelectorAll<HTMLDivElement>("div#cdiv > div.c1")

    const chinese: boolean[] = []
    const lowVote: boolean[] = []
    const highVote: boolean[] = []
    const keywordBanned: boolean[] = []
    const userBanned: boolean[] = []

    for(let i = 0; i < divs.length; ++i) {
        const div = divs[i]
        if(div.querySelector("a[name=ulcomment]")) continue

        const c3 = div.querySelector<HTMLAnchorElement>("div.c3 > a")
        if(c3?.textContent) {
            //被ban的用户
            if(blockUsers.includes(c3.textContent)) userBanned[i] = true
        }
        const c5 = div.querySelector<HTMLSpanElement>("div.c5 > span")
        if(c5?.textContent) {
            const vote = parseInt(c5.textContent)
            //低Vote评论
            if(vote <= -30) lowVote[i] = true
            //高Vote评论
            if(vote >= 20) highVote[i] = true
        }
        const c6 = div.querySelector<HTMLDivElement>("div.c6")
        if(c6?.textContent) {
            //中文评论
            if(/.*[\u4e00-\u9fa5]+.*$/.test(c6.textContent)) chinese[i] = true
            //包含被ban的关键词
            if(blockKeywords.some(b => c6.textContent!.includes(b))) keywordBanned[i] = true
        }
    }

    let cnBanned: "MARK" | "FORBIDDEN" | undefined
    if(blockCN) {
        //当gallery包含以下任意tag，且parody tag数量不超过4时，将评论区标记为"特别关照"
        //或者，当包含屏蔽词/屏蔽用户的评论超过5时，也做此标记
        const warnTags = ["genshin impact", "honkai star rail"]
        const tags = [...document.querySelectorAll<HTMLAnchorElement>("#taglist a")]
        const parodyCount = tags.filter(a => a.id.startsWith("ta_parody")).length
        const warning = tags.some(a => a.textContent && warnTags.includes(a.textContent)) && parodyCount < 4
        if(keywordBanned.filter(i => i).length + userBanned.filter(i => i).length >= 5) {
            cnBanned = "FORBIDDEN"
        }else if(warning) {
            if((lowVote.some((_, i) => chinese[i]) || keywordBanned.some((_, i) => chinese[i]) || userBanned.some((_, i) => chinese[i])) && highVote.some((_, i) => chinese[i])) {
                cnBanned = "FORBIDDEN"
            }
        }else{
            if(lowVote.some((_, i) => chinese[i]) && (keywordBanned.some((_, i) => chinese[i]) || userBanned.some((_, i) => chinese[i])) && highVote.filter((_, i) => chinese[i]).length >= 2) {
                cnBanned = "MARK"
            }
        }
    }

    for(let i = 0; i < divs.length; ++i) {
        const div = divs[i]
        if(userBanned[i]) {
            //对于被block的用户，总是遮蔽其用户名
            const c3 = div.querySelector<HTMLAnchorElement>("div.c3 > a")!
            c3.style.color = "black"
            c3.style.backgroundColor = "black"
        }
        if(keywordBanned[i] || userBanned[i] || (cnBanned === "FORBIDDEN" && chinese[i])) {
            //关键字屏蔽、用户屏蔽、处于特别关注的CN遮蔽下，直接移除评论内容
            div.querySelector<HTMLDivElement>("div.c6")?.remove()
        }else if(blockVote && lowVote[i]) {
            //低分屏蔽，将其评论内容遮蔽为黑色
            const c6 = div.querySelector<HTMLDivElement>("div.c6")
            if(c6) {
                c6.style.color = "black"
                c6.style.backgroundColor = "black"
            }
        }else if(cnBanned === "MARK" && chinese[i]) {
            //处于CN遮蔽下的其他评论，将其评论内容遮蔽为灰色
            const c6 = div.querySelector<HTMLDivElement>("div.c6")
            if(c6) {
                c6.style.color = "grey"
                c6.style.backgroundColor = "grey"
            }
        }
    }

    for(let i = 0; i < divs.length; ++i) {
        if(!enableCommentUserBlock || userBanned[i]) continue
        const c3 = divs[i].querySelector<HTMLDivElement>("div.c3")
        if(!c3) continue
        const banButton = documents.createElement("button", {
            style: "margin-left: 8px; cursor: pointer; display: none; border: none; background: none; padding: 0; font-weight: bold; font-size: inherit; color: inherit;",
            click(e: MouseEvent) {
                const c3Anchor = c3.querySelector<HTMLAnchorElement>(":scope > a")!
                const userName = c3Anchor.textContent!
                if(blockUsers.includes(userName)) return
                settings.set({...setting, website: {...setting.website, ehentai: {...setting.website.ehentai, commentBlockUsers: [...setting.website.ehentai.commentBlockUsers, userName]}}}, setting)
                userBanned[i] = true
                //对于被block的用户，总是遮蔽其用户名
                c3Anchor.style.color = "black"
                c3Anchor.style.backgroundColor = "black"
                //关键字屏蔽、用户屏蔽、处于特别关注的CN遮蔽下，直接移除评论内容
                divs[i].querySelector<HTMLDivElement>("div.c6")?.remove()
            }
        }, ["[Ban this user]"])
        c3.addEventListener("mouseenter", () => {
            banButton.style.display = "inline-block"
        })
        c3.addEventListener("mouseleave", () => {
            banButton.style.display = "none"
        })
        c3.appendChild(banButton)
    }
}

/**
 * 功能：添加“重命名文件下载”功能。
 */
function enableRenameFile() {
    const gd5 = document.querySelector<HTMLDivElement>("#gd5")
    if(gd5) {
        const archiveDownloadDiv = gd5.childNodes[1] as HTMLDivElement
        const p = documents.createElement("p", {class: "g2"}, [
            documents.createElement("img", {src: "https://ehgt.org/g/mr.gif"}),
            documents.createElement("a", {
                style: "margin-left: 4px; cursor: pointer",
                click(e: MouseEvent) {
                    (e.target as HTMLAnchorElement).style.color = "burlywood"

                    //获取当前页的所有图像，并提取它们的页码、hash、文件名信息
                    const anchors = document.querySelectorAll<HTMLAnchorElement>("#gdt > a, #gdt > div > a")
                    const hrefs = [...anchors.values()].map(a => {
                        const titleDiv = a.querySelector<HTMLDivElement>("div[title]")
                        if(!titleDiv) {
                            throw new Error(`[Rename Script] Cannot find div[title] for a[href=${a.href}].`)
                        }
                        const n = titleDiv.title.match(/^Page (\d+): (?<FILENAME>.*)$/)
                        if(!(n && n.groups)) {
                            throw new Error(`[Rename Script] Cannot analyse title '${titleDiv.title}' for a[href=${a.href}].`)
                        }
                        const filename = n.groups["FILENAME"]

                        const url = new URL(a.href)
                        const m = url.pathname.match(EHENTAI_CONSTANTS.REGEXES.IMAGE_PATHNAME)
                        if(!(m && m.groups)) {
                            throw new Error(`[Rename Script] Cannot analyse URL for a[href=${a.href}].`)
                        }
                        const page = parseInt(m.groups["PAGE"])
                        const pHash = m.groups["PHASH"]
                        return {page, pHash, filename}
                    })


                    const galleryId = getGalleryId()
                    const galleryPageNum = getGalleryPageNum()
                    const galleryImgCount = getGalleryImageCount()
                    const galleryImgCountLen = numbers.getLength(galleryImgCount)

                    const primaryTitleHeading = document.querySelector<HTMLHeadingElement>(".gm #gd2 #gn")
                    const secondaryTitleHeading = document.querySelector<HTMLHeadingElement>(".gm #gd2 #gj")
                    const galleryTitle = secondaryTitleHeading?.textContent || primaryTitleHeading?.textContent || galleryId

                    const scripts = [
                        "#!/bin/bash",
                        "",
                        "EXECUTE=$1",
                        "",
                        "if [[ \"$EXECUTE\" != \"execute\" ]]; then",
                        "   for script in ./*.sh; do",
                        "       /bin/bash \"$script\" \"execute\" ",
                        "   done",
                        "   exit 0",
                        "fi",
                        "",
                        "groups=(",
                        ...hrefs.map(({ page, pHash, filename }) => {
                            const ext = filename.split(".").pop()
                            return `    "${filename}" "${page.toString().padStart(galleryImgCountLen, "0")}" "ehentai_${galleryId}_${page}_${pHash}.${ext}"`
                        }),
                        ")",
                        "for ((i = 0; i < ${#groups[@]}; i += 3)); do",
                        "   A=\"${groups[i]}\"",
                        "   B=\"${groups[i + 1]}\"",
                        "   C=\"${groups[i + 2]}\"",
                        "   if [[ -f \"${B}_${A}\" ]]; then",
                        "       mv \"${B}_${A}\" \"$C\"",
                        "       echo \"rename ${B}_${A} -> $C\"",
                        "   elif [[ -f \"$A\" ]]; then",
                        "       mv \"$A\" \"$C\"",
                        "       echo \"rename $A -> $C\"",
                        "   else",
                        "       echo \"ERR: [$B]$A not found.\"",
                        "   fi",
                        "done"
                    ].join("\n")
                    console.log(scripts)
                    documents.clickDownload(`Rename Script - ${galleryTitle} - Page ${galleryPageNum}.sh`, scripts)
                }
            }, [
                "Rename Script"
            ])
        ])

        archiveDownloadDiv.setAttribute("style", "padding-bottom: 0px")
        archiveDownloadDiv.after(p)
    }
}

/**
 * 检查当前页面是否处于Content Warning状态下。若在此状态下，则不应该有后续处理。
 */
function isContentWarning() {
    const h1 = document.querySelector<HTMLDivElement>("body > div > h1")
    return h1 !== null && h1.textContent === "Content Warning"
}

/**
 * 获得当前页面的SourceDataPath。需要注意的是，当前页面为gallery页，没有page参数。
 */
function getSourceDataPath(): SourceDataPath {
    const sourceSite = EHENTAI_CONSTANTS.SITE_NAME
    const gid = getGalleryId()
    return {sourceSite, sourceId: gid, sourcePart: null, sourcePartName: null}
}

/**
 * 获得GalleryId。
 */
function getGalleryId(): string {
    const match = document.location.pathname.match(EHENTAI_CONSTANTS.REGEXES.GALLERY_PATHNAME)
    if(match && match.groups) {
        return match.groups["GID"]
    }else{
        throw new Error("Cannot analyse pathname.")
    }
}

/**
 * 获得画廊页面当前的翻页页码。从1开始。
 */
function getGalleryPageNum(): number {
    const p = new URLSearchParams(location.search).get("p")
    if(!p) return 1
    return parseInt(p) + 1
}

/**
 * 获得画廊的图像数量。
 */
function getGalleryImageCount(): number {
    const p = document.querySelector<HTMLParagraphElement>(".gtb > .gpc")
    if(!p) throw new Error("Cannot find div.gtb > p.gpc.")
    const m = p.textContent?.match(/^Showing [\d,]+ - [\d,]+ of (?<COUNT>[\d,]+) images$/)
    if(!m || !m.groups) throw new Error(`Cannot analyse div.gtb > p.gpc textContent '${p.textContent}'.`)
    return parseInt(m.groups["COUNT"].replaceAll(",", ""))
}

/**
 * 从gallery anchor的style中提取缩略图信息。
 */
function parseThumbnailStyle(style: string, element: HTMLElement): ThumbnailInfo | null {
    // 提取 background URL
    const urlMatch = style.match(/background:[^;]*url\(([^)]+)\)/)
    if (!urlMatch || !urlMatch[1]) {
        return null
    }
    const url = urlMatch[1].trim().replace(/^["']|["']$/g, "")

    // 提取背景位置（background-position）
    // 在 background 简写属性中，位置值通常在 url() 之后
    // 格式可能是: background: ... url(...) -200px 0 no-repeat
    // 或者单独的: background-position: -200px 0
    let offsetX = 0
    let offsetY = 0
    
    // 先尝试匹配 background-position 属性（可能以分号结尾或后面有其他属性）
    const positionMatch = style.match(/background-position:\s*(-?\d+)px\s+(-?\d+)px/i)
    if (positionMatch) {
        offsetX = parseInt(positionMatch[1])
        offsetY = parseInt(positionMatch[2])
    } else {
        // 如果没有单独的 background-position，尝试从 background 简写属性中提取
        // 匹配 url(...) 后面的位置值
        // 注意：位置值可能是 -200px 0 或 -200px 0px，第二个值可能没有 px
        const backgroundMatch = style.match(/url\([^)]+\)\s+(-?\d+)px\s+(-?\d+)(?:px)?/i)
        if (backgroundMatch) {
            offsetX = parseInt(backgroundMatch[1])
            offsetY = parseInt(backgroundMatch[2])
        }
    }

    // 从元素的 style 或计算样式中获取尺寸
    const widthMatch = style.match(/width:\s*(\d+)px/)
    const heightMatch = style.match(/height:\s*(\d+)px/)
    let width = 0
    let height = 0
    
    if (widthMatch) {
        width = parseInt(widthMatch[1])
    } else {
        const computedStyle = window.getComputedStyle(element)
        width = parseInt(computedStyle.width) || element.clientWidth
    }
    
    if (heightMatch) {
        height = parseInt(heightMatch[1])
    } else {
        const computedStyle = window.getComputedStyle(element)
        height = parseInt(computedStyle.height) || element.clientHeight
    }

    if (width <= 0 || height <= 0) {
        return null
    }

    console.log("parseThumbnailStyle", url, offsetX, offsetY, width, height)

    return { url, offsetX, offsetY, width, height, _isThumbnailInfo: true as const }
}

/**
 * 通过请求image页面HTML的方式，解析获得图像源文件下载链接。
 */
async function requestDownloadURLOfImage(href: string): Promise<string | null> {
    const response = await fetch(href)
    if(!response.ok) {
        return null
    }

    const html = await response.text()

    // 使用 DOMParser 将返回的 HTML 字符串解析为文档
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")

    const { downloadURL } = analyseDownloadURLFromImageDOM(doc)
    return downloadURL
}