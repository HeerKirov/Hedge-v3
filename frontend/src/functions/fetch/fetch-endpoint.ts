import { onMounted, onUnmounted, ref, Ref, shallowReadonly, watch } from "vue"
import { BasicException, NotFound } from "@/functions/http-client/exceptions"
import { HttpClient, Response } from "@/functions/http-client"
import { WsEventConditions } from "@/functions/ws-client"
import { ErrorHandler, useFetchManager } from "./install"
import { throttle } from "@/utils/process"

// == Fetch Endpoint 端点调用器 ==
// 专注于处理REST API的detail端点，通过path确定指定的对象。
// 将retrieve, patch, delete行为整合起来，构成对单个对象的复杂CRUD操作。

export interface FetchEndpoint<PATH, MODEL, FORM, UE extends BasicException> {
    /**
     * 正在加载数据。
     */
    loading: Readonly<Ref<boolean>>
    /**
     * 正在提交update操作。
     */
    updating: Readonly<Ref<boolean>>
    /**
     * 正在提交delete操作。
     */
    deleting: Readonly<Ref<boolean>>
    /**
     * 数据内容。
     */
    data: Readonly<Ref<MODEL | null>>
    /**
     * 端点路径。
     */
    path: Readonly<Ref<PATH | null>>
    /**
     * 提交修改数据操作。
     * @param form 表单
     * @param handleError 为这次提交指定额外的错误处理器
     * @return boolean 在成功修改的情况下，返回true；任何错误都会导致false
     */
    setData(form: FORM, handleError?: ErrorHandler<UE>): Promise<boolean>
    /**
     * 提交删除此数据的操作。
     */
    deleteData(): Promise<boolean>
    /**
     * 手动刷新数据。
     */
    refreshData(): void
}

export interface FetchEndpointOptions<PATH, MODEL, FORM, GE extends BasicException, UE extends BasicException, DE extends BasicException> {
    /**
     * 决定此端点的的path属性。
     * 当path变化时，自动重新请求新的对象。
     */
    path: Ref<PATH | null>
    /**
     * retrieve操作的函数。
     */
    get(httpClient: HttpClient): (path: PATH) => Promise<Response<MODEL, GE | NotFound>>
    /**
     * update操作的函数。
     */
    update?(httpClient: HttpClient): (path: PATH, form: FORM) => Promise<Response<MODEL | null, UE>>
    /**
     * delete操作的函数。
     */
    delete?(httpClient: HttpClient): (path: PATH) => Promise<Response<unknown, DE>>
    /**
     * 事件过滤器。提供一个过滤器，以从wsEvents中过滤当前对象的变更通知。获得变更通知后，自动刷新对象。
     * tips: 不要直接解包context。解包会使path的内容被固定，失去响应性。应该直接取用path，或在返回函数内解包context。
     */
    eventFilter?(context: EventFilterContext<PATH>): WsEventConditions
    /**
     * 在path变化之前发生调用的事件。
     */
    beforePath?(): void
    /**
     * 在path变化之后发生调用的事件。
     */
    afterPath?(): void
    /**
     * 在get成功之后调用的事件。
     * 需要注意的是，在任何情况下data的变更都会触发此事件，类似于一个内置的watch方法，不过它只触发于结果数据，loading状态的null不会引起触发。
     * 包括event触发的变更，甚至包括对象已删除，同样会调用此事件。
     */
    afterRetrieve?(path: PATH | null, data: MODEL | null, type: "UPDATE" | "DELETE" | "PATH_CHANGED" | "EVENT" | "MANUAL"): void
    /**
     * 在update成功之后调用的事件。
     */
    afterUpdate?(path: PATH, data: MODEL): void
    /**
     * 在delete成功之后调用的事件。
     */
    afterDelete?(path: PATH): void
    /**
     * update过程中发生错误时的捕获函数。
     */
    handleErrorInUpdate?: ErrorHandler<UE>
    /**
     * delete过程中发生错误时的捕获函数。
     */
    handleErrorInDelete?: ErrorHandler<DE>
}

interface EventFilterContext<PATH> {
    path: PATH | null
}

export function useFetchEndpoint<PATH, MODEL, FORM, GE extends BasicException, UE extends BasicException, DE extends BasicException>(options: FetchEndpointOptions<PATH, MODEL, FORM, GE, UE, DE>): FetchEndpoint<PATH, MODEL, FORM, UE> {
    const { httpClient, wsClient, handleException } = useFetchManager()

    const method = {
        get: options.get(httpClient),
        update: options.update?.(httpClient),
        delete: options.delete?.(httpClient)
    }
    const path = options.path

    const loading: Ref<boolean> = ref(true)
    const updating: Ref<boolean> = ref(false)
    const deleting: Ref<boolean> = ref(false)
    const data: Ref<MODEL | null> = ref(null)

    const updatingThrottleMod = throttle({interval: 100})

    watch(path, async (path, oldPath, onInvalidate) => {
        //发送beforePath事件，前提是有oldPath
        if(oldPath !== undefined) options.beforePath?.()

        if(path == null) {
            //path的值为null时，直接按not found处理
            loading.value = false
            data.value = null
            options.afterRetrieve?.(null, null, "PATH_CHANGED")
        }else{
            let invalidate = false
            onInvalidate(() => invalidate = true)

            loading.value = true
            data.value = null

            const res = await method.get(path)
            if(invalidate) return

            if(res.ok) {
                data.value = res.data
                options.afterRetrieve?.(path, data.value, "PATH_CHANGED")
            }else if(res.exception && res.exception.code !== "NOT_FOUND") {
                //not found类错误会被包装，因此不会抛出
                handleException(res.exception)
            }

            loading.value = false
        }

        //发送afterPath事件，但此事件是在path变化后发送，所以前提是有oldPath
        if(oldPath !== undefined) options.afterPath?.()
    }, {immediate: true})

    if(options.eventFilter) {
        const context: EventFilterContext<PATH> = {
            path: path.value
        }
        watch(path, path => context.path = path, {flush: "sync"})

        const emitter = wsClient.on(options.eventFilter(context))

        onMounted(() => emitter.addEventListener(receiveEvent))
        onUnmounted(() => emitter.removeEventListener(receiveEvent))

        const receiveEvent = async () => {
            if(path.value !== null && !updating.value) {
                // 节流机制：EVENT带来的更新请求，在一定时间间隔内不能多次发生。此举是为了防止自己触发的EVENT反过来再次更新自己。
                // updating = true时，此时正在update流程内，因此直接节流。
                // 之后的调用使用了节流器，不允许短时间内的多次重复调用。
                // 节流器也会在update操作完成后被调用，在那之后的短时间内也不允许更新操作。
                updatingThrottleMod(async () => {
                    const res = await method.get(path.value!)
                    if(res.ok) {
                        data.value = res.data
                        options.afterRetrieve?.(path.value, data.value, "EVENT")
                    }else if(res.exception) {
                        data.value = null
                        if(res.exception.code !== "NOT_FOUND") {
                            handleException(res.exception)
                        }else{
                            options.afterRetrieve?.(path.value, null, "EVENT")
                        }
                    }
                })
            }
        }
    }

    const setData = async (form: FORM, handleError?: (e: UE) => UE | void): Promise<boolean> => {
        if(method.update && !updating.value && path.value != null) {
            updating.value = true
            try {
                const res = await method.update(path.value, form)
                if(res.ok) {
                    if(res.data) {
                        data.value = res.data
                        options.afterRetrieve?.(path.value, data.value, "UPDATE")
                        options.afterUpdate?.(path.value, data.value)
                    }else{
                        //在update函数没有提供返回值的情况下，去请求get函数以更新数据
                        const res = await method.get(path.value)
                        if(res.ok) {
                            data.value = res.data
                            options.afterRetrieve?.(path.value, data.value, "UPDATE")
                            options.afterUpdate?.(path.value, data.value)
                        }else if(res.exception) {
                            data.value = null
                            if(res.exception.code !== "NOT_FOUND") {
                                handleException(res.exception)
                            }else{
                                options.afterRetrieve?.(path.value, null, "UPDATE")
                            }
                        }
                    }
                }else if(res.exception) {
                    //错误处理的调用顺序是：方法即时提供的handler、options的handler、fetchManager的handler
                    const e = handleError ? handleError(res.exception) : options.handleErrorInUpdate ? options.handleErrorInUpdate(res.exception) : res.exception
                    if(e !== undefined) handleException(e)
                    return false
                }
            }finally{
                updating.value = false
                updatingThrottleMod()
            }
            return true
        }
        return false
    }

    const deleteData = async (): Promise<boolean> => {
        if(method.delete && !deleting.value && path.value != null) {
            deleting.value = true
            try {
                const res = await method.delete(path.value)
                if(res.ok) {
                    data.value = null
                    options.afterRetrieve?.(path.value, null, "DELETE")
                    options.afterDelete?.(path.value)
                }else if(res.exception) {
                    //错误处理的调用顺序是：options的handler、fetchManager的handler
                    const e = options.handleErrorInDelete ? options.handleErrorInDelete(res.exception) : res.exception
                    if(e !== undefined) handleException(e)
                    return false
                }
            }finally{
                deleting.value = false
            }
        }

        return true
    }

    const refreshData = async () => {
        if(path.value != null) {
            const currentPath = path.value
            loading.value = true
            const res = await method.get(currentPath)
            if(currentPath !== path.value) return
            if(res.ok) {
                data.value = res.data
                options.afterRetrieve?.(currentPath, data.value, "MANUAL")
            }else if(res.exception && res.exception.code !== "NOT_FOUND") {
                //not found类错误会被包装，因此不会抛出
                handleException(res.exception)
            }
            loading.value = false
        }
    }

    return {path: shallowReadonly(path), data, loading, updating, deleting, setData, deleteData, refreshData}
}
