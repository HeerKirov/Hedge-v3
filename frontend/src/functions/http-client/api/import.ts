import { date, datetime, LocalDate, LocalDateTime } from "@/utils/datetime"
import {
    FileNotFoundError, IllegalFileExtensionError,
    NotFound, ResourceNotExist, StorageNotAccessibleError
} from "../exceptions"
import { HttpInstance, Response } from "../instance"
import { IdResponse, LimitAndOffsetFilter, ListResult, mapFromOrderList, NullableFilePath, OrderList, SourceDataPath } from "./all"
import { ImagePropsCloneForm, Tagme } from "./illust"
import { RelatedSimpleTopic } from "./topic"
import { RelatedSimpleAuthor } from "./author"
import { RelatedSimpleTag } from "./tag"
import { OrderTimeType } from "./setting"

export function createImportEndpoint(http: HttpInstance): ImportEndpoint {
    return {
        list: http.createQueryRequest("/api/imports", "GET", { 
            parseQuery: mapFromImportFilter, 
            parseResponse: ({ total, result }: ListResult<any>) => ({total, result: result.map(mapToImportImage)}) 
        }),
        import: http.createDataRequest("/api/imports/import", "POST"),
        upload: http.createDataRequest("/api/imports/upload", "POST", { parseData: mapFromUploadFile }),
        batch: http.createDataRequest("/api/imports/batch", "POST"),
        get: http.createPathRequest(id => `/api/imports/${id}`, "GET", { parseResponse: mapToDetailImportImage }),
        watcher: {
            get: http.createRequest("/api/imports/watcher", "GET"),
            update: http.createDataRequest("/api/imports/watcher", "POST")
        }
    }
}

function mapFromImportFilter(filter: ImportFilter): any {
    return {
        ...filter,
        order: mapFromOrderList(filter.order)
    }
}

function mapFromUploadFile(file: File): FormData {
    const form = new FormData()
    form.set("file", file)
    return form
}

function mapToImportImage(data: any): ImportRecord {
    return {
        ...data,
        importTime: datetime.of(<string>data["importTime"]),
        illust: data["illust"] && {
            ...data["illust"],
            orderTime: datetime.of(<string>data["illust"]["orderTime"]),
            partitionTime: date.of(<string>data["illust"]["partitionTime"])
        }
    }
}

function mapToDetailImportImage(data: any): DetailImportRecord {
    return {
        ...data,
        importTime: datetime.of(<string>data["importTime"]),
        fileCreateTime: data["fileCreateTime"] !== null ? datetime.of(<string>data["fileCreateTime"]) : null,
        fileUpdateTime: data["fileUpdateTime"] !== null ? datetime.of(<string>data["fileUpdateTime"]) : null,
        illust: data["illust"] && {
            ...data["illust"],
            orderTime: datetime.of(<string>data["illust"]["orderTime"]),
            partitionTime: date.of(<string>data["illust"]["partitionTime"])
        }
    }
}

/**
 * 导入记录。
 */
export interface ImportEndpoint {
    /**
     * 查询所有导入列表中的项目。
     */
    list(filter: ImportFilter): Promise<Response<ListResult<ImportRecord>>>
    /**
     * 从本地文件系统导入新项目。
     * @exception FILE_NOT_FOUND 指定的文件无法找到。
     * @exception ILLEGAL_FILE_EXTENSION 不受支持的文件扩展名。
     * @exception STORAGE_NOT_ACCESSIBLE 存储目录无法访问。
     * @exception:warning INVALID_REGEX (regex) 解析错误，解析规则的正则表达式有误。
     */
    import(form: ImportForm): Promise<Response<IdResponse, FileNotFoundError | IllegalFileExtensionError | StorageNotAccessibleError>>
    /**
     * 通过file upload远程上传新项目。
     * @exception ILLEGAL_FILE_EXTENSION 不受支持的文件扩展名。
     * @exception STORAGE_NOT_ACCESSIBLE 存储目录无法访问。
     * @exception:warning INVALID_REGEX (regex) 解析错误，解析规则的正则表达式有误。
     */
    upload(file: File): Promise<Response<IdResponse, IllegalFileExtensionError | StorageNotAccessibleError>>
    /**
     * 查看导入记录。
     * @exception NOT_FOUND
     * @exception PARAM_NOT_REQUIRED ("sourceId/sourcePart") source未填写时，不能填写更详细的id/part信息
     */
    get(id: number): Promise<Response<DetailImportRecord, NotFound>>
    /**
     * 批量操作导入记录。
     * @exception:warning INVALID_REGEX (regex) 解析错误，解析规则的正则表达式有误。
     */
    batch(form: ImportBatchForm): Promise<Response<null, ResourceNotExist<"target", number[]>>>
    /**
     * 目录监听器。
     */
    watcher: {
        /**
         * 查看监听器状态。
         */
        get(): Promise<Response<ImportWatcherResponse>>
        /**
         * 修改监听器状态。
         */
        update(form: ImportWatcherForm): Promise<Response<null>>
    }
}

export type ImportStatus = "PROCESSING" | "COMPLETED" | "ERROR"

export type PathWatcherErrorReason = "NO_USEFUL_PATH" | "PATH_NOT_EXIST" | "PATH_IS_NOT_DIRECTORY" | "PATH_WATCH_FAILED" | "PATH_NO_LONGER_AVAILABLE"

export interface ImportStatusInfo {
    thumbnailError: boolean | null
    fingerprintError: boolean | null
    sourceAnalyseError: boolean | null
    sourceAnalyseNone: boolean | null
    messages: string[] | null
}

export interface SourcePreference {
    title: string | null
    description: string | null
    additionalInfo: {[field: string]: string} | null
    tags: {code: string, type: string, name: string | null, otherName: string | null}[] | null
    books: {code: string, title: string | null, otherTitle: string | null}[] | null
    relations: string[] | null
}

export interface Preference {
    cloneImage: PreferenceCloneImage | null
}

export interface PreferenceCloneImage {
    fromImageId: number
    props: ImagePropsCloneForm["props"]
    merge: boolean
    deleteFrom: boolean
}

export interface PathWatcherError {
    path: string
    reason: PathWatcherErrorReason
}

export interface ImportRecord {
    id: number
    status: ImportStatus
    filePath: NullableFilePath | null
    fileName: string | null
    importTime: LocalDateTime
    illust: {
        id: number
        score: number | null
        favorite: boolean
        tagme: Tagme[]
        source: SourceDataPath | null
        partitionTime: LocalDate
        orderTime: LocalDateTime
    } | null
}

export interface DetailImportRecord extends ImportRecord {
    statusInfo: ImportStatusInfo | null
    fileCreateTime: LocalDateTime | null
    fileUpdateTime: LocalDateTime | null
    illust: ImportRecord["illust"] & {
        extension: string
        size: number
        resolutionWidth: number
        resolutionHeight: number
        videoDuration: number
        topics: RelatedSimpleTopic[]
        authors: RelatedSimpleAuthor[]
        tags: RelatedSimpleTag[]
        description: string
    } | null
}

export interface ImportWatcherResponse {
    isOpen: boolean
    statisticCount: number
    errors: PathWatcherError[]
}

export interface ImportWatcherForm {
    isOpen: boolean
}

export interface ImportForm {
    filepath: string
    removeOriginFile?: boolean
}

export interface ImportBatchForm {
    target?: number[]
    analyseSource?: boolean
    analyseTime?: boolean
    analyseTimeBy?: OrderTimeType
    retry?: boolean
    retryAndAllowNoSource?: boolean
    retryWithManualSource?: SourceDataPath
    clearCompleted?: boolean
    delete?: boolean
    deleteDeleted?: boolean
}

export type ImportFilter = ImportQueryFilter & LimitAndOffsetFilter

export interface ImportQueryFilter {
    search?: string
    order?: OrderList<"id" | "status" | "fileCreateTime" | "fileUpdateTime" | "importTime">
    status?: ImportStatus
    deleted?: boolean
}
