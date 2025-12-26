import { tz } from "moment-timezone"
import { SourceAdditionalInfoForm, SourceDataUpdateForm, SourceTagForm } from "@/functions/server/api-source-data"
import { EHENTAI_CONSTANTS } from "@/functions/sites"
import { Result } from "@/utils/primitives"


/**
 * 从画廊页面中收集来源数据信息。
 */
export function analyseSourceDataFromGalleryDOM(document: Document, pathname: string): Result<SourceDataUpdateForm, string> {
    const tags: SourceTagForm[] = []
    const tagListDiv = document.querySelector<HTMLDivElement>("#taglist")
    if(tagListDiv) {
        const trList = tagListDiv.querySelectorAll<HTMLTableRowElement>("tr")
        for(const tr of trList) {
            if(tr.childElementCount <= 0) continue
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
    const pathnameMatch = pathname.match(EHENTAI_CONSTANTS.REGEXES.GALLERY_PATHNAME)
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
 * 从image页面DOM结构中提取原文件下载链接。
 */
export function analyseDownloadURLFromImageDOM(document: Document): {downloadURL: string, element: HTMLElement} | {downloadURL: null, element: null} {
    const i3 = document.querySelector<HTMLDivElement>("#i3")
    if(!i3) {
        console.warn("[analyseDownloadURLFromImageDOM] Cannot find div#i3.")
        return {downloadURL: null, element: null}
    }
    const i6 = document.querySelector<HTMLDivElement>("#i6")
    if(!i6) {
        console.warn("[analyseDownloadURLFromImageDOM] Cannot find div#i6.")
        return {downloadURL: null, element: null}
    }
    const i6a = document.querySelector<HTMLAnchorElement>("#i6 div:last-child a")
    if(i6a?.innerText.startsWith("Download original")) {
        //在i6中找到的最后一个元素是Download original，则表示此图像有original，使用anchor的下载链接
        return {downloadURL: i6a.href, element: i3}
    }else{
        //否则表明此图像没有original，使用直接使用图像地址
        const img = document.querySelector<HTMLImageElement>("#img")
        if(!img) {
            console.warn("[analyseDownloadURLFromImageDOM] Cannot find #img.")
            return {downloadURL: null, element: null}
        }
        return {downloadURL: img.src, element: i3}
    }
}

/**
 * 解析搜索字符串，将其切割成多个关键词。
 */
export function analyseSearchKeywords(search: string): string[] {
    // 规则：分割方式只依赖空格，且空格必须在引号外有效，关键词内的引号去除，不丢弃无冒号的普通词
    const result: string[] = []
    let buf = ""
    let inQuote = false

    for (let i = 0; i < search.length; i++) {
        const char = search[i]

        if (char === '"') {
            // 只切换引号状态，不存储引号
            inQuote = !inQuote
        } else if (/\s/.test(char) && !inQuote) {
            // 引号外的空白分割
            if (buf.length > 0) {
                result.push(buf)
                buf = ""
            }
        } else {
            buf += char
        }
    }

    if (buf.length > 0) {
        result.push(buf)
    }
    return result
}

/**
 * 检测关键词是否符合标签的形式，并返回标签的类型和名称。
 */
export function isTagKeyword(keyword: string): {type: string, name: string} | null {
    const match = keyword.match(/^([^:]+):([^$]+)\$?$/)
    if(match) {
        return {type: match[1], name: match[2]}
    }
    return null
}