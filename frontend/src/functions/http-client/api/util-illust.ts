import { HttpInstance, Response } from ".."
import { FilePath } from "./all"
import { SimpleCollection, SimpleIllust } from "./illust"
import { date, datetime, LocalDate, LocalDateTime } from "@/utils/datetime"

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
        getFolderSituation: http.createDataRequest("/api/utils/illust/folder-situation", "POST"),
        getOrganizationSituation: http.createDataRequest("/api/utils/illust/organization-situation", "POST", {
            parseResponse: d => (<any[][]>d).map(g => g.map(mapToOrganizationSituation))
        }),
        applyOrganizationSituation: http.createDataRequest("/api/utils/illust/organization-situation/apply", "POST", {
            parseData: mapFromOrganizationSituationApplyForm
        }),
    }
}

function mapToCollectionSituation(data: any): CollectionSituation {
    return {
        partitionTime: (<string | null>data["partitionTime"]) !== null ? date.of(data["partitionTime"]) : null,
        collections: (<any[]>data["collections"]).map(data => ({
            collectionId: <number>data["collectionId"],
            childrenCount: <number>data["childrenCount"],
            orderTime: datetime.of(<string>data["orderTime"]),
            childrenExamples: <SimpleIllust[]>data["childrenExamples"],
            belongs: <number[]>data["belongs"]
        })),
        images: <SimpleIllust[]>data["images"]
    }
}

function mapToImageSituation(data: any): ImageSituation {
    return {
        id: <number>data["id"],
        filePath: <FilePath>data["filePath"],
        orderTime: datetime.of(<string>data["orderTime"]),
        belong: <SimpleCollection>data["belong"]
    }
}

function mapToOrganizationSituation(data: any): OrganizationSituation {
    return {
        id: <number>data["id"],
        filePath: <FilePath>data["filePath"],
        orderTime: datetime.of(<string>data["orderTime"]),
        newOrderTime: data["newOrderTime"] ? datetime.of(<string>data["newOrderTime"]) : null
    }
}

function mapFromOrganizationSituationApplyForm(form: OrganizationSituationApplyForm): any {
    return {
        groups: form.groups.map(group => group.map(data => ({
            id: data.id,
            newOrderTime: data.newOrderTime !== null ? datetime.toISOString(data.newOrderTime) : null,
        })))
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
    /**
     * 对一组illust进行整理，返回它们的分组情况。
     */
    getOrganizationSituation(form: OrganizationSituationForm): Promise<Response<OrganizationSituation[][]>>
    /**
     * 应用一组illust的整理。
     */
    applyOrganizationSituation(form: OrganizationSituationApplyForm): Promise<Response<null>>
}

export interface CollectionSituation {
    partitionTime: LocalDate | null
    collections: CollectionSituationNoCol[]
    images: SimpleIllust[]
}

export interface CollectionSituationNoCol {
    /**
     * 集合id。
     */
    collectionId: number
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
     * 此图像的文件路径。
     */
    filePath: FilePath
    /**
     * 排序时间。最终结果是按照排序时间排序的。
     */
    orderTime: LocalDateTime
    /**
     * 它所属的parent。
     */
    belong: SimpleCollection | null
}

export interface BookSituation {
    /**
     * image id。
     */
    id: number
    /**
     * 此图像的文件路径。
     */
    filePath: FilePath
    /**
     * 如果此项已在画集中存在，那么给出排序顺位；否则给出null。
     */
    ordinal: number | null
}

export interface FolderSituation extends BookSituation {}

export interface OrganizationSituation {
    /**
     * image id。
     */
    id: number
    /**
     * 此图像的文件路径。
     */
    filePath: FilePath
    /**
     * 此图像原本的排序时间。
     */
    orderTime: LocalDateTime
    /**
     * 此图像应该被设定的新排序时间。
     */
    newOrderTime: LocalDateTime | null
}

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
     * 是否只返回已在目录中存在的项。
     */
    onlyExists?: boolean
}

export interface OrganizationSituationForm {
    /**
     * 要进行组织整理的image id列表。
     */
    illustIds: number[]
    /**
     * 仅有相邻的图像会被划分为一个集合，当图像不相邻时就不会成组了。
     */
    onlyNeighbours?: boolean
    /**
     * 分组划分完成后，进行重排序，使同一个组的项聚拢到一起，多个组的排序顺序由这个组中最靠前的项决定。onlyNeighbours开启时，此选项显然无意义。
     */
    gatherGroup?: boolean
    /**
     * 分组划分完成后，进行重排序，在每个组内按照来源顺序重新组织排序时间。resortAtAll开启时，此选项显然无意义。
     */
    resortInGroup?: boolean
    /**
     * 分组划分开始之前就进行一次全局重排序，按照来源顺序重新组织排序时间。
     */
    resortAtAll?: boolean
}

export interface OrganizationSituationApplyForm {
    groups: {id: number, newOrderTime: LocalDateTime | null}[][]
}