import { installation } from "@/utils/reactivity"
import { createHttpClient, HttpClientConfig, ResponseConnectionError, ResponseError } from "@/functions/http-client"
import { AllException } from "@/functions/http-client/exceptions"
import { useFetchReactive } from "../fetch"
import { strings } from "@/utils/primitives"

export const [installHttpClient, useHttpClient] = installation(createHttpClient)

export function createHttpClientConfig(throwError: (title: string, message: string) => void): HttpClientConfig {
    const host: string | undefined = undefined

    const handleError = useErrorHandler(throwError)

    return {
        host,
        token: undefined,
        handleError
    }
}

function useErrorHandler(throwError: (title: string, message: string) => void) {
    function processHttpClientError(e: ResponseError<AllException> | ResponseConnectionError): ResponseError<AllException> | ResponseConnectionError | undefined {
        if(e.exception) {
            const exception = e.exception
            if(exception.code === "NOT_INIT") {
                throwError("Not Initialized", "错误: 服务未被初始化，访问连接无法建立")
            }else if(exception.code === "NO_TOKEN") {
                throwError("Connection Error", "未持有服务访问token，因此连接被拒绝")
            }else if(exception.code === "TOKEN_WRONG") {
                throwError("Connection Error", "持有的token错误，因此连接被拒绝")
            }else if(exception.code === "ONLY_FOR_CLIENT") {
                throwError("Forbidden", "调用了仅提供给client mode的功能接口")
            }else if(exception.code === "REMOTE_DISABLED") {
                throwError("Forbidden", "尝试使用client mode的token执行远程连接，因此连接被拒绝")
            }else if(exception.code === "INTERNAL_ERROR") {
                throwError("Internal Error", exception.message)
            }else{
                return e
            }
            return undefined
        }else{
            throwError("服务连接失败", e.message)
            return undefined
        }
    }

    return processHttpClientError
}

export function useAssets() {
    const httpClient = useHttpClient()

    const assetsLocal = async (filepath: string | null | undefined) => {
        if(filepath) {
            const res = await httpClient.exportUtil.loadLocalFile({filepath})
            if(res.ok) {
                return res.data.localFilePath
            }else{
                return ""
            }
        }else{
            return ""
        }
    }

    return {assetsUrl: httpClient.assets.assetsUrl, assetsLocal}
}
