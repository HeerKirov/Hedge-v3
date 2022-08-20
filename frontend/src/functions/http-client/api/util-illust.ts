import { HttpInstance, Response } from ".."
import { IllustParent, SimpleIllust } from "./illust"
import { datetime, LocalDateTime } from "@/utils/datetime"

export function createUtilIllustEndpoint(http: HttpInstance): UtilIllustEndpoint {
    return {
        getCollectionSituation: http.createDataRequest("/api/utils/illust/collection-situation", "POST", {
            parseData: illustIds => ({illustIds}),
            parseResponse: d => (<any[]>d).map(mapToCollectionSituation)
        }),
        getImageSituation: http.createDataRequest("/api/utils/illust/image-situation", "POST", {
            parseData: illustIds => ({illustIds}),
            parseResponse: d => (<any[]>d).map(mapToImageSituation)
        }),
        getBookSituation: http.createDataRequest("/api/utils/illust/book-situation", "POST"),
        getFolderSituation: http.createDataRequest("/api/utils/illust/folder-situation", "POST")
    }
}

function mapToCollectionSituation(data: any): CollectionSituation {
    return {
        id: <number>data["id"],
        childrenCount: <number>data["childrenCount"],
        orderTime: datetime.of(<string>data["orderTime"]),
        childrenExamples: <SimpleIllust[]>data["childrenExamples"],
        belongs: <number[]>data["belongs"]
    }
}

function mapToImageSituation(data: any): ImageSituation {
    return {
        id: <number>data["id"],
        thumbnailFile: <string>data["thumbnailFile"],
        orderTime: datetime.of(<string>data["orderTime"]),
        belong: <IllustParent>data["belong"]
    }
}

/**
 * 工具API：图像项目相关工具。
 */
export interface UtilIllustEndpoint {
    /**
     * 查询一组illust的集合所属情况，查询这些项目中的集合项/已经属于其他集合的项，给出这些集合的列表。
     */
    getCollectionSituation(images: number[]): Promise<Response<CollectionSituation[]>>
    /**
     * 查询一组illust的展开图像情况，查询它们展开后的全部images列表，并给出每个image的parent。
     */
    getImageSituation(images: number[]): Promise<Response<ImageSituation[]>>
    /**
     * 查询一组illust的展开图像在指定画集中的所属情况。查询它们展开后的全部images列表，并给出每个image是否属于当前画集。
     */
    getBookSituation(form: BookSituationForm): Promise<Response<BookSituation[]>>
    /**
     * 查询一组illust的展开图像在指定目录中的所属情况。查询它们展开后的全部images列表，并给出每个image是否属于当前目录。
     */
    getFolderSituation(form: FolderSituationForm): Promise<Response<FolderSituation[]>>
}

export interface CollectionSituation {
    /**
     * 集合id。
     */
    id: number
    /**
     * 集合的子项目数量。
     */
    childrenCount: number
    /**
     * 集合的orderTime属性。
     */
    orderTime: LocalDateTime
    /**
     * 列出集合的一部分子项目作为示例。示例从头开始，因此第一项为封面。
     */
    childrenExamples: SimpleIllust[]
    /**
     * 调用API给出的列表中，有哪些id属于这个集合。
     */
    belongs: number[]
}

export interface ImageSituation {
    /**
     * image id。
     */
    id: number
    /**
     * 此图像的缩略图文件路径。
     */
    thumbnailFile: string
    /**
     * 排序时间。最终结果是按照排序时间排序的。
     */
    orderTime: LocalDateTime
    /**
     * 它所属的parent。
     */
    belong: IllustParent | null
}

export interface BookSituation {
    /**
     * image id。
     */
    id: number
    /**
     * 此图像的缩略图文件路径。
     */
    thumbnailFile: string
    /**
     * 如果此项已在画集中存在，那么给出排序顺位；否则给出null。
     */
    ordinal: number | null
}

export interface FolderSituation extends BookSituation {}

export interface BookSituationForm {
    /**
     * 要检验的illust id列表。
     */
    illustIds: number[]
    /**
     * 指定的book。
     */
    bookId: number
    /**
     * 是否只返回已在画集中存在的项。
     */
    onlyExists?: boolean
}

export interface FolderSituationForm {
    /**
     * 要检验的illust id列表。
     */
    illustIds: number[]
    /**
     * 指定的folder。
     */
    folderId: number
    /**
     * 是否只返回已在画集中存在的项。
     */
    onlyExists?: boolean
}
