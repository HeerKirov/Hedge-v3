import { HttpInstance, Response } from ".."

export function createAppEndpoint(http: HttpInstance): AppEndpoint {
    return {
        storageStatus: http.createRequest("/app/storage")
    }
}

export interface AppEndpoint {
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
     * 存储占用空间大小。
     */
    storageSize: number
}
