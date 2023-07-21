import { date, datetime, LocalDate, LocalDateTime } from "@/utils/datetime"
import {
    FileNotFoundError, FileNotReadyError, IllegalFileExtensionError,
    NotFound, ResourceNotExist, ParamError, ParamNotRequired, ParamRequired, StorageNotAccessibleError
} from "../exceptions"
import { HttpInstance, Response } from "../instance"
import { IdResponseWithWarnings, LimitAndOffsetFilter, ListResult, mapFromOrderList, OrderList } from "./all"
import { ImagePropsCloneForm, SimpleCollection, Tagme } from "./illust"
import { SimpleFolder } from "./folder"
import { SimpleBook } from "./book"
import { OrderTimeType } from "./setting"

export function createImportEndpoint(http: HttpInstance): ImportEndpoint {
    return {
        list: http.createQueryRequest("/api/imports", "GET", { 
            parseQuery: mapFromImportFilter, 
            parseResponse: ({ total, result }: ListResult<any>) => ({total, result: result.map(mapToImportImage)}) 
        }),
        get: http.createPathRequest(id => `/api/imports/${id}`, "GET", { parseResponse: mapToDetailImportImage }),
        update: http.createPathDataRequest(id => `/api/imports/${id}`, "PATCH", { parseData: mapFromImportUpdateForm }),
        delete: http.createPathRequest(id => `/api/imports/${id}`, "DELETE"),
        import: http.createDataRequest("/api/imports/import", "POST"),
        upload: http.createDataRequest("/api/imports/upload", "POST", { parseData: mapFromUploadFile }),
        batchUpdate: http.createDataRequest("/api/imports/batch-update", "POST", { parseData: mapFromBatchUpdateForm }),
        save: http.createDataRequest("/api/imports/save", "POST"),
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

function mapFromImportUpdateForm(form: ImportUpdateForm): any {
    return {
        ...form,
        partitionTime: form.partitionTime && date.toISOString(form.partitionTime),
        orderTime: form.orderTime && datetime.toISOString(form.orderTime),
        createTime: form.createTime && datetime.toISOString(form.createTime)
    }
}

function mapFromBatchUpdateForm(form: ImportBatchUpdateForm): any {
    return {
        ...form,
        partitionTime: form.partitionTime && date.toISOString(form.partitionTime)
    }
}

function mapToImportImage(data: any): ImportImage {
    return {
        ...data,
        partitionTime: date.of(<string>data["partitionTime"]),
        orderTime: datetime.of(<string>data["orderTime"]),
    }
}

function mapToDetailImportImage(data: any): DetailImportImage {
    return {
        ...data,
        fileCreateTime: data["fileCreateTime"] != null ? datetime.of(<string>data["fileCreateTime"]) : null,
        fileUpdateTime: data["fileUpdateTime"] != null ? datetime.of(<string>data["fileUpdateTime"]) : null,
        fileImportTime: data["fileImportTime"] != null ? datetime.of(<string>data["fileImportTime"]) : null,
        partitionTime: date.of(<string>data["partitionTime"]),
        orderTime: datetime.of(<string>data["orderTime"]),
        createTime: datetime.of(<string>data["createTime"])
    }
}

/**
 * 导入项目。
 */
export interface ImportEndpoint {
    /**
     * 查询所有导入列表中的项目。
     */
    list(filter: ImportFilter): Promise<Response<ListResult<ImportImage>>>
    /**
     * 从本地文件系统导入新项目。
     * @exception FILE_NOT_FOUND 指定的文件无法找到。
     * @exception ILLEGAL_FILE_EXTENSION 不受支持的文件扩展名。
     * @exception STORAGE_NOT_ACCESSIBLE 存储目录无法访问。
     * @exception:warning INVALID_REGEX (regex) 解析错误，解析规则的正则表达式有误。
     */
    import(form: ImportForm): Promise<Response<IdResponseWithWarnings, FileNotFoundError | IllegalFileExtensionError | StorageNotAccessibleError>>
    /**
     * 通过file upload远程上传新项目。
     * @exception ILLEGAL_FILE_EXTENSION 不受支持的文件扩展名。
     * @exception STORAGE_NOT_ACCESSIBLE 存储目录无法访问。
     * @exception:warning INVALID_REGEX (regex) 解析错误，解析规则的正则表达式有误。
     */
    upload(file: File): Promise<Response<IdResponseWithWarnings, IllegalFileExtensionError | StorageNotAccessibleError>>
    /**
     * 查看导入项目。
     * @exception NOT_FOUND
     * @exception PARAM_NOT_REQUIRED ("sourceId/sourcePart") source未填写时，不能填写更详细的id/part信息
     */
    get(id: number): Promise<Response<DetailImportImage, NotFound>>
    /**
     * 更改导入项目的元数据。
     * @exception NOT_EXIST ("site", source) 此source不存在
     * @exception PARAM_ERROR ("sourceId"/"sourcePart") 参数值错误，需要为自然数
     * @exception PARAM_REQUIRED ("sourceId"/"sourcePart") 需要这些参数
     * @exception PARAM_NOT_REQUIRED ("sourcePart"/"sourceId/sourcePart") 不需要这些参数
     * @exception NOT_FOUND
     */
    update(id: number, form: ImportUpdateForm): Promise<Response<null, NotFound | ResourceNotExist<"site", string> | ParamError | ParamRequired | ParamNotRequired>>
    /**
     * 删除导入项目。
     * @exception NOT_FOUND
     */
    delete(id: number): Promise<Response<null, NotFound>>
    /**
     * 批量更新导入项目的元数据。
     * @exception:warning INVALID_REGEX (regex) 解析错误，解析规则的正则表达式有误。
     */
    batchUpdate(form: ImportBatchUpdateForm): Promise<Response<IdResponseWithWarnings[], ResourceNotExist<"target", number[]>>>
    /**
     * 确认导入，将所有项目导入到图库。
     * @exception FILE_NOT_READY
     */
    save(form: ImportSaveForm): Promise<Response<ImportSaveResponse, FileNotReadyError>>
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

export type PathWatcherErrorReason = "NO_USEFUL_PATH" | "PATH_NOT_EXIST" | "PATH_IS_NOT_DIRECTORY" | "PATH_WATCH_FAILED" | "PATH_NO_LONGER_AVAILABLE"

export interface SaveError {
    importId: number
    fileNotReady: boolean
    notExistedCollectionId: number | null
    notExistedCloneImageId: number | null
    notExistedBookIds: number[] | null
    notExistedFolderIds: number[] | null
}

export interface SourcePreference {
    title: string | null
    description: string | null
    additionalInfo: {[field: string]: string} | null
    tags: {code: string, name: string | null, otherName: string | null, type: string | null}[] | null
    books: {code: string, title: string | null, otherTitle: string | null}[] | null
    relations: number[] | null
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

export interface ImportImage {
    id: number
    file: string
    thumbnailFile: string | null
    fileName: string | null
    sourceSite: string | null
    sourceId: number | null
    sourcePart: number | null
    tagme: Tagme[]
    partitionTime: LocalDate
    orderTime: LocalDateTime
}

export interface DetailImportImage extends ImportImage {
    extension: string
    size: number
    resolutionWidth: number
    resolutionHeight: number
    filePath: string | null
    fileFromSource: string | null
    fileCreateTime: LocalDateTime | null
    fileUpdateTime: LocalDateTime | null
    fileImportTime: LocalDateTime | null
    createTime: LocalDateTime
    sourcePreference: SourcePreference | null
    preference: Preference | null
    collectionId: string | number | null
    collection: SimpleCollection | null
    folders: SimpleFolder[]
    books: SimpleBook[]
}

export interface ImportSaveResponse {
    total: number
    errors: SaveError[]
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

export interface ImportUpdateForm {
    tagme?: Tagme[]
    sourceSite?: string | null
    sourceId?: number | null
    sourcePart?: number | null
    partitionTime?: LocalDate
    orderTime?: LocalDateTime
    createTime?: LocalDateTime
    preference?: Preference
    sourcePreference?: SourcePreference | null
    collectionId?: string | number | null
    folderIds?: number[]
    bookIds?: number[]
    appendFolderIds?: number[]
    appendBookIds?: number[]
}

export interface ImportBatchUpdateForm {
    target?: number[]
    tagme?: Tagme[]
    setCreateTimeBy?: OrderTimeType
    setOrderTimeBy?: OrderTimeType
    partitionTime?: LocalDate
    analyseSource?: boolean
    collectionId?: string | number
    appendFolderIds?: number[]
    appendBookIds?: number[]
}

export interface ImportSaveForm {
    target?: number[]
}

export type ImportFilter = ImportQueryFilter & LimitAndOffsetFilter

export interface ImportQueryFilter {
    search?: string
    order?: OrderList<"id" | "fileCreateTime" | "fileUpdateTime" | "fileImportTime" | "orderTime">
}
