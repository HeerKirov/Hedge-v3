import { sendMessage } from "@/functions/messages"
import { settings } from "@/functions/setting"
import { getEnvironmentType } from "@/utils/document"
import { files } from "@/utils/primitives"
import { AllException, BasicException } from "./exceptions"

export type Response<T, E extends BasicException = never> = ResponseOk<T> | ResponseError<E> | ResponseConnectionError

export interface ResponseOk<T> {
    ok: true
    status: number
    data: T
}

export interface ResponseError<E extends BasicException = never> {
    ok: false
    exception: E
}

export interface ResponseConnectionError {
    ok: false
    exception: undefined
    reason: any
}

interface RequestConfig<R> {
    url: string
    method?: Method
    query?: {[name: string]: any}
    data?: any
    parseResponse?(data: any): R
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

type URLParser<P> = (path: P) => string
interface QueryParser<Q> { parseQuery?(query: Q): any }
interface DataParser<T> { parseData?(data: T): any }
interface ResponseParser<R> { parseResponse?(data: any): R }

export function createRequest<R, E extends BasicException>(url: string, method?: Method, parser?: ResponseParser<R>) {
    if(getEnvironmentType() !== "SERVICE_WORKER") {
        return () => sendRequestByMessage<R, E>({url, method, parseResponse: parser?.parseResponse})
    }else{
        return () => request<R, E>({url, method, parseResponse: parser?.parseResponse})
    }
}

export function createQueryRequest<Q, R, E extends BasicException>(url: string, method?: Method, parser?: QueryParser<Q> & ResponseParser<R>) {
    if(getEnvironmentType() !== "SERVICE_WORKER") {
        return (query: Q) => sendRequestByMessage<R, E>({url, method, query: parser?.parseQuery ? parser.parseQuery(query) : query, parseResponse: parser?.parseResponse})
    }else{
        return (query: Q) => request<R, E>({url, method, query: parser?.parseQuery ? parser.parseQuery(query) : query, parseResponse: parser?.parseResponse})
    }
}

export function createDataRequest<D, R, E extends BasicException>(url: string, method?: Method, parser?: DataParser<D> & ResponseParser<R>) {
    if(getEnvironmentType() !== "SERVICE_WORKER") {
        return (data: D) => sendRequestByMessage<R, E>({url, method, data: parser?.parseData ? parser.parseData(data) : data, parseResponse: parser?.parseResponse})
    }else{
        return (data: D) => request<R, E>({url, method, data: parser?.parseData ? parser.parseData(data) : data, parseResponse: parser?.parseResponse})
    }
}

export function createPathRequest<P, R, E extends BasicException>(url: URLParser<P>, method?: Method, parser?: ResponseParser<R>) {
    if(getEnvironmentType() !== "SERVICE_WORKER") {
        return (path: P) => sendRequestByMessage<R, E>({url: url(path), method, parseResponse: parser?.parseResponse})
    }else{
        return (path: P) => request<R, E>({url: url(path), method, parseResponse: parser?.parseResponse})
    }
}

export function createPathDataRequest<P, D, R, E extends BasicException>(url: URLParser<P>, method?: Method, parser?: DataParser<D> & ResponseParser<R>) {
    if(getEnvironmentType() !== "SERVICE_WORKER") {
        return (path: P, data: D) => sendRequestByMessage<R, E>({url: url(path), method, data: parser?.parseData ? parser.parseData(data) : data, parseResponse: parser?.parseResponse})
    }else{
        return (path: P, data: D) => request<R, E>({url: url(path), method, data: parser?.parseData ? parser.parseData(data) : data, parseResponse: parser?.parseResponse})
    }
}

async function sendRequestByMessage<R, E extends BasicException>(requestConfig: RequestConfig<R>): Promise<Response<R, E>> {
    let data: any
    if(requestConfig.data instanceof FormData) {
        data = {"__form_data__": true}
        for(const [key, value] of requestConfig.data.entries()) {
            if(value instanceof File) {
                data[key] = await files.blobToDataURL(value)
                data[`__form_data__${key}_filename`] = value.name
            }else{
                data[key] = value
            }
        }
    }else{
        data = requestConfig.data
    }
    return await sendMessage("FETCH_REQUEST", {url: requestConfig.url, method: requestConfig.method, query: requestConfig.query, data}) as Response<R, E>
}

export async function fetchRequestByMessage(requestConfig: Omit<RequestConfig<unknown>, "parseResponse">): Promise<Response<unknown, BasicException>> {
    let data: any
    if(requestConfig.data instanceof Object && requestConfig.data["__form_data__"]) {
        data = new FormData()
        for(const [key, value] of Object.entries(requestConfig.data)) {
            if(!key.startsWith("__form_data__")) {
                if(requestConfig.data[`__form_data__${key}_filename`]) {
                    const f = files.dataURLtoFile(value as string, requestConfig.data[`__form_data__${key}_filename`])
                    data.append(key, f)
                }else{
                    data.append(key, value)
                }
            }
        }
    }else{
        data = requestConfig.data
    }
    return request({...requestConfig, data})
}

function request<R, E extends BasicException>(requestConfig: RequestConfig<R>): Promise<Response<R, E>> {    
    return new Promise(async resolve => {
        const setting = await settings.get()
        const url = new URL(requestConfig.url, `http://${setting.general.host}`)
        if(requestConfig.query) {
            url.search = new URLSearchParams(requestConfig.query).toString()
        }

        fetch(url, {
            method: requestConfig.method,
            headers: (requestConfig.data instanceof FormData) ? {
                "Authorization": `Bearer ${setting.general.token}`,
            } : {
                "Authorization": `Bearer ${setting.general.token}`,
                "Content-Type": "application/json"
            },
            body: (requestConfig.data instanceof FormData) ? requestConfig.data : JSON.stringify(requestConfig.data),
        }).then(async res => {
            if(res.headers.get("content-type") === "application/json") {
                if(res.ok) {
                    resolve({
                        ok: true,
                        status: res.status,
                        data: requestConfig.parseResponse?.(await res.json()) ?? await res.json()
                    })
                }else{
                    let error: ResponseError<AllException>
                    const response = await res.json()
                    if(typeof response === "object") {
                        const data = <{code: string, message: string, info: unknown}>response
                        error = {
                            ok: false,
                            exception: <AllException>{
                                status: res.status,
                                code: data.code,
                                message: data.message,
                                info: data.info,
                            }
                        }
                    }else{
                        error = {
                            ok: false,
                            exception: {
                                status: res.status,
                                code: "UNKNOWN_ERROR",
                                message: `${response}`,
                                info: null
                            }
                        }
                    }
                    resolve(error as ResponseError<E>)
                }
            }else{
                if(res.ok) {
                    const blob = await res.blob()
                    const data = await files.blobToDataURL(blob)
                    resolve({ok: true, status: 200, data: data as R})
                }else{
                    resolve({
                        ok: false,
                        exception: {
                            status: res.status,
                            code: "UNKNOWN_ERROR",
                            message: `${await res.text()}`,
                            info: null
                        }
                    } as ResponseError<E>)
                }
            }
        })
        .catch((reason) => resolve({
            ok: false,
            exception: undefined,
            reason
        }))
    })
}
