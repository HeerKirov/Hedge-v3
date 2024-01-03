import axios, { AxiosRequestConfig } from "axios"
import Ws from "ws"

export { Ws }

/**
 * 发送一个http请求。包装过axios方法，处理其异常。
 */
export function request<T>(config: AxiosRequestConfig): Promise<Response<T>> {
    return new Promise(resolve => {
        axios.request(config)
            .then(res => {
                resolve({
                    ok: true,
                    status: res.status,
                    data: res.data
                })
            }).catch(reason => {
            if(reason.response) {
                const data = reason.response.data as {code: string, message: string | null, info: any}
                resolve({
                    ok: false,
                    status: reason.response.status,
                    code: data.code,
                    message: data.message
                })
            }else{
                resolve({
                    ok: false,
                    status: undefined,
                    message: reason.message
                })
            }
        })
    })
}

export type Response<T> = ResponseOk<T> | ResponseError | ResponseConnectionError

interface ResponseOk<T> {
    ok: true
    status: number
    data: T
}

interface ResponseError {
    ok: false
    status: number
    code: string
    message: string | null
}

interface ResponseConnectionError {
    ok: false
    status: undefined
    message: string
}
