import { remoteIpcClient } from "@/functions/ipc-client"
import { createHttpClient, HttpClientConfig, ResponseConnectionError, ResponseError } from "@/functions/http-client"
import { AllException } from "@/functions/http-client/exceptions"
import { installation } from "@/utils/reactivity"
import emptyFile from "@/assets/empty-file.jpg"

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
            }else if(exception.code === "ONLY_FOR_LOCAL") {
                throwError("Forbidden", "远程模式不可调用的接口")
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
    const assetsUrl = (filepath: string | null | undefined) => {
        if(filepath) {
            return `archive://${filepath}`
        }else{
            return emptyFile
        }
    }

    const assetsLocal = async (filepath: string | null | undefined) => {
        if(filepath) {
            try {
                const r = await remoteIpcClient.local.loadFile(filepath)
                if(r.ok) {
                    return r.data.substring("file://".length)
                }else{
                    console.error(`assetsLocal failed for file '${filepath}'.`, r.message)
                    return ""
                }
            }catch(e){
                console.error(`assetsLocal failed for file '${filepath}'.`, e)
                return ""
            }
        }else{
            return ""
        }
    }

    return {assetsUrl, assetsLocal}
}
