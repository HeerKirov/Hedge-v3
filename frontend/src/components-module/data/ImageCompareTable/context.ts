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
    thumbnailFile: string | null
    metadata: {
        id: number | null
        file: string | null
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

export function useImageCompareTableContext(columnNum: number, allowIllust: boolean, allowImportImage: boolean, ids: Ref<({type: "IMPORT_IMAGE" | "ILLUST", id: number} | null)[]>, updateId: (idx: number, id: number, type: "ILLUST" | "IMPORT_IMAGE") => void) {
    const context = arrays.newArray(columnNum, index => {
        const idv = ids.value[index]
        const imageData = useImageData(idv)
        const dropEvents = useDropEvents(allowIllust, allowImportImage, (type, id) => updateId(index, id, type))
        return {imageData, dropEvents}
    })

    watch(ids, ids => ids.forEach((id, index) => context[index].imageData.imageId.value = id))

    return {context}
}

function useImageData(initIndex: {type: "IMPORT_IMAGE" | "ILLUST", id: number} | null) {
    const message = useMessageBox()

    const imageId = ref<{type: "IMPORT_IMAGE" | "ILLUST", id: number} | null>(initIndex)

    const { data } = useFetchEndpoint({
        path: imageId,
        get: client => async path => {
            if(path.type === "ILLUST") {
                const metadata = await client.illust.image.get(path.id)
                if(!metadata.ok) return metadata

                const relatedItems = await client.illust.image.relatedItems.get(path.id, {limit: 9})
                if(!relatedItems.ok) return relatedItems

                const sourceData = await client.illust.image.sourceData.get(path.id)
                if(!sourceData.ok) return sourceData

                return {
                    ok: true,
                    status: 200,
                    data: <ImageData>{
                        thumbnailFile: metadata.data.thumbnailFile,
                        metadata: {
                            id: metadata.data.id,
                            file: null,
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
            }else{
                const res = await client.import.get(path.id)
                if(!res.ok) return res

                return {
                    ok: true,
                    status: 200,
                    data: <ImageData>{
                        thumbnailFile: res.data.thumbnailFile,
                        metadata: {
                            id: null,
                            file: res.data.fileName,
                            score: null,
                            favorite: false,
                            description: "",
                            tagme: res.data.tagme,
                            tags: [],
                            topics: [],
                            authors: [],
                            partitionTime: null,
                            createTime: res.data.createTime,
                            updateTime: res.data.createTime,
                            orderTime: res.data.orderTime,
                        },
                        sourceData: {
                            site: res.data.sourceSite,
                            sourceId: res.data.sourceId,
                            sourcePart: res.data.sourcePart,
                        },
                        relatedItems: {
                            collection: res.data.collectionId,
                            books: res.data.bookIds,
                            folders: res.data.folderIds
                        }
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

function useDropEvents(allowIllust: boolean, allowImportImage: boolean, updateId: (type: "IMPORT_IMAGE" | "ILLUST", id: number) => void) {
    const toast = useToast()

    const { dragover: _, ...dropEvents } = useDroppable(allowIllust && allowImportImage ? ["illusts", "importImages"] : allowIllust ? "illusts" : "importImages", (items, type) => {
        if(items.length > 1) {
            toast.toast("选择项过多", "warning", "选择项过多。请仅选择1个项以拖放到此位置。")
            return
        }else if(items.length <= 0) {
            toast.toast("没有选择项", "warning", "选择项为空。")
            return
        }
        updateId(type === "illusts" ? "ILLUST" : "IMPORT_IMAGE", items[0].id)
    })

    return dropEvents
}
