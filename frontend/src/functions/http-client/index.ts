import { createHttpInstance, mapResponse, flatResponse, HttpInstance, HttpInstanceConfig, Response, ResponseOk, ResponseError, ResponseConnectionError } from "./instance"
import { createHomepageEndpoint, HomepageEndpoint } from "./api/homepage"
import { createServiceEndpoint, ServiceEndpoint } from "./api/service"
import { createSettingEndpoint, SettingEndpoint } from "./api/setting"
import { createIllustEndpoint, IllustEndpoint } from "./api/illust"
import { createImportEndpoint, ImportEndpoint } from "./api/import"
import { createTrashEndpoint, TrashEndpoint } from "./api/trash"
import { createBookEndpoint, BookEndpoint } from "./api/book"
import { createFolderEndpoint, FolderEndpoint } from "./api/folder"
import { createTagEndpoint, TagEndpoint } from "./api/tag"
import { createAuthorEndpoint, AuthorEndpoint } from "./api/author"
import { createTopicEndpoint, TopicEndpoint } from "./api/topic"
import { createAnnotationEndpoint, AnnotationEndpoint } from "./api/annotations"
import { createPartitionEndpoint, PartitionEndpoint } from "./api/partition"
import { createSourceDataEndpoint, SourceDataEndpoint } from "./api/source-data"
import { createSourceTagMappingEndpoint, SourceTagMappingEndpoint } from "./api/source-tag-mapping"
import { createFindSimilarEndpoint, FindSimilarEndpoint } from "./api/find-similar"
import { createUtilMetaEndpoint, UtilMetaEndpoint } from "./api/util-meta"
import { createUtilIllustEndpoint, UtilIllustEndpoint } from "./api/util-illust"
import { createUtilQueryEndpoint, UtilQueryEndpoint } from "./api/util-query"
import { createUtilSearchEndpoint, UtilSearchEndpoint } from "./api/util-picker"
import { createUtilExportEndpoint, UtilExportEndpoint } from "./api/util-export"
import { createAssets, Assets } from "./api/assets"
import { mapListResult, ListResult } from "./api/all"

export { mapListResult, mapResponse, flatResponse }
export type { HttpInstance, HttpInstanceConfig as HttpClientConfig, Response, ResponseOk, ResponseError, ResponseConnectionError, ListResult }

export interface HttpClient {
    homepage: HomepageEndpoint
    serviceRuntime: ServiceEndpoint
    setting: SettingEndpoint
    illust: IllustEndpoint
    partition: PartitionEndpoint
    book: BookEndpoint
    folder: FolderEndpoint
    tag: TagEndpoint
    author: AuthorEndpoint
    topic: TopicEndpoint
    annotation: AnnotationEndpoint
    import: ImportEndpoint
    trash: TrashEndpoint
    sourceData: SourceDataEndpoint
    sourceTagMapping: SourceTagMappingEndpoint
    findSimilar: FindSimilarEndpoint
    metaUtil: UtilMetaEndpoint
    illustUtil: UtilIllustEndpoint
    queryUtil: UtilQueryEndpoint
    searchUtil: UtilSearchEndpoint
    exportUtil: UtilExportEndpoint
    assets: Assets
}

export function createHttpClient(config: HttpInstanceConfig): HttpClient {
    const http = createHttpInstance(config)

    return {
        homepage: createHomepageEndpoint(http),
        serviceRuntime: createServiceEndpoint(http),
        setting: createSettingEndpoint(http),
        illust: createIllustEndpoint(http),
        partition: createPartitionEndpoint(http),
        book: createBookEndpoint(http),
        folder: createFolderEndpoint(http),
        tag: createTagEndpoint(http),
        author: createAuthorEndpoint(http),
        topic: createTopicEndpoint(http),
        annotation: createAnnotationEndpoint(http),
        import: createImportEndpoint(http),
        trash: createTrashEndpoint(http),
        sourceData: createSourceDataEndpoint(http),
        sourceTagMapping: createSourceTagMappingEndpoint(http),
        findSimilar: createFindSimilarEndpoint(http),
        metaUtil: createUtilMetaEndpoint(http),
        illustUtil: createUtilIllustEndpoint(http),
        queryUtil: createUtilQueryEndpoint(http),
        searchUtil: createUtilSearchEndpoint(http),
        exportUtil: createUtilExportEndpoint(http),
        assets: createAssets(http)
    }
}
