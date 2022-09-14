import { BasicException } from "@/functions/http-client/exceptions"
import { HttpClient, Response } from "@/functions/http-client"
import { useFetchManager } from "./install"

// == Retrieve Helper 端点调用协助工具 ==
// 提供对detail端点的get/patch/delete方法的一套封装，以供在需要的时候即时调用。
// 不提供任何响应式内容，只是个方法调用工具。

export interface RetrieveHelper<PATH, MODEL, FORM, UE extends BasicException, DE extends BasicException> {
    getData(path: PATH): Promise<MODEL | undefined>
    setData(path: PATH, form: FORM, handleError?: (e: UE) => UE | void): Promise<boolean>
    deleteData(path: PATH, handleError?: (e: DE) => DE | void): Promise<boolean>
}

interface RetrieveHelperOptions<PATH, MODEL, FORM, GE extends BasicException, UE extends BasicException, DE extends BasicException> {
    get?(httpClient: HttpClient): (path: PATH) => Promise<Response<MODEL, GE>>
    update?(httpClient: HttpClient): (path: PATH, form: FORM) => Promise<Response<MODEL | null, UE>>
    delete?(httpClient: HttpClient): (path: PATH) => Promise<Response<unknown, DE>>
    handleErrorInUpdate?(e: UE): UE | void
    handleErrorInDelete?(e: DE): DE | void
}

export function useRetrieveHelper<PATH, MODEL, FORM, GE extends BasicException, UE extends BasicException, DE extends BasicException>(options: RetrieveHelperOptions<PATH, MODEL, FORM, GE, UE, DE>): RetrieveHelper<PATH, MODEL, FORM, UE, DE> {
    const { httpClient, handleException } = useFetchManager()

    const method = {
        get: options.get?.(httpClient),
        update: options.update?.(httpClient),
        delete: options.delete?.(httpClient)
    }

    const getData = async (path: PATH): Promise<MODEL | undefined> => {
        if(!method.get) throw new Error("options.get is not satisfied.")

        const res = await method.get(path)
        if(res.ok) {
            return res.data
        }else if(res.exception) {
            handleException(res.exception)
        }
        return undefined
    }

    const setData = async (path: PATH, form: FORM, handleError?: (e: UE) => UE | void): Promise<boolean> => {
        if(!method.update) throw new Error("options.update is not satisfied.")

        const res = await method.update(path, form)
        if(res.ok) {
            return true
        }else if(res.exception) {
            //首先尝试让上层处理错误，上层拒绝处理则自行处理
            const e = handleError ? handleError(res.exception) : options.handleErrorInUpdate ? options.handleErrorInUpdate(res.exception) : res.exception
            if(e != undefined) handleException(e)
        }
        return false
    }

    const deleteData = async (path: PATH, handleError?: (e: DE) => DE | void): Promise<boolean> => {
        if(!method.delete) throw new Error("options.delete is not satisfied.")
        const res = await method.delete(path)
        if(res.ok) {
            return true
        }else if(res.exception) {
            //首先尝试让上层处理错误，上层拒绝处理则自行处理
            const e = handleError ? handleError(res.exception) : options.handleErrorInDelete ? options.handleErrorInDelete(res.exception) : res.exception
            if(e != undefined) handleException(e)
        }
        return false
    }

    return {getData, setData, deleteData}
}
