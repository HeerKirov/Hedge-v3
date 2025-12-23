import { SourceDataUpdateForm, SourceTagForm } from "@/functions/server/api-source-data"
import { Result } from "@/utils/primitives"

/**
 * 从预加载数据收集来源数据。
 */
export function analyseSourceDataFromPreloadData(preloadData: object): Result<SourceDataUpdateForm, string> {
    const body = (preloadData as any)["body"]
    if (!body) {
        return {
            ok: false,
            err: "preloadData.body 不存在"
        }
    }

    const tags: SourceTagForm[] = []

    //查找作者，作为tag写入。作者的type固定为"artist"，code为"{UID}"
    if (body["userId"] && body["userName"]) {
        tags.push({code: body["userId"], name: body["userName"], type: "artist"})
    }

    //查找标签列表，作为tag写入。标签的type固定为"tag"，code为"{NAME}"
    //R-18, R-18G, AI-CREATED 作为meta类型的标签写入
    if (body["tags"]?.tags && Array.isArray(body["tags"].tags)) {
        for(const tag of body["tags"].tags) {
            const name = tag["tag"]
            const otherName = tag["translation"]?.["en"] ?? undefined
            if(name === "R-18") {
                tags.push({code: "R-18", type: "meta"})
            }else if(name === "R-18G") {
                tags.push({code: "R-18G", type: "meta"})
            }else{
                tags.push({code: name, name, otherName, type: "tag"})
            }
        }
    }
    if(body["aiType"] === 2) {
        tags.push({code: "AI-CREATED", name: "AI生成", type: "meta"})
    }

    const title = body["title"] ?? body["illustTitle"] ?? undefined

    let description: string | undefined
    const descText = body["description"] ?? body["illustComment"]
    if(descText) {
        description = descText.replaceAll(/<br\s*\/?>/g, "\n")
    }

    let publishTime: string | undefined
    if(body["createDate"]) {
        const date = new Date(body["createDate"])
        publishTime = date.toISOString()
    }

    return {
        ok: true,
        value: {tags, title, description, publishTime}
    }
}