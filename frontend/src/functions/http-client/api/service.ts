import { HttpInstance, Response } from ".."

export function createServiceEndpoint(http: HttpInstance): ServiceEndpoint {
    return {
        storage: http.createRequest("/api/service/storage")
    }
}

export interface ServiceEndpoint {
    /**
     * 获得service的storage运行时状况信息。
     */
    storage(): Promise<Response<Storage>>
}

interface Storage {
    /**
     * 存储是否是可访问的。
     */
    accessible: boolean
    /**
     * 实时存储路径。
     */
    storageDir: string
}
