/**
 * 当DOMContentLoaded时，调用事件。或者此事件注册时，若已初始化完毕，则直接调用事件。
 */
export function onDOMContentLoaded(callback: () => void) {
    const call = () => {
        try {
            callback()
        }catch (error) {
            console.error(error)
        }
    }
    if(document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", call)
    }else{
        call()
    }
}

/**
 * 更复杂的DOMContentLoaded侦测，在侦测到某种特定元素加载后，才视作文档加载完成。适用于注入异步启动的前端框架。
 */
export function onDOMContentObserved(options: {
    observe?: MutationObserverInit,
    mutation: ((record: MutationRecord) => boolean) | ((record: MutationRecord) => boolean)[],
    init: (() => boolean) | (() => boolean)[],
    preCondition?: () => boolean,
    target?: Node
}, callback: () => void, callback2?: (() => void)) {
    onDOMContentLoaded(() => {
        if(options.preCondition === undefined || options.preCondition()) {
            if(callback2 !== undefined) callback()

            let once = true
            const load = async () => {
                if(once) {
                    once = false
                    observer.disconnect()
                    if(callback2 !== undefined) {
                        callback2()
                    }else{
                        callback()
                    }
                }
            }

            const conditionList = options.mutation instanceof Array ? [...options.mutation] : [options.mutation]

            const observer = new MutationObserver(mutationsList => {
                for(const mutation of mutationsList) {
                    if(conditionList.length <= 0) {
                        load().finally()
                        break
                    }
                    for(let i = conditionList.length - 1; i >= 0; i--) {
                        const condition = conditionList[i]
                        if(condition(mutation)) {
                            conditionList.splice(i, 1)
                        }
                    }
                    if(conditionList.length <= 0) {
                        load().finally()
                        break
                    }
                }
            })

            observer.observe(options.target ?? document.body, options.observe)

            if(options.init instanceof Array) {
                for(let i = options.init.length - 1; i >= 0; i--) {
                    if(options.init[i]()) {
                        conditionList.splice(i, 1)
                    }
                }
                if(conditionList.length <= 0) {
                    load().finally()
                }
            }else if(options.init()) {
                load().finally()
            }
        }
    })
}

/**
 * 适用于动态内容加载的侦听事件。用于在动态加载框架中，立即以及持续地检索出新增的DOM，并返回这些DOM用于处理。
 */
export function onObserving<E extends Element>(options: {
    target?: Node,
    observe?: MutationObserverInit,
    mutation: (record: MutationRecord) => E[] | undefined,
    init?: () => E[] | NodeListOf<E> | undefined,
    preCondition?: () => boolean
}, callback: (element: E, index: number) => void) {
    onDOMContentLoaded(() => {
        if(options.preCondition === undefined || options.preCondition()) {

            const observer = new MutationObserver(mutationsList => {
                const result: E[] = []
                for(const mutation of mutationsList) {
                    const r = options.mutation(mutation)
                    if(r && r.length > 0) result.push(...r)
                }
                if(result.length > 0) {
                    result.forEach((elem: E, index) => callback(elem, index))
                }
            })

            observer.observe(options.target ?? document.body, options.observe)

            const init = [...(options.init?.() ?? [])]
            if(init.length > 0) {
                init.forEach((elem: E, index) => callback(elem, index))
            }
        }
    })
}

export function getEnvironmentType(): EnvironmentType {
    if(environmentType === undefined) {
        if(typeof window !== "undefined") {
            if(window.location.href === chrome.runtime.getURL('options.html')) {
                environmentType = "OPTIONS"
            }else if(chrome.extension.getViews && chrome.extension.getViews({type: "popup"}).includes(window)) {
                environmentType = "POPUP"
            }else{
                environmentType = "CONTENT_SCRIPT"
            }
        }else if(typeof self !== "undefined" && self instanceof ServiceWorkerGlobalScope) {
            environmentType = "SERVICE_WORKER"
        }else{
            environmentType = "UNKNOWN"
        }
    }
    return environmentType
}

type EnvironmentType = "OPTIONS" | "POPUP" | "CONTENT_SCRIPT" | "SERVICE_WORKER" | "UNKNOWN"

let environmentType: EnvironmentType | undefined

export const documents = {
    createElement<K extends keyof HTMLElementTagNameMap>(tagName: K, attrs?: Record<string, string | ((e: any) => void)>, children?: (Node | string)[]): HTMLElementTagNameMap[K] {
        const element = document.createElement(tagName, undefined)
        if(attrs) for(const [k, v] of Object.entries(attrs)) {
            if(typeof v === "function") {
                element.addEventListener(k, v)
            }else{
                element.setAttribute(k, v)
            }
        }
        if(children?.length) element.append(...children)
        return element
    },
    clickDownload(filename: string, content: Blob | string | object) {
        const blob = content instanceof Blob ? content : new Blob([typeof content === "string" ? content : JSON.stringify(content, null, 2)], { type: content === "string" ? "text/plain" : "application/json" })
        const url = window.URL.createObjectURL(blob)
        try {
            const tempAnchor = document.createElement("a")
            tempAnchor.href = url
            tempAnchor.download = filename
            tempAnchor.click()
        }finally{
            URL.revokeObjectURL(url)
        }
    }
}

export const nativeApp = {
    newTab(routeName: string, args?: {path?: string | number, params?: Record<string, any>, initializer?: Record<string, any>}) {
        const encodedPath = args?.path !== undefined ? encodeURIComponent(window.btoa(JSON.stringify(args.path))) : undefined
        const encodedParams = args?.params !== undefined ? encodeURIComponent(window.btoa(JSON.stringify(args.params))) : undefined
        const encodedInitializer = args?.initializer !== undefined ? encodeURIComponent(window.btoa(JSON.stringify(args.initializer))) : undefined
        const url = `hedge://hedge/new-tab?routeName=${routeName}`
            + (encodedPath !== undefined ? `&path=${encodedPath}` : "")
            + (encodedParams !== undefined ? `&params=${encodedParams}` : "")
            + (encodedInitializer !== undefined ? `&initializer=${encodedInitializer}` : "")
        window.open(url)
    }
}