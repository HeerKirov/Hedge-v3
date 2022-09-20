import { BasicException } from "@/functions/http-client/exceptions"
import { HttpClient, Response } from "@/functions/http-client"
import { useFetchManager } from "./install"

// == Retrieve Helper 端点调用协助工具 ==
// 提供对detail端点的get/patch/delete方法的一套封装，以供在需要的时候即时调用。
// 不提供任何响应式内容，只是个方法调用工具。

export interface RetrieveHelper<PATH, MODEL, CF, UF, CE extends BasicException, UE extends BasicException, DE extends BasicException> {
    getData(path: PATH): Promise<MODEL | undefined>
    setData(path: PATH, form: UF, handleError?: (e: UE) => UE | void): Promise<boolean>
    createData(form: CF, handleError?: (e: CE) => CE | void): Promise<boolean>
    deleteData(path: PATH, handleError?: (e: DE) => DE | void): Promise<boolean>
}

interface RetrieveHelperOptions<PATH, MODEL, CF, UF, GE extends BasicException, CE extends BasicException, UE extends BasicException, DE extends BasicException> {
    get?(httpClient: HttpClient): (path: PATH) => Promise<Response<MODEL, GE>>
    update?(httpClient: HttpClient): (path: PATH, form: UF) => Promise<Response<MODEL | null, UE>>
    create?(httpClient: HttpClient): (form: CF) => Promise<Response<MODEL | null, CE>>
    delete?(httpClient: HttpClient): (path: PATH) => Promise<Response<unknown, DE>>
    handleErrorInCreate?(e: CE): CE | void
    handleErrorInUpdate?(e: UE): UE | void
    handleErrorInDelete?(e: DE): DE | void
    afterCreate?(form: CF, res: MODEL | null): void
    afterUpdate?(path: PATH, form: UF, res: MODEL | null): void
    afterDelete?(path: PATH): void
}

export function useRetrieveHelper<PATH, MODEL, CF, UF, GE extends BasicException, CE extends BasicException, UE extends BasicException, DE extends BasicException>(options: RetrieveHelperOptions<PATH, MODEL, CF, UF, GE, CE, UE, DE>): RetrieveHelper<PATH, MODEL, CF, UF, CE, UE, DE> {
    const { httpClient, handleException } = useFetchManager()

    const method = {
        get: options.get?.(httpClient),
        create: options.create?.(httpClient),
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

    const createData = async (form: CF, handleError?: (e: CE) => CE | void): Promise<boolean> => {
        if(!method.create) throw new Error("options.update is not satisfied.")

        const res = await method.create(form)
        if(res.ok) {
            options.afterCreate?.(form, res.data)
            return true
        }else if(res.exception) {
            //首先尝试让上层处理错误，上层拒绝处理则自行处理
            const e = handleError ? handleError(res.exception) : options.handleErrorInCreate ? options.handleErrorInCreate(res.exception) : res.exception
            if(e != undefined) handleException(e)
        }
        return false
    }

    const setData = async (path: PATH, form: UF, handleError?: (e: UE) => UE | void): Promise<boolean> => {
        if(!method.update) throw new Error("options.update is not satisfied.")

        const res = await method.update(path, form)
        if(res.ok) {
            options.afterUpdate?.(path, form, res.data)
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
            options.afterDelete?.(path)
            return true
        }else if(res.exception) {
            //首先尝试让上层处理错误，上层拒绝处理则自行处理
            const e = handleError ? handleError(res.exception) : options.handleErrorInDelete ? options.handleErrorInDelete(res.exception) : res.exception
            if(e != undefined) handleException(e)
        }
        return false
    }

    return {getData, setData, createData, deleteData}
}
