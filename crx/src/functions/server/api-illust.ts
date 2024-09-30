import { SourceDataPath, FilePath, RelatedSimpleTopic, RelatedSimpleAuthor, RelatedSimpleTag, SimpleBook, SimpleFolder } from "./api-all"
import { createPathDataRequest, createPathRequest } from "./impl"
import { NotFound } from "./exceptions"

export const illust = {
    get: createPathRequest<number, DetailIllust, NotFound>(id => `/api/illusts/${id}`, "GET"),
    image: {
        getRelatedItems: createPathDataRequest<number, {limit?: number}, ImageRelatedItems, NotFound>(id => `/api/illusts/image/${id}/related-items`, "GET"),
    }
}

export type IllustType = "COLLECTION" | "IMAGE"

export type Tagme = "TAG" | "AUTHOR" | "TOPIC" | "SOURCE"

export interface Illust {
    /**
     * illust id。
     */
    id: number
    /**
     * illust类型。
     */
    type: IllustType
    /**
     * 子项目的数量。只有类型为COLLECTION的项目会有子项目。
     */
    childrenCount: number | null
    /**
     * 此项目的文件路径。
     */
    filePath: FilePath
    /**
     * 此项目的评分。可能由手写评分或父子项目导出。
     */
    score: number | null
    /**
     * 是否收藏。
     */
    favorite: boolean
    /**
     * tagme标记。
     */
    tagme: Tagme[]
    /**
     * source。
     */
    source: SourceDataPath | null
    /**
     * 此项目的排序时间。
     */
    orderTime: string
}

export interface DetailIllust extends Illust {
    /**
     * 扩展名。
     */
    extension: string
    /**
     * 文件大小。
     */
    size: number
    /**
     * 分辨率宽度。
     */
    resolutionWidth: number
    /**
     * 分辨率高度。
     */
    resolutionHeight: number
    /**
     * 视频文件时长，单位毫秒。如果不存在或没有，则是0。
     */
    videoDuration: number
    /**
     * 主题。
     */
    topics: RelatedSimpleTopic[]
    /**
     * 作者。
     */
    authors: RelatedSimpleAuthor[]
    /**
     * 标签。
     */
    tags: RelatedSimpleTag[]
    /**
     * 描述。可能由手写描述或父集合导出。
     */
    description: string
    /**
     * 手写的原始描述。
     */
    originDescription: string
    /**
     * 手写的原始评分。
     */
    originScore: number | null
    /**
     * 分区时间。
     */
    partitionTime: string
    /**
     * 创建时间。
     */
    createTime: string
    /**
     * 关联的图像上次发生更新的时间。
     */
    updateTime: string
}

export interface SimpleIllust {
    id: number
    filePath: FilePath
}

export interface SimpleCollection extends SimpleIllust {
    childrenCount: number
}

export interface CollectionRelatedItems {
    /**
     * 关联组。
     */
    associates: Illust[]
    /**
     * image所属的画集列表。
     */
    books: SimpleBook[]
    /**
     * image所属的文件夹列表。
     */
    folders: SimpleFolder[]
}

export interface ImageRelatedItems extends CollectionRelatedItems {
    /**
     * image所属的collection。
     */
    collection: SimpleCollection | null
}