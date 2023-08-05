import { Ref, ref, watch } from "vue"
import { Tagme } from "@/functions/http-client/api/illust"
import { RelatedSimpleTag } from "@/functions/http-client/api/tag"
import { RelatedSimpleTopic } from "@/functions/http-client/api/topic"
import { RelatedSimpleAuthor } from "@/functions/http-client/api/author"
import { SimpleBook } from "@/functions/http-client/api/book"
import { SimpleFolder } from "@/functions/http-client/api/folder"
import { useFetchEndpoint } from "@/functions/fetch"
import { useToast } from "@/modules/toast"
import { useMessageBox } from "@/modules/message-box"
import { useDroppable } from "@/modules/drag"
import { arrays } from "@/utils/primitives"
import { LocalDate, LocalDateTime } from "@/utils/datetime"

export interface ImageData {
    filePath: string | null
    metadata: {
        id: number
        extension: string
        size: number
        resolutionWidth: number
        resolutionHeight: number
        videoDuration: number
        score: number | null
        favorite: boolean
        description: string
        tagme: Tagme[]
        tags: RelatedSimpleTag[],
        topics: RelatedSimpleTopic[],
        authors: RelatedSimpleAuthor[],
        partitionTime: LocalDate | null,
        createTime: LocalDateTime,
        updateTime: LocalDateTime,
        orderTime: LocalDateTime,
    },
    sourceData: {
        site: string | null,
        sourceId: number | null,
        sourcePart: number | null,
    },
    relatedItems: {
        collection: number | string | null,
        books: SimpleBook[],
        folders: SimpleFolder[]
    }
}

export function useImageCompareTableContext(columnNum: number, ids: Ref<(number | null)[]>, updateId: (idx: number, id: number) => void) {
    const context = arrays.newArray(columnNum, index => {
        const idv = ids.value[index]
        const imageData = useImageData(idv)
        const dropEvents = useDropEvents(id => updateId(index, id))
        return {imageData, dropEvents}
    })

    watch(ids, ids => ids.forEach((id, index) => context[index].imageData.imageId.value = id))

    return {context}
}

function useImageData(initIndex: number | null) {
    const message = useMessageBox()

    const imageId = ref<number | null>(initIndex)

    const { data } = useFetchEndpoint({
        path: imageId,
        get: client => async path => {
            const metadata = await client.illust.image.get(path)
                if(!metadata.ok) return metadata

                const relatedItems = await client.illust.image.relatedItems.get(path, {limit: 9})
                if(!relatedItems.ok) return relatedItems

                const sourceData = await client.illust.image.sourceData.get(path)
                if(!sourceData.ok) return sourceData

                return {
                    ok: true,
                    status: 200,
                    data: <ImageData>{
                        filePath: metadata.data.filePath.thumbnail,
                        metadata: {
                            id: metadata.data.id,
                            extension: metadata.data.extension,
                            size: metadata.data.size,
                            resolutionWidth: metadata.data.resolutionWidth,
                            resolutionHeight: metadata.data.resolutionHeight,
                            videoDuration: metadata.data.videoDuration,
                            score: metadata.data.score,
                            favorite: metadata.data.favorite,
                            description: metadata.data.description,
                            tagme: metadata.data.tagme,
                            tags: metadata.data.tags,
                            topics: metadata.data.topics,
                            authors: metadata.data.authors,
                            partitionTime: metadata.data.partitionTime,
                            createTime: metadata.data.createTime,
                            updateTime: metadata.data.updateTime,
                            orderTime: metadata.data.orderTime,
                        },
                        sourceData: {
                            site: sourceData.data.sourceSite,
                            sourceId: sourceData.data.sourceId,
                            sourcePart: sourceData.data.sourcePart,
                        },
                        relatedItems: {
                            collection: relatedItems.data.collection?.id,
                            books: relatedItems.data.books,
                            folders: relatedItems.data.folders
                        }
                    }
                }
        },
        afterRetrieve(path, data, type) {
            if(path !== null && data === null) {
                if(type === "PATH_CHANGED") {
                    message.showOkMessage("prompt", "无法使用此图像。", "请确认图像存在、可用，且不要使用集合。")
                }
                imageId.value = null
            }
        }
    })

    return {imageId, data}
}

function useDropEvents(updateId: (id: number) => void) {
    const toast = useToast()

    const { dragover: _, ...dropEvents } = useDroppable("illusts", items => {
        if(items.length > 1) {
            toast.toast("选择项过多", "warning", "选择项过多。请仅选择1个项以拖放到此位置。")
            return
        }else if(items.length <= 0) {
            toast.toast("没有选择项", "warning", "选择项为空。")
            return
        }
        updateId(items[0].id)
    })

    return dropEvents
}
