import { HttpInstance, Response } from ".."

export function createAppEndpoint(http: HttpInstance): AppEndpoint {
    return {
        storageStatus: http.createRequest("/app/storage"),
        log: {
            list: http.createRequest("/app/logs"),
            get: http.createPathQueryRequest(f => `/app/logs/${encodeURIComponent(f)}`, "GET", {
                parseResponse(text: string, response) {
                    const newOffset = response.headers["x-new-offset"] as number | undefined
                    return {text, newOffset}
                }
            }),
        }
    }
}

export interface AppEndpoint {
    /**
     * 获得存储的运行时状况信息。
     */
    storageStatus(): Promise<Response<StorageStatus>>
    /**
     * 日志相关接口。
     */
    log: {
        /**
         * 获得所有日志文件的名称列表。
         */
        list(): Promise<Response<string[]>>
        get(file: string, filter: {offset?: number}): Promise<Response<{text: string, newOffset: number | undefined}>>
    }
}

export interface StorageStatus {
    /**
     * 存储是否是可访问的。
     */
    storageAccessible: boolean
    /**
     * 存储实际存储路径。
     */
    storageDir: string
    /**
     * 存储占用空间大小。
     */
    storageSize: number
}
