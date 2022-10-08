import axios, { AxiosError, AxiosRequestHeaders, Method } from "axios"
import { BasicException, AllException } from "./exceptions"

export interface HttpInstance {
    /**
     * 发送一个请求到server。
     */
    request<R, E extends BasicException>(config: RequestConfig<R>): Promise<Response<R, E>>
    /**
     * 创建带有path和query参数的柯里化请求。
     */
    createPathQueryRequest<P, Q, R, E extends BasicException>(url: URLParser<P>, method?: Method, parser?: QueryParser<Q> | ResponseParser<R>): (path: P, query: Q) => Promise<Response<R, E>>
    /**
     * 创建带有path和data参数的柯里化请求。
     */
    createPathDataRequest<P, T, R, E extends BasicException>(url: URLParser<P>, method?: Method, parser?: DataParser<T> | ResponseParser<R>): (path: P, data: T) => Promise<Response<R, E>>
    /**
     * 创建带有path参数的柯里化请求。
     */
    createPathRequest<P, R, E extends BasicException>(url: URLParser<P>, method?: Method, parser?: ResponseParser<R>): (path: P) => Promise<Response<R, E>>
    /**
     * 创建带有query参数的柯里化请求。
     */
    createQueryRequest<Q, R, E extends BasicException>(url: string, method?: Method, parser?: QueryParser<Q> | ResponseParser<R>): (query: Q) => Promise<Response<R, E>>
    /**
     * 创建带有data参数的柯里化请求。
     */
    createDataRequest<T, R, E extends BasicException>(url: string, method?: Method, parser?: DataParser<T> | ResponseParser<R>): (data: T) => Promise<Response<R, E>>
    /**
     * 创建不带任何参数的柯里化请求。
     */
    createRequest<R, E extends BasicException>(url: string, method?: Method, parser?: ResponseParser<R>): () => Promise<Response<R, E>>
}

interface RequestConfig<R> {
    baseUrl?: string
    url: string
    method?: Method
    query?: {[name: string]: any}
    data?: any
    parseResponse?(data: any): R
}

type URLParser<P> = (path: P) => string
interface QueryParser<Q> { parseQuery?(query: Q): any }
interface DataParser<T> { parseData?(data: T): any }
interface ResponseParser<R> { parseResponse?(data: any): R }

export interface HttpInstanceConfig {
    /**
     * instance请求的host。
     */
    host?: string
    /**
     * instance请求时的bearer token。自动附加到header。
     */
    token?: string
    /**
     * 拦截请求的错误并进行处理。
     * @return 返回错误，令错误继续返回，或返回undefined，拦截错误并报告一个空返回信息。
     */
    handleError?(e: ResponseError<AllException> | ResponseConnectionError): ResponseError<AllException> | ResponseConnectionError | undefined
}

export function createHttpInstance(config: Readonly<HttpInstanceConfig>): HttpInstance {
    const instance = axios.create()

    let _baseUrl: string | undefined = undefined
    let _headers: AxiosRequestHeaders | undefined = undefined
    let _token: string | undefined = undefined
    let _host: string | undefined = undefined

    function getBaseUrl() {
        if(_host === undefined || config.host !== _host) {
            _baseUrl = config.host !== undefined ? `http://${config.host}` : undefined
            _host = config.host
        }
        return _baseUrl
    }

    function getHeaders() {
        if(config.token !== _token || _token === undefined) {
            _headers = config.token !== undefined ? {"Authorization": `Bearer ${config.token}`} : undefined
            _token = config.token
        }
        return _headers
    }

    function request<R, E extends BasicException>(requestConfig: RequestConfig<R>): Promise<Response<R, E>> {
        return new Promise((resolve, reject) => {
            instance.request({
                baseURL: getBaseUrl(),
                url: requestConfig.url,
                method: requestConfig.method,
                params: requestConfig.query,
                data: requestConfig.data,
                headers: getHeaders()
            })
                .then(res => resolve({
                    ok: true,
                    status: res.status,
                    data: requestConfig.parseResponse?.(res.data) ?? res.data
                }))
                .catch((reason: AxiosError) => {
                    let error: ResponseError<AllException> | ResponseConnectionError
                    if(reason.response) {
                        if(typeof reason.response.data === "object") {
                            const data = <{code: string, message: string, info: unknown}>reason.response.data
                            error = {
                                ok: false,
                                exception: <AllException>{
                                    status: reason.response.status,
                                    code: data.code,
                                    message: data.message,
                                    info: data.info,
                                }
                            }
                        }else{
                            error = {
                                ok: false,
                                exception: {
                                    status: reason.response.status,
                                    code: "UNKNOWN_ERROR",
                                    message: `${reason.response.data}`,
                                    info: null
                                }
                            }
                        }
                    }else{
                        error = {
                            ok: false,
                            exception: undefined,
                            message: reason.message
                        }
                    }

                    const ret = config.handleError ? config.handleError(error) : error
                    if(ret && !ret.exception) {
                        console.error(`Http response error: ${ret.message}`)
                        reject(ret.message)
                    }else if(ret) {
                        resolve(ret as ResponseError<E>)
                    }
                })
        })
    }

    return {
        request,
        createPathQueryRequest: <P, Q, R, E extends BasicException>(url: URLParser<P>, method?: Method, parser?: QueryParser<Q> & ResponseParser<R>) => (path: P, query: Q) =>
            request<R, E>({url: url(path), method, query: parser?.parseQuery ? parser.parseQuery(query) : query, parseResponse: parser?.parseResponse}),
        createPathDataRequest: <P, T, R, E extends BasicException>(url: URLParser<P>, method?: Method, parser?: DataParser<T> & ResponseParser<R>) => (path: P, data: T) =>
            request<R, E>({url: url(path), method, data: parser?.parseData ? parser.parseData(data) : data, parseResponse: parser?.parseResponse}),
        createPathRequest: <P, R, E extends BasicException>(url: URLParser<P>, method?: Method, parser?: ResponseParser<R>) => (path: P) =>
            request<R, E>({url: url(path), method, parseResponse: parser?.parseResponse}),
        createQueryRequest: <Q, R, E extends BasicException>(url: string, method?: Method, parser?: QueryParser<Q> & ResponseParser<R>) => (query: Q) =>
            request<R, E>({url, method, query: parser?.parseQuery ? parser.parseQuery(query) : query, parseResponse: parser?.parseResponse}),
        createDataRequest: <T, R, E extends BasicException>(url: string, method?: Method, parser?: DataParser<T> & ResponseParser<R>) => (data: T) =>
            request<R, E>({url, method, data: parser?.parseData ? parser.parseData(data) : data, parseResponse: parser?.parseResponse}),
        createRequest: <R, E extends BasicException>(url: string, method?: Method, parser?: ResponseParser<R>) => () =>
            request<R, E>({url, method, parseResponse: parser?.parseResponse})
    }
}

/**
 * http请求返回的结果。根据情景不同，会被解析成不同的形态。
 */
export type Response<T, E extends BasicException = never> = ResponseOk<T> | ResponseError<E>

/**
 * 请求成功，获得了结果数据。
 */
export interface ResponseOk<T> {
    ok: true
    status: number
    data: T
}

/**
 * 服务器报告了业务错误。
 */
export interface ResponseError<E extends BasicException = never> {
    ok: false
    exception: E
}

/**
 * 发生了连接错误。一般情况下应该拦截此错误，而不是在返回时处理。
 */
export interface ResponseConnectionError {
    ok: false
    exception: undefined
    message: string
}

/**
 * 将Response做类型映射。只对ResponseOk有映射效果。
 */
export function mapResponse<T, R, E extends BasicException = never>(r: Response<T, E>, mapper: (d: T) => R): Response<R, E> {
    if(r.ok) {
        return {
            ok: true,
            status: r.status,
            data: mapper(r.data)
        }
    }else{
        return r
    }
}

/**
 * 将Response做数组整合。只对ResponseOk有整合效果。其中，not ok的项会被填为undefined。
 * tips: 这是一个工具函数，旨在帮助那些没有批量查询API但是有批量查询需求的请求，临时使用detail API来完成整合。
 * @param r
 */
export function flatResponse<T, E extends BasicException = never>(r: Response<T, E>[]): Response<(T | undefined)[], E> {
    return {
        ok: true,
        status: 200,
        data: r.map(item => {
            return item.ok ? item.data : undefined
        })
    }
}
