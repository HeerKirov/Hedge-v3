import { SimpleAuthor, SimpleTag, SimpleTopic, SourceTagPath } from "./api-all"
import { createPathRequest } from "./impl"

export const sourceTagMapping = {
    get: createPathRequest<SourceTagPath, SourceMappingTargetDetail[], never>(({ sourceSite, sourceTagType, sourceTagCode }) => `/api/source-tag-mappings/${encodeURIComponent(sourceSite)}/${encodeURIComponent(sourceTagType)}/${encodeURIComponent(sourceTagCode)}`)
}

export type SourceMappingTargetDetail
    = { metaType: "AUTHOR", metaTag: SimpleAuthor }
    | { metaType: "TOPIC", metaTag: SimpleTopic }
    | { metaType: "TAG", metaTag: SimpleTag }