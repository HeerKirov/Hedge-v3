import { datetime, LocalDateTime } from "@/utils/datetime"
import { HttpInstance, Response } from ".."
import { LimitAndOffsetFilter, ListResult, mapFromOrderList, OrderList } from "./all"

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
    return {
        ...filter,
        order: mapFromOrderList(filter.order),
    }
}

function mapToBlockStorageSummary(data: any): BlockStorageSummary {
    return {
        name: <string>data["name"],
        fileCount: <number>data["fileCount"],
        totalSize: <number>data["totalSize"],
        hasZipFile: <boolean>data["hasZipFile"],
        hasDirectory: <boolean>data["hasDirectory"],
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
    order?: OrderList<"id" | "fileName" | "size">
}

export interface BlockStorageSummary {
    name: string
    fileCount: number
    totalSize: number
    hasZipFile: boolean
    hasDirectory: boolean
}

export interface BlockFileItem {
    id: number
    fileName: string
    createTime: LocalDateTime
    size: number
    resolutionWidth: number
    resolutionHeight: number
    extension: string
    inBlockDirectory: boolean
}
