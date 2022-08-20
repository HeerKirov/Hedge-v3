import { ResourceNotExist } from "../exceptions"
import { HttpInstance, Response } from ".."
import { SimpleAuthor, SimpleTopic, SimpleTag, MetaType } from "./all"
import { SourceTag, SourceTagForm } from "./source-data"

export function createSourceTagMappingEndpoint(http: HttpInstance): SourceTagMappingEndpoint {
    return {
        batchQuery: http.createDataRequest("/api/source-tag-mappings/batch-query", "POST"),
        get: http.createPathRequest(({ sourceSite, sourceTag }) => `/api/source-tag-mappings/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceTag)}`),
        update: http.createPathDataRequest(({ sourceSite, sourceTag }) => `/api/source-tag-mappings/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceTag)}`, "PUT"),
        delete: http.createPathRequest(({ sourceSite, sourceTag }) => `/api/source-tag-mappings/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceTag)}`, "DELETE")
    }
}

export interface SourceTagMappingEndpoint {
    /**
     * 根据给出的tags，查询这些tags的所有能映射到的source tags。
     */
    batchQuery(query: BatchQueryForm): Promise<Response<BatchQueryResult[]>>
    /**
     * 根据给出的指定source tag，获得其映射到的meta tags。
     */
    get(key: SourceTagKey): Promise<Response<SourceMappingTargetDetail[]>>
    /**
     * 修改指定source tag的映射。
     * @param key
     * @param mappings
     */
    update(key: SourceTagKey, mappings: SourceMappingTargetItem[]): Promise<Response<null, SourceTagMappingExceptions["update"]>>
    /**
     * 删除指定source tag的所有映射。
     * @param key
     */
    delete(key: SourceTagKey): Promise<Response<null, SourceTagMappingExceptions["delete"]>>
}

export interface SourceTagMappingExceptions {
    "update": ResourceNotExist<"site", string> | ResourceNotExist<"authors" | "topics" | "tags", number[]>
    "delete": ResourceNotExist<"site", string>
}

interface SourceTagKey {
    sourceSite: string
    sourceTag: string
}

export interface BatchQueryResult {
    tag: string
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
