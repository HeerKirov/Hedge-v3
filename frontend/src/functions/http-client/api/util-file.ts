import { HttpInstance, Response } from ".."

export function createUtilFileEndpoint(http: HttpInstance): UtilFileEndpoint {
    return {
        fileInfo: http.createPathRequest(id => `/api/utils/file/${id}`, "GET"),
        convertFormat: http.createDataRequest("/api/utils/file/convert-format", "POST"),
    }
}

/**
 * 工具API：文件管理相关。
 */
export interface UtilFileEndpoint {
    fileInfo(fileId: number): Promise<Response<FileInfo>>
    convertFormat(form: {illustId: number}): Promise<Response<null>>
}

export interface FileInfo {
    id: number
    fileName: string
}