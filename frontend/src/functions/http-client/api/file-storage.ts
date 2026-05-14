import { datetime, LocalDateTime } from "@/utils/datetime"
import { HttpInstance, Response } from ".."
import { LimitAndOffsetFilter, ListResult, mapFromOrderList, NullableFilePath, OrderList } from "./all"

export function createFileStorageEndpoint(http: HttpInstance): FileStorageEndpoint {
    return {
        listBlocks: http.createQueryRequest("/api/file/blocks", "GET", {
            parseQuery: mapFromBlockStorageListFilter,
            parseResponse: (data: any[]) => data.map(mapToBlockStorageSummary),
        }),
        listBlockFiles: http.createPathQueryRequest((block: string) => `/api/file/blocks/${encodeURIComponent(block)}/files`, "GET", {
            parseQuery: mapFromBlockFileListFilter,
            parseResponse: ({ total, result }: ListResult<any>) => ({total, result: result.map(mapToBlockFileItem)}),
        }),
    }
}

function mapFromBlockStorageListFilter(filter: BlockStorageListFilter): Record<string, unknown> {
    return {
        order: mapFromOrderList(filter.order),
    }
}

function mapFromBlockFileListFilter(filter: BlockFileListFilter): Record<string, unknown> {
    const ext = typeof filter.extension === "string" && filter.extension.length > 0 ? filter.extension : undefined
    return {
        limit: filter.limit,
        offset: filter.offset,
        order: mapFromOrderList(filter.order),
        ...(ext ? { extension: ext } : {}),
    }
}

function mapToBlockStorageSummary(data: any): BlockStorageSummary {
    return {
        name: <string>data["name"],
        fileCount: <number>data["fileCount"],
        totalSize: <number>data["totalSize"],
        hasZipFile: <boolean>data["hasZipFile"],
        hasDirectory: <boolean>data["hasDirectory"],
        lastModified: datetime.of(<string>data["lastModified"]),
    }
}

function mapToBlockFileItem(data: any): BlockFileItem {
    return {
        id: <number>data["id"],
        fileName: <string>data["fileName"],
        createTime: datetime.of(<string>data["createTime"]),
        size: <number>data["size"],
        resolutionWidth: <number>data["resolutionWidth"],
        resolutionHeight: <number>data["resolutionHeight"],
        extension: <string>data["extension"],
        filepath: data["filepath"],
        hasThumbnail: <boolean>data["hasThumbnail"],
        hasSample: <boolean>data["hasSample"],
        inBlockDirectory: <boolean>data["inBlockDirectory"],
    }
}

/**
 * 存储 block 清单与 block 内文件清单 API。
 */
export interface FileStorageEndpoint {
    /**
     * 查询 original 下各 block 的汇总信息。
     */
    listBlocks(filter: BlockStorageListFilter): Promise<Response<BlockStorageSummary[]>>
    /**
     * 查询指定 block 内的文件记录。
     */
    listBlockFiles(block: string, filter: BlockFileListFilter): Promise<Response<ListResult<BlockFileItem>>>
}

export interface BlockStorageListFilter {
    order?: OrderList<"name" | "fileCount" | "totalSize">
}

export interface BlockFileListFilter extends LimitAndOffsetFilter {
    order?: OrderList<"id" | "fileName" | "size" | "extension">
    /**
     * 单选扩展名；null 表示不按类型过滤。请求时仅在为具体扩展名字符串时携带 `extension` 查询参数。
     */
    extension?: string | null
}

export interface BlockStorageSummary {
    name: string
    fileCount: number
    totalSize: number
    hasZipFile: boolean
    hasDirectory: boolean
    lastModified: LocalDateTime
}

export interface BlockFileItem {
    id: number
    fileName: string
    createTime: LocalDateTime
    size: number
    resolutionWidth: number
    resolutionHeight: number
    extension: string
    filepath: NullableFilePath
    hasThumbnail: boolean
    hasSample: boolean
    inBlockDirectory: boolean
}
