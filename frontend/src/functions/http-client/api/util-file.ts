import { HttpInstance, Response } from ".."

export function createUtilFileEndpoint(http: HttpInstance): UtilFileEndpoint {
    return {
        convertFormat: http.createPathRequest(id => `/api/utils/file/${id}/convert-format`, "POST"),
    }
}

/**
 * 工具API：文件管理相关。
 */
export interface UtilFileEndpoint {
    convertFormat(illustId: number): Promise<Response<null>>
}


