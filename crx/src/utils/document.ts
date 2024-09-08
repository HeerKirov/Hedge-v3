
export function onDOMContentLoaded(callback: () => void) {
    if(document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", callback)
    }else{
        callback()
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