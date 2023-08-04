import { HttpInstance, Response } from ".."

export function createServiceEndpoint(http: HttpInstance): ServiceEndpoint {
    return {
        storageStatus: http.createRequest("/api/service/storage")
    }
}

export interface ServiceEndpoint {
    /**
     * 获得存储的运行时状况信息。
     */
    storageStatus(): Promise<Response<StorageStatus>>
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
     * 缓存路径。
     */
    cacheDir: string
    /**
     * 缓存占用空间大小。
     */
    cacheSize: number
}
