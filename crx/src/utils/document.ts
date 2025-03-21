
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

export function onDOMContentObserved(options: {
    observe?: MutationObserverInit,
    mutation: (record: MutationRecord) => boolean,
    init: () => boolean,
    preCondition?: () => boolean
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

            const observer = new MutationObserver(mutationsList => {
                for(const mutation of mutationsList) {
                    if(options.mutation(mutation)) {
                        load().finally()
                        break
                    }
                }
            })

            observer.observe(document.body, options.observe)

            if(options.init()) {
                load().finally()
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