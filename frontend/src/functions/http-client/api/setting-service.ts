import { HttpInstance, Response } from "../instance"

export function createSettingServiceEndpoint(http: HttpInstance): SettingServiceEndpoint {
    return {
        get: http.createRequest("/api/setting/service"),
        update: http.createDataRequest("/api/setting/service", "PATCH")
    }
}

/**
 * 设置：后台服务本身相关的选项。
 * @permission only client
 */
export interface SettingServiceEndpoint {
    /**
     * 查看。
     */
    get(): Promise<Response<ServiceOption>>
    /**
     * 更改。
     */
    update(form: ServiceOption): Promise<Response<unknown>>
}

export interface ServiceOption {
    /**
     * 后台服务建议使用的端口。
     * null表示没有建议，由它自己选择端口。
     * 使用整数+逗号(,)+横线(-)表示建议的范围。
     * 这个参数没有强制检查，如果写错，则在检测时不生效。
     */
    port: string | null
    /**
     * 文件存储使用的存储路径。
     * null表示使用基于userData的默认存储路径，并自行管理；其他值表示使用自定义路径，并需要自行确保路径可用。
     */
    storagePath: string | null
}
