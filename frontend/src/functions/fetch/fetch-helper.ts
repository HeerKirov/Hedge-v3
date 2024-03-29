import { BasicException } from "@/functions/http-client/exceptions"
import { HttpClient, Response } from "@/functions/http-client"
import { ErrorHandler, useFetchManager } from "./install"

// == Fetch Helper 请求调用协助工具 ==
// 提供对任意请求的的一套封装，以供在需要的时候即时调用。
// 不提供任何响应式内容，只是个方法调用工具。同时一次只封装一个请求。

export interface FetchHelper<PARAM, MODEL, E extends BasicException> {
    (param: PARAM, handleError?: ErrorHandler<E>): Promise<MODEL | undefined>
}

export interface PostFetchHelper<PARAM, E extends BasicException> {
    (param: PARAM, handleError?: ErrorHandler<E>): Promise<boolean>
}

export interface PathFetchHelper<PATH, PARAM, MODEL, E extends BasicException> {
    (path: PATH, param: PARAM, handleError?: ErrorHandler<E>): Promise<MODEL | undefined>
}

export interface PostPathFetchHelper<PATH, PARAM, E extends BasicException> {
    (path: PATH, param: PARAM, handleError?: ErrorHandler<E>): Promise<boolean>
}

export interface HttpClientHelper {
    <MODEL, E extends BasicException>(choose: (client: HttpClient) => Promise<Response<MODEL, E>>, handleError?: ErrorHandler<E>): Promise<MODEL | undefined>
}

interface FetchHelperOptions<PARAM, MODEL, E extends BasicException> {
    request(httpClient: HttpClient): (param: PARAM) => Promise<Response<MODEL, E>>
    handleErrorInRequest?(e: E): E | void
    afterRequest?(res: MODEL, param: PARAM): void
}

interface PostFetchHelperOptions<PARAM, MODEL, E extends BasicException> {
    request(httpClient: HttpClient): (param: PARAM) => Promise<Response<MODEL, E>>
    handleErrorInRequest?(e: E): E | void
    afterRequest?(res: MODEL, param: PARAM): void
}

interface PathFetchHelperOptions<PATH, PARAM, MODEL, E extends BasicException> {
    request(httpClient: HttpClient): (path: PATH, param: PARAM) => Promise<Response<MODEL, E>>
    handleErrorInRequest?(e: E): E | void
    afterRequest?(res: MODEL, path: PATH, param: PARAM): void
}

interface PostPathFetchHelperOptions<PATH, PARAM, MODEL, E extends BasicException> {
    request(httpClient: HttpClient): (path: PATH, param: PARAM) => Promise<Response<MODEL, E>>
    handleErrorInRequest?(e: E): E | void
    afterRequest?(res: MODEL, path: PATH, param: PARAM): void
}

export function useFetchHelper<PARAM, MODEL, E extends BasicException>(options: FetchHelperOptions<PARAM, MODEL, E> | FetchHelperOptions<PARAM, MODEL, E>["request"]): FetchHelper<PARAM, MODEL, E> {
    const { httpClient, handleException } = useFetchManager()
    
    const method = typeof options === "object" ? options.request(httpClient) : options(httpClient)
    const afterRequest = typeof options === "object" ? options.afterRequest : undefined
    const handleErrorInRequest = typeof options === "object" ? options.handleErrorInRequest : undefined

    return async (param: PARAM, handleError?: ErrorHandler<E>): Promise<MODEL | undefined> => {
        const res = await method(param)
        if (res.ok) {
            afterRequest?.(res.data, param)
            return res.data
        } else if (res.exception) {
            const e = handleError ? handleError(res.exception) : handleErrorInRequest ? handleErrorInRequest(res.exception) : res.exception
            if (e !== undefined) handleException(res.exception)
        }
        return undefined
    }
}

export function usePostFetchHelper<PARAM, MODEL, E extends BasicException>(options: PostFetchHelperOptions<PARAM, MODEL, E> | PostFetchHelperOptions<PARAM, MODEL, E>["request"]): PostFetchHelper<PARAM, E> {
    const { httpClient, handleException } = useFetchManager()
    
    const method = typeof options === "object" ? options.request(httpClient) : options(httpClient)
    const afterRequest = typeof options === "object" ? options.afterRequest : undefined
    const handleErrorInRequest = typeof options === "object" ? options.handleErrorInRequest : undefined

    return async (param: PARAM, handleError?: ErrorHandler<E>): Promise<boolean> => {
        const res = await method(param)
        if(res.ok) {
            afterRequest?.(res.data, param)
            return true
        }else if(res.exception) {
            const e = handleError ? handleError(res.exception) : handleErrorInRequest ? handleErrorInRequest(res.exception) : res.exception
            if(e !== undefined) handleException(res.exception)
        }
        return false
    }
}

export function usePathFetchHelper<PATH, PARAM, MODEL, E extends BasicException>(options: PathFetchHelperOptions<PATH, PARAM, MODEL, E> | PathFetchHelperOptions<PATH, PARAM, MODEL, E>["request"]): PathFetchHelper<PATH, PARAM, MODEL, E> {
    const { httpClient, handleException } = useFetchManager()

    const method = typeof options === "object" ? options.request(httpClient) : options(httpClient)
    const afterRequest = typeof options === "object" ? options.afterRequest : undefined
    const handleErrorInRequest = typeof options === "object" ? options.handleErrorInRequest : undefined

    return async (path: PATH, param: PARAM, handleError?: ErrorHandler<E>): Promise<MODEL | undefined> => {
        const res = await method(path, param)
        if (res.ok) {
            afterRequest?.(res.data, path, param)
            return res.data
        } else if (res.exception) {
            const e = handleError ? handleError(res.exception) : handleErrorInRequest ? handleErrorInRequest(res.exception) : res.exception
            if (e !== undefined) handleException(res.exception)
        }
        return undefined
    }
}

export function usePostPathFetchHelper<PATH, PARAM, MODEL, E extends BasicException>(options: PostPathFetchHelperOptions<PATH, PARAM, MODEL, E> | PostPathFetchHelperOptions<PATH, PARAM, MODEL, E>["request"]): PostPathFetchHelper<PATH, PARAM, E> {
    const { httpClient, handleException } = useFetchManager()

    const method = typeof options === "object" ? options.request(httpClient) : options(httpClient)
    const afterRequest = typeof options === "object" ? options.afterRequest : undefined
    const handleErrorInRequest = typeof options === "object" ? options.handleErrorInRequest : undefined

    return async (path: PATH, param: PARAM, handleError?: ErrorHandler<E>): Promise<boolean> => {
        const res = await method(path, param)
        if(res.ok) {
            afterRequest?.(res.data, path, param)
            return true
        }else if(res.exception) {
            const e = handleError ? handleError(res.exception) : handleErrorInRequest ? handleErrorInRequest(res.exception) : res.exception
            if(e !== undefined) handleException(res.exception)
        }
        return false
    }
}

export function useHttpClientHelper(): HttpClientHelper {
    const { httpClient, handleException } = useFetchManager()
    return async <MODEL, E extends BasicException>(choose: (client: HttpClient) => Promise<Response<MODEL, E>>, handleError?: ErrorHandler<E>): Promise<MODEL | undefined> => {
        const res = await choose(httpClient)
        if (res.ok) {
            return res.data
        } else if (res.exception) {
            const e = handleError ? handleError(res.exception) : res.exception
            if (e !== undefined) handleException(res.exception)
        }
        return undefined
    }
}