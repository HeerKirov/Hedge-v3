import { tz } from "moment-timezone"
import { SourceDataPath } from "@/functions/server/api-all"
import { SourceAdditionalInfoForm, SourceDataUpdateForm, SourceTagForm } from "@/functions/server/api-source-data"
import { settings } from "@/functions/setting"
import { receiveMessageForTab, sendMessage } from "@/functions/messages"
import { EHENTAI_CONSTANTS } from "@/functions/sites"
import { Result } from "@/utils/primitives"
import { documents, onDOMContentLoaded } from "@/utils/document"

onDOMContentLoaded(async () => {
    console.log("[Hedge v3 Helper] ehentai/gallery script loaded.")
    const setting = await settings.get()
    const sourceDataPath = getSourceDataPath()
    if(!isContentWarning()) {
        const sourceData = collectSourceData()
        sendMessage("SUBMIT_PAGE_INFO", {path: sourceDataPath})
        sendMessage("SUBMIT_SOURCE_DATA", {path: sourceDataPath, data: sourceData})

        enableRenameFile()
        if(setting.website.ehentai.enableCommentCNBlock || setting.website.ehentai.enableCommentVoteBlock || setting.website.ehentai.enableCommentKeywordBlock || setting.website.ehentai.enableCommentUserBlock) {
            enableCommentFilter(
                setting.website.ehentai.enableCommentCNBlock,
                setting.website.ehentai.enableCommentVoteBlock,
                setting.website.ehentai.enableCommentKeywordBlock ? setting.website.ehentai.commentBlockKeywords : [],
                setting.website.ehentai.enableCommentUserBlock ? setting.website.ehentai.commentBlockUsers : []
            )
        }
    }
})

receiveMessageForTab(({ type, msg: _, callback }) => {
    if(type === "REPORT_SOURCE_DATA") {
        callback(collectSourceData())
    }else if(type === "REPORT_PAGE_INFO") {
        callback({path: getSourceDataPath()})
    }
    return false
})

/**
 * 功能：评论区屏蔽机制。
 * - 根据block keywords，屏蔽包含这些关键字的评论。
 * - 根据block users，屏蔽这些用户发送的评论，包括这些用户的名字。
 * - 开启block vote时，屏蔽Vote投票数过低的评论。
 * - 开启中文智能屏蔽时，引入一系列更本地化的屏蔽规则。
 *   - 存在Vote过低的评论，且存在block keyword/user的评论，且同时存在至少2条Vote较高的评论，且这些评论都包含中文时，遮蔽评论区的所有中文评论。
 *   - 处于特别关照的parody下时，条件降低为vote/keyword/user其一 & 至少1条高vote & 包含中文，且遮蔽会进一步增强为直接删除所有中文评论。
 */
function enableCommentFilter(blockCN: boolean, blockVote: boolean, blockKeywords: string[], blockUsers: string[]) {
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
}

/**
 * 功能：添加“重命名文件下载”功能。
 */
function enableRenameFile() {
    const gd5 = document.querySelector<HTMLDivElement>("#gd5")
    if(gd5) {
        const a = document.createElement("a")
        a.textContent = "Rename Script Download"
        a.href = "#"
        gd5.childNodes[1].appendChild(document.createTextNode(" / "))
        gd5.childNodes[1].appendChild(a)
        a.onclick = (e: MouseEvent) => {
            (e.target as HTMLAnchorElement).style.color = "burlywood"
            const anchors = document.querySelectorAll<HTMLAnchorElement>(".gdtl > a")
            const hrefs = [...anchors.values()]
                .map(a => {
                    const img = a.querySelector("img")
                    const url = new URL(a.href)
                    const m = url.pathname.match(EHENTAI_CONSTANTS.REGEXES.IMAGE_PATHNAME)
                    if(m && m.groups && img) {
                        const page = img.alt
                        const pHash = m.groups["PHASH"]
                        const gid = m.groups["GID"]
                        return [pHash, gid, page] as const
                    }else{
                        return null
                    }
                })
                .filter(tuple => tuple !== null) as [string, string, string][]

            const scripts = hrefs.map(([pHash, gid, page]) => `rename $@ 's/(.*)(\\..*)/$1_${pHash}$2/' ehentai_${gid}_${page}.*`).join("\n")
            documents.clickDownload(`RenameScript-${hrefs[0][1]}-${hrefs[0][2]}.sh`, scripts)

            if(parseInt(hrefs[0][2]) === 1) {
                const scripts = `rename $@ 's/(\\d+).*(\\..*)/ehentai_${hrefs[0][1]}_$1$2/' *.*\nchmod +x *.sh`
                documents.clickDownload(`RenameScript-${hrefs[0][1]}.sh`, scripts)
            }
        }
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
 * 收集来源数据。
 */
function collectSourceData(): Result<SourceDataUpdateForm, string> {
    const tags: SourceTagForm[] = []
    const tagListDiv = document.querySelector<HTMLDivElement>("#taglist")
    if(tagListDiv) {
        const trList = tagListDiv.querySelectorAll<HTMLTableRowElement>("tr")
        for(const tr of trList) {
            let type: string
            const typeTd = tr.querySelector("td.tc")
            if(typeTd && typeTd.textContent) {
                type = typeTd.textContent.substring(0, typeTd.textContent.length - 1)
            }else{
                return {ok: false, err: `Tag: Cannot analyse tag type from 'td.tc'.`}
            }
            const tagAnchorList = tr.querySelectorAll<HTMLAnchorElement>("td.tc + td > div > a")
            if(tagAnchorList.length <= 0) {
                return {ok: false, err: `Tag: Cannot find any tag of type '${type}'.`}
            }
            for(const tagAnchor of tagAnchorList) {
                const [name, otherName] = tagAnchor.textContent!.split("|").map(i => i.trim())
                tags.push({code: name, name, otherName, type})
            }
        }
    }else{
        return {ok: false, err: `Tag: cannot find '#taglist'.`}
    }

    //画廊的类型(doujinshi, image set)也会被作为tag写入，类型固定为"category"，code为"{category-}"
    const categoryDiv = document.querySelector<HTMLDivElement>(".gm .cs")
    if(categoryDiv) {
        const category = categoryDiv.textContent!
        tags.push({code: category.toLowerCase().replaceAll(" ", "-"), name: category, type: "category"})
    }else{
        return {ok: false, err: `Category: cannot find '.cs'.`}
    }

    //发布时间。同样没有确定选择器，选择的是第一个
    let publishTime: string | undefined
    const publishTimeDiv = document.querySelector<HTMLTableRowElement>(".gm #gdd tr > td:first-child + td")
    if(publishTimeDiv) {
        try {
            publishTime = tz(publishTimeDiv.textContent, "UTC").toDate().toISOString()
        }catch(e) {
            console.error(`Publish time analysis failed.`, e)
        }
    }

    //画廊的token将作为附加信息写入
    const additionalInfo: SourceAdditionalInfoForm[] = []
    const pathnameMatch = document.location.pathname.match(EHENTAI_CONSTANTS.REGEXES.GALLERY_PATHNAME)
    if(pathnameMatch && pathnameMatch.groups) {
        additionalInfo.push({field: "token", value: pathnameMatch.groups["TOKEN"]})
    }
    
    let title: string | undefined
    let description: string | undefined
    
    const primaryTitleHeading = document.querySelector<HTMLHeadingElement>(".gm #gd2 #gn")
    const secondaryTitleHeading = document.querySelector<HTMLHeadingElement>(".gm #gd2 #gj")
    const uploaderCommentDiv = document.querySelector<HTMLDivElement>("#cdiv > .c1")
    const primaryTitle = primaryTitleHeading !== null ? primaryTitleHeading.textContent || undefined : undefined
    const secondaryTitle = secondaryTitleHeading !== null ? secondaryTitleHeading.textContent || undefined : undefined
    const uploaderComment = uploaderCommentDiv && uploaderCommentDiv.querySelector("a[name=ulcomment]") ? uploaderCommentDiv.querySelector<HTMLDivElement>("#comment_0")!.innerText || undefined : undefined
    //secondary title通常是日文标题，因此一般优先选用它
    if(secondaryTitle !== undefined) {
        title = secondaryTitle
        //如果同时存在primary title和uploader comment，则将它们组合成为description
        if(primaryTitle !== undefined && uploaderComment !== undefined) description = `${primaryTitle}\n\n${uploaderComment}`
        else if(primaryTitle !== undefined) description = primaryTitle
        else if(uploaderComment !== undefined) description = uploaderComment
    }else if(primaryTitle !== undefined) {
        title = primaryTitle
        if(uploaderComment !== undefined) description = uploaderComment
    }else{
        return {ok: false, err: `Title: jp & en title both not found.`}
    }

    return {
        ok: true,
        value: {tags, title, description, additionalInfo, publishTime}
    }
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
