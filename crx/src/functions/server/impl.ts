import { settings } from "../setting"
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
    baseUrl?: string
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
    return () => request<R, E>({url, method, parseResponse: parser?.parseResponse})
}

export function createQueryRequest<Q, R, E extends BasicException>(url: string, method?: Method, parser?: QueryParser<Q> & ResponseParser<R>) {
    return (query: Q) => request<R, E>({url, method, query: parser?.parseQuery ? parser.parseQuery(query) : query, parseResponse: parser?.parseResponse})
}

export function createDataRequest<D, R, E extends BasicException>(url: string, method?: Method, parser?: DataParser<D> & ResponseParser<R>) {
    return (data: D) => request<R, E>({url, method, data: parser?.parseData ? parser.parseData(data) : data, parseResponse: parser?.parseResponse})
}

export function createPathRequest<P, R, E extends BasicException>(url: URLParser<P>, method?: Method, parser?: ResponseParser<R>) {
    return (path: P) => request<R, E>({url: url(path), method, parseResponse: parser?.parseResponse})
}

export function createPathDataRequest<P, D, R, E extends BasicException>(url: URLParser<P>, method?: Method, parser?: DataParser<D> & ResponseParser<R>) {
    return (path: P, data: D) => request<R, E>({url: url(path), method, data: parser?.parseData ? parser.parseData(data) : data, parseResponse: parser?.parseResponse})
}

function request<R, E extends BasicException>(requestConfig: RequestConfig<R>): Promise<Response<R, E>> {    
    return new Promise(async resolve => {
        const setting = await settings.get()
        const url = new URL(requestConfig.url, `http://${setting.server.host}`)
        if(requestConfig.query) {
            url.search = new URLSearchParams(requestConfig.query).toString()
        }

        fetch(url, {
            method: requestConfig.method,
            headers: (requestConfig.data instanceof FormData) ? {
                "Authorization": `Bearer ${setting.server.token}`,
            } : {
                "Authorization": `Bearer ${setting.server.token}`,
                "Content-Type": "application/json"
            },
            body: (requestConfig.data instanceof FormData) ? requestConfig.data : JSON.stringify(requestConfig.data),
        }).then(async res => {
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
        })
        .catch((reason) => resolve({
            ok: false,
            exception: undefined,
            reason
        }))
    })
}
