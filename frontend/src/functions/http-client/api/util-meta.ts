import { HttpInstance, Response } from ".."
import { ConflictingGroupMembersError, NotFound, ResourceNotExist } from "../exceptions"
import { IdentityType, MetaType } from "./all"
import { RelatedSimpleTag } from "./tag"
import { RelatedSimpleTopic } from "./topic"
import { RelatedSimpleAuthor } from "./author"
import { SimpleBook } from "./book"

export function createUtilMetaEndpoint(http: HttpInstance): UtilMetaEndpoint {
    return {
        validate: http.createDataRequest("/api/utils/meta-editor/validate", "POST"),
        suggest: http.createDataRequest("/api/utils/meta-editor/suggest", "POST"),
        history: {
            identities: {
                list: http.createRequest("/api/utils/meta-editor/history/identities"),
                get: http.createPathRequest(i => `/api/utils/meta-editor/history/identities/${i.type}/${i.id}`),
                push: http.createDataRequest("/api/utils/meta-editor/history/identities", "POST"),
            },
            metaTags: {
                list: http.createRequest("/api/utils/meta-editor/history/meta-tags"),
                push: http.createDataRequest("/api/utils/meta-editor/history/meta-tags", "POST", {
                    parseData: (metas: MetaUtilMetaForm[]) => ({metas})
                }),
                clear: http.createRequest("/api/utils/meta-editor/history/meta-tags", "DELETE"),
            }
        }
    }
}

/**
 * 工具API：元数据相关工具。
 */
export interface UtilMetaEndpoint {
    /**
     * 对元数据内容做推导，并校验是否合法。
     * 校验内容包括tag的类型匹配和冲突组情况。
     * 此API用于在tag editor中，实时对meta tag list的内容做校验，获得推导结果列表，并提出警告和错误信息。
     */
    validate(form: MetaUtilValidationForm): Promise<Response<MetaUtilValidation, ConflictingGroupMembersError | ResourceNotExist<"tags" | "authors" | "topics", number[]>>>
    /**
     * 根据给出的元素对象，推导出建议使用的元数据列表。
     */
    suggest(form: MetaUtilIdentity): Promise<Response<MetaUtilSuggestion[], ResourceNotExist<"tags" | "topics" | "authors", number>>>
    /**
     * 元数据标签的使用记录器。
     */
    history: {
        /**
         * 被编辑的对象记录。它是不持久化存储的，一旦程序退出就会清空。
         */
        identities: {
            /**
             * 列出最近使用过的对象。按时间降序。
             */
            list(): Promise<Response<MetaUtilIdentity[]>>
            /**
             * 根据一个对象，快捷获取其目前的元数据。
             * @throws NotFound 找不到此对象，可能已经发生了变动。
             */
            get(identity: MetaUtilIdentity): Promise<Response<MetaUtilResult, NotFound>>
            /**
             * 发送一条编辑记录到服务器。
             */
            push(form: MetaUtilIdentity): Promise<Response<null>>
        }
        /**
         * 被使用的元数据标签记录。
         */
        metaTags: {
            /**
             * 列出最近使用过的标签。按时间降序。每类不同的标签单独计数。
             */
            list(): Promise<Response<MetaUtilResult>>
            /**
             * 发送一条使用记录到服务器。
             */
            push(form: MetaUtilMetaForm[]): Promise<Response<null>>
            /**
             * 清空所有历史记录。
             */
            clear(): Promise<Response<null>>
        }
    }
}

export interface MetaUtilValidation {
    topics: RelatedSimpleTopic[]
    authors: RelatedSimpleAuthor[]
    tags: RelatedSimpleTag[]
    notSuitable: RelatedSimpleTag[]
    conflictingMembers: ConflictingMembers[]
}

interface ConflictingMembers {
    group: RelatedSimpleTag
    force: boolean
    members: RelatedSimpleTag[]
}

export interface MetaUtilResult {
    topics: RelatedSimpleTopic[]
    authors: RelatedSimpleAuthor[]
    tags: RelatedSimpleTag[]
}

export type MetaUtilSuggestion = MetaUtilSuggestionByParentCollection | MetaUtilSuggestionByBook | MetaUtilSuggestionByChildren | MetaUtilSuggestionByAssociate
interface AbstractMetaUtilSuggestion<T extends string> extends MetaUtilResult { type: T }
interface MetaUtilSuggestionByParentCollection extends AbstractMetaUtilSuggestion<"collection"> { collectionId: number }
interface MetaUtilSuggestionByBook extends AbstractMetaUtilSuggestion<"book"> { book: SimpleBook }
interface MetaUtilSuggestionByChildren extends AbstractMetaUtilSuggestion<"children"> {}
interface MetaUtilSuggestionByAssociate extends AbstractMetaUtilSuggestion<"associate"> {}

export interface MetaUtilIdentity {
    type: IdentityType
    id: number
}

export interface MetaUtilMetaForm {
    type: MetaType
    id: number
}

export interface MetaUtilValidationForm {
    topics: number[] | null
    authors: number[] | null
    tags: number[] | null
}
