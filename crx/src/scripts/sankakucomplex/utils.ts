import { tz } from "moment-timezone"
import { SourceDataUpdateForm, SourceTagForm, SourceBookForm } from "@/functions/server/api-source-data"
import { Result } from "@/utils/primitives"


export function analyseDownloadURLFromPostDOM(document: Document): {downloadURL: string, element: HTMLElement, thumbnailURL: string} | {downloadURL: null, element: null, thumbnailURL: null} {
    const postContent = document.querySelector<HTMLDivElement>("#post-content")
    if(!postContent) {
        console.warn("[initializeUI] Cannot find #post-content.")
        return {downloadURL: null, element: null, thumbnailURL: null}
    }
    const imageLink = postContent.querySelector<HTMLAnchorElement>("#image-link")
    let url: string, thumbnail: string
    if(imageLink) {
        if(imageLink.classList.contains("sample") && imageLink.href) {
            url = imageLink.href
            thumbnail = imageLink.querySelector("img")?.src ?? ""
        }else if(imageLink.classList.contains("full")) {
            const img = imageLink.querySelector("img")
            if(img) {
                url = thumbnail = img.src
            }else{
                console.warn("[initializeUI] Cannot find #image-link > img.")
                return {downloadURL: null, element: null, thumbnailURL: null}
            }
        }else{
            console.warn("[initializeUI] Cannot find #image-link with class 'full' or 'sample'.")
            return {downloadURL: null, element: null, thumbnailURL: null}
        }
    }else{
        const video = postContent.querySelector<HTMLVideoElement>("video#image")
        if(video) {
            url = video.src
            thumbnail = ""
        }else{
            console.warn("[initializeUI] Cannot find #image-link or video#image.")
            return {downloadURL: null, element: null, thumbnailURL: null}
        }
    }
    return {downloadURL: url, element: postContent, thumbnailURL: thumbnail}
}

/**
 * 从DOM结构中解析来源数据。
 */
export function analyseSourceDataFromPostDOM(document: Document): Result<SourceDataUpdateForm, string> {
    const tagsResponse = analyseTagsFromPostDOM(document)
    let tags: SourceTagForm[]
    if(tagsResponse.ok) {
        tags = tagsResponse.value
    }else{
        return tagsResponse
    }
    
    const books: SourceBookForm[] = []
    //此处依然使用了legacy模式。好处是节省请求；坏处是book的jp name无法获得。
    const statusNotice = document.querySelectorAll(".content .status-notice")
    if(statusNotice.length) {
        for(const sn of statusNotice) {
            if(sn.id.startsWith("pool")) {
                const bookId = sn.id.slice("pool".length)
                const anchor = sn.querySelector("a")
                const title = anchor && anchor.textContent ? anchor.textContent : undefined
                books.push({code: bookId, title})
            }
        }
    }

    const relations: number[] = []
    //此处依然使用了legacy模式。好处是节省请求；坏处是能获得的children数量有限，只有5个。
    const parentPreviewDiv = document.querySelector("div#parent-preview")
    if(parentPreviewDiv) {
        const spanList = parentPreviewDiv.querySelectorAll<HTMLSpanElement>("span.thumb")
        for(const span of spanList) {
            const id = parseInt(span.id.slice(1))
            relations.push(id)
        }
    }
    const childPreviewDiv = document.querySelector("div#child-preview")
    if(childPreviewDiv) {
        const spanList = childPreviewDiv.querySelectorAll<HTMLSpanElement>("span.thumb")
        for(const span of spanList) {
            const id = parseInt(span.id.slice(1))
            relations.push(id)
        }
    }

    let publishTime: string | undefined
    //这里的选取器并不稳固，它将stats下的第一个anchor当作posted发布时间
    const publishAnchor = document.querySelector<HTMLAnchorElement>("#stats > a")
    if(publishAnchor) {
        //anchor的title是发布时间，但它的时区有点怪，似乎固定使用美国东部时区America/New_York
        try {
            publishTime = tz(publishAnchor.title, "America/New_York").toDate().toISOString()
        }catch(e){
            console.error(`Cannot analysis publish time [${publishAnchor.title}]`, e)
        }
    }

    return {
        ok: true,
        value: {tags, books, relations, publishTime}
    }
}

export function analyseTagsFromPostDOM(document: Document, filterTypes?: string[]): Result<SourceTagForm[], string> {
    const tags: SourceTagForm[] = []
    const tagLiList = document.querySelectorAll("#tag-sidebar li")
    for(let i = 0; i < tagLiList.length; ++i) {
        const tagLi = tagLiList[i]
        const tag: SourceTagForm = {code: "", name: undefined, otherName: undefined, type: ""}
        if(tagLi.className.startsWith("tag-type-")) {
            tag.type = tagLi.className.substring("tag-type-".length)
        }else{
            return {ok: false, err: `Tag[${i}]: cannot infer tag type from its class '${tagLi.className}'.`}
        }
        const tagAnchor = tagLi.querySelector<HTMLAnchorElement>("a[itemprop=\"keywords\"]")
        if(tagAnchor !== null && tagAnchor.textContent) {
            tag.code = tagAnchor.textContent.replaceAll("_", " ")
        }else{
            return {ok: false, err: `Tag[${i}]: Cannot find its anchor.`}
        }
        if(filterTypes && !filterTypes.includes(tag.type)) {
            continue
        }
        //tips: 网站又改了，已经不能直接从DOM结构获取jp name等信息了，因此这里的代码暂时移除。
        tags.push(tag)
    }
    return {ok: true, value: tags}
}