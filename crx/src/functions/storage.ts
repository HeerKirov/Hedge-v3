import { SourceDataPath } from "@/functions/server/api-all"
import { SourceDataUpdateForm } from "@/functions/server/api-source-data"

/**
 * session会话存储。在这里的通常是各类临时缓存。
 */
export const sessions = {
    /**
     * 临时存储。
     */
    cache: {
        /**
         * 临时关闭了自动收集。
         */
        closeAutoCollect: createEndpointWithDefault<boolean>("session", "cache/source-data/close-auto-collect", false),
        /**
         * 最近收集过的source data。在auto collect时被用于节流，避免重复下载同一个identity的来源数据。
         */
        sourceDataCollected: createSetEndpoint<{sourceSite: string, sourceId: string}>("session", "cache/source-data/collected", p => `${p.sourceSite}-${p.sourceId}`),
        /**
         * 来源数据收集模块最近所收集的来源数据。采用列表缓存模式，因此会清理较旧的数据。
         */
        sourceDataStorage: createListCacheEndpoint<{sourceSite: string, sourceId: string}, SourceDataUpdateForm>("session", "cache/source-data/storage", p => `${p.sourceSite}-${p.sourceId}`, 100),
        /**
         * 最近手动下载的文件的一些附加信息。
         * 这些附加信息在手动下载时被写入，并在determining过程中被提取出来，代替从下载项获得的信息来使用。
         */
        downloadItemInfo: createDictEndpoint<string, {sourcePath: SourceDataPath, collectSourceData: boolean}>("session", "cache/download/info", p => p.toString()),
        /**
         * fantia的page与part name的对应。
         */
        fantiaPageNum: createDictEndpoint<{pid: string, pname: string}, {page: number}>("session", "cache/fantia/page-num", p => `${p.pid}-${p.pname}`)
    },
}

function createEndpoint<T>(type: "local" | "session", key: string) {
    const f = type === "local" ? chrome.storage.local : chrome.storage.session
    return async function(newValue?: T): Promise<T | undefined> {
        if(newValue !== undefined) {
            await f.set({ [key]: newValue })
            return newValue
        }else{
            const res = await f.get([key])
            return res[key]
        }
    }
}

function createEndpointWithDefault<T>(type: "local" | "session", key: string, defaultValue: T) {
    const f = type === "local" ? chrome.storage.local : chrome.storage.session
    return async function(newValue?: T): Promise<T> {
        if(newValue !== undefined) {
            await f.set({ [key]: newValue })
            return newValue
        }else{
            const res = await f.get([key])
            return res[key] ?? defaultValue
        }
    }
}

function createPathEndpoint<P, T>(type: "local" | "session", keyOf: (path: P) => string) {
    const f = type === "local" ? chrome.storage.local : chrome.storage.session
    return {
        async get(path: P): Promise<T | undefined> {
            const key = keyOf(path)
            const res = await f.get([key])
            return res[key]
        },
        async set(path: P, newValue: T): Promise<void> {
            const key = keyOf(path)
            await f.set({ [key]: newValue })
        }
    }
}

function createDictEndpoint<P, T>(type: "local" | "session", key: string, subKeyOf: (path: P) => string) {
    const f = type === "local" ? chrome.storage.local : chrome.storage.session
    return {
        async get(path: P): Promise<T | undefined> {
            const subKey = subKeyOf(path)
            const { [key]: res } = await f.get([key])
            return res ? res[subKey] : undefined
        },
        async set(path: P, newValue: T): Promise<void> {
            const subKey = subKeyOf(path)
            const { [key]: res } = await f.get([key])
            if(res !== undefined) {
                res[subKey] = newValue
                await f.set({ [key]: res })
            }else{
                const newRes = { [subKey]: newValue }
                await f.set({ [key]: newRes })
            }
        },
        async del(path: P): Promise<void> {
            const subKey = subKeyOf(path)
            const { [key]: res } = await f.get([key])
            if(res !== undefined && res[subKey] !== undefined) {
                delete res[subKey]
                await f.set({ [key]: res })
            }
        }
    }
}

function createListCacheEndpoint<P, T>(type: "local" | "session", key: string, subKeyOf: (path: P) => string, maxSize: number) {
    const f = type === "local" ? chrome.storage.local : chrome.storage.session
    return {
        async get(path: P): Promise<T | undefined> {
            const subKey = subKeyOf(path)
            const { [key]: res } = await f.get([key])
            if(res) {
                const li = res as { key: string, value: T }[]
                for(let i = li.length - 1; i >= 0; i--) {
                    if(li[i].key === subKey) {
                        return li[i].value
                    }
                }
            }
            return undefined
        },
        async set(path: P, newValue: T): Promise<void> {
            const subKey = subKeyOf(path)
            const { [key]: res } = await f.get([key])
            if(res !== undefined) {
                const li = res as { key: string, value: T }[]
                const existIndex = li.findIndex(i => i.key === subKey)
                if(existIndex >= 0) li.splice(existIndex, 1)
                li.push({key: subKey, value: newValue})
                if(li.length > maxSize) li.splice(0, li.length - maxSize)
                await f.set({ [key]: li })
            }else{
                const newRes = [{key: subKey, value: newValue}]
                await f.set({ [key]: newRes })
            }
        },
        async del(path: P): Promise<void> {
            const subKey = subKeyOf(path)
            const { [key]: res } = await f.get([key])
            if(res !== undefined) {
                const li = res as { key: string, value: T }[]
                const existIndex = li.findIndex(i => i.key === subKey)
                if(existIndex >= 0) {
                    li.splice(existIndex, 1)
                    await f.set({ [key]: li })
                }
            }
        }
    }
}

function createSetEndpoint<P>(type: "local" | "session", key: string, subKeyOf: (path: P) => string) {
    const f = type === "local" ? chrome.storage.local : chrome.storage.session
    return {
        async get(path: P): Promise<boolean> {
            const subKey = subKeyOf(path)
            const res = await f.get([key])
            return res[key] ? !!res[key][subKey] : false
        },
        async set(path: P, newValue: boolean): Promise<void> {
            const subKey = subKeyOf(path)
            const res = await f.get([key])
            const resValue = res[key]
            if(resValue !== undefined) {
                if(newValue) {
                    if(subKey !in resValue) {
                        resValue[subKey] = 1
                        await f.set({ [key]: resValue })
                    }
                }else if(subKey in resValue) {
                    delete resValue[subKey]
                    await f.set({ [key]: resValue })
                }
            }else if(newValue) {
                const newRes = { [subKey]: 1 }
                await f.set({ [key]: newRes })
            }
        }
    }
}
