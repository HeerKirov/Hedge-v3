import { ResourceNotExist } from "../exceptions"
import { HttpInstance, Response } from ".."
import { SimpleAuthor, SimpleTopic, SimpleTag, MetaType, SourceTagPath } from "./all"
import { SourceTag, SourceTagForm } from "./source-data"

export function createSourceTagMappingEndpoint(http: HttpInstance): SourceTagMappingEndpoint {
    return {
        batchQuery: http.createDataRequest("/api/source-tag-mappings/batch-query", "POST"),
        get: http.createPathRequest(({ sourceSite, sourceTagType, sourceTagCode }) => `/api/source-tag-mappings/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceTagType)}/${encodeURIComponent(sourceTagCode)}`),
        update: http.createPathDataRequest(({ sourceSite, sourceTagType, sourceTagCode }) => `/api/source-tag-mappings/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceTagType)}/${encodeURIComponent(sourceTagCode)}`, "PUT"),
        delete: http.createPathRequest(({ sourceSite, sourceTagType, sourceTagCode }) => `/api/source-tag-mappings/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceTagType)}/${encodeURIComponent(sourceTagCode)}`, "DELETE")
    }
}

export interface SourceTagMappingEndpoint {
    /**
     * 根据给出的tags，查询这些tags的所有能映射到的source tags。
     */
    batchQuery(paths: SourceTagPath[]): Promise<Response<BatchQueryResult[]>>
    /**
     * 根据给出的指定source tag，获得其映射到的meta tags。
     */
    get(key: SourceTagPath): Promise<Response<SourceMappingTargetDetail[]>>
    /**
     * 修改指定source tag的映射。
     * @param key
     * @param mappings
     */
    update(key: SourceTagPath, mappings: SourceMappingTargetItem[]): Promise<Response<null, SourceTagMappingExceptions["update"]>>
    /**
     * 删除指定source tag的所有映射。
     * @param key
     */
    delete(key: SourceTagPath): Promise<Response<null, SourceTagMappingExceptions["delete"]>>
}

export interface SourceTagMappingExceptions {
    "update": ResourceNotExist<"site", string> | ResourceNotExist<"authors" | "topics" | "tags", number[]>
    "delete": ResourceNotExist<"site", string>
}

export interface BatchQueryResult {
    site: string
    type: string
    code: string
    sourceTag: SourceTag
    mappings: SourceMappingTargetDetail[]
}

export type SourceMappingTargetDetail
    = { metaType: "AUTHOR", metaTag: SimpleAuthor }
    | { metaType: "TOPIC", metaTag: SimpleTopic }
    | { metaType: "TAG", metaTag: SimpleTag }

export interface SourceMappingTargetItem {
    metaType: MetaType
    metaId: number
}

export interface MappingSourceTag extends SourceTag {
    site: string
}

export interface MappingSourceTagForm extends SourceTagForm {
    site: string
}

export interface BatchQueryForm {
    site: string
    tags: string[]
}
