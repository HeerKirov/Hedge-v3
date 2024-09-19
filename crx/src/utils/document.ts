
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
    createElement<K extends keyof HTMLElementTagNameMap>(tagName: K, attrs?: Record<string, string>, children?: Node[]): HTMLElementTagNameMap[K] {
        const element = document.createElement(tagName, undefined)
        if(attrs) for(const [k, v] of Object.entries(attrs)) {
            element.setAttribute(k, v)
        }
        if(children?.length) element.append(...children)
        return element
    }
}