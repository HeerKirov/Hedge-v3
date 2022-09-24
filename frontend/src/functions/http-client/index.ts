import { createHttpInstance, mapResponse, HttpInstance, HttpInstanceConfig, Response, ResponseOk, ResponseError, ResponseConnectionError } from "./instance"
import { createServiceEndpoint, ServiceEndpoint } from "./api/service"
import { createSettingServiceEndpoint, SettingServiceEndpoint } from "./api/setting-service"
import { createSettingImportEndpoint, SettingImportEndpoint } from "./api/setting-import"
import { createSettingSourceEndpoint, SettingSourceEndpoint } from "./api/setting-source"
import { createSettingMetaEndpoint, SettingMetaEndpoint } from "./api/setting-meta"
import { createSettingQueryEndpoint, SettingQueryEndpoint } from "./api/setting-query"
import { createIllustEndpoint, IllustEndpoint } from "./api/illust"
import { createBookEndpoint, BookEndpoint } from "./api/book"
import { createFolderEndpoint, FolderEndpoint } from "./api/folder"
import { createTagEndpoint, TagEndpoint } from "./api/tag"
import { createAnnotationEndpoint, AnnotationEndpoint } from "./api/annotations"
import { createAuthorEndpoint, AuthorEndpoint } from "./api/author"
import { createTopicEndpoint, TopicEndpoint } from "./api/topic"
import { createPartitionEndpoint, PartitionEndpoint } from "./api/partition"
import { createImportEndpoint, ImportEndpoint } from "./api/import"
import { createSourceDataEndpoint, SourceDataEndpoint } from "./api/source-data"
import { createSourceTagMappingEndpoint, SourceTagMappingEndpoint } from "./api/source-tag-mapping"
import { createFindSimilarEndpoint, FindSimilarEndpoint } from "./api/find-similar"
import { createUtilMetaEndpoint, UtilMetaEndpoint } from "./api/util-meta"
import { createUtilIllustEndpoint, UtilIllustEndpoint } from "./api/util-illust"
import { createUtilQueryEndpoint, UtilQueryEndpoint } from "./api/util-query"
import { createUtilSearchEndpoint, UtilSearchEndpoint } from "./api/util-picker"
import { createSettingFindSimilarEndpoint, SettingFindSimilarEndpoint } from "./api/setting-find-similar"
import { mapListResult, ListResult } from "./api/all"

export { mapListResult, mapResponse }
export type { HttpInstance, HttpInstanceConfig as HttpClientConfig, Response, ResponseOk, ResponseError, ResponseConnectionError, ListResult }

export interface HttpClient {
    serviceRuntime: ServiceEndpoint
    settingService: SettingServiceEndpoint
    settingMeta: SettingMetaEndpoint
    settingQuery: SettingQueryEndpoint
    settingImport: SettingImportEndpoint
    settingSource: SettingSourceEndpoint
    settingFindSimilar: SettingFindSimilarEndpoint
    illust: IllustEndpoint
    partition: PartitionEndpoint
    book: BookEndpoint
    folder: FolderEndpoint
    tag: TagEndpoint
    author: AuthorEndpoint
    topic: TopicEndpoint
    annotation: AnnotationEndpoint
    import: ImportEndpoint
    sourceImage: SourceDataEndpoint
    sourceTagMapping: SourceTagMappingEndpoint
    findSimilar: FindSimilarEndpoint
    metaUtil: UtilMetaEndpoint
    illustUtil: UtilIllustEndpoint
    queryUtil: UtilQueryEndpoint
    searchUtil: UtilSearchEndpoint
}

export function createHttpClient(config: HttpInstanceConfig): HttpClient {
    const http = createHttpInstance(config)

    return {
        serviceRuntime: createServiceEndpoint(http),
        settingService: createSettingServiceEndpoint(http),
        settingMeta: createSettingMetaEndpoint(http),
        settingQuery: createSettingQueryEndpoint(http),
        settingImport: createSettingImportEndpoint(http),
        settingSource: createSettingSourceEndpoint(http),
        settingFindSimilar: createSettingFindSimilarEndpoint(http),
        illust: createIllustEndpoint(http),
        partition: createPartitionEndpoint(http),
        book: createBookEndpoint(http),
        folder: createFolderEndpoint(http),
        tag: createTagEndpoint(http),
        author: createAuthorEndpoint(http),
        topic: createTopicEndpoint(http),
        annotation: createAnnotationEndpoint(http),
        import: createImportEndpoint(http),
        sourceImage: createSourceDataEndpoint(http),
        sourceTagMapping: createSourceTagMappingEndpoint(http),
        findSimilar: createFindSimilarEndpoint(http),
        metaUtil: createUtilMetaEndpoint(http),
        illustUtil: createUtilIllustEndpoint(http),
        queryUtil: createUtilQueryEndpoint(http),
        searchUtil: createUtilSearchEndpoint(http)
    }
}
