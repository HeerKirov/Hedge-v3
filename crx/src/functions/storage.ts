import { SourceDataPath } from "@/functions/server/api-all.ts";

/**
 * session会话存储。在这里的通常是各类临时缓存。
 */
export const sessions = {
    /**
     * 反射信息。根据一个固定ID，反射至该固定ID的某个固定值。
     * 这类反射信息通常在document loaded时在页面被保存，并在download suggest等处被使用。
     */
    reflect: {
        /**
         * E-Hentai: gallery id + page映射到image hash。
         */
        ehentaiGalleryImageHash: createDictEndpoint<{gid: string, page: string}, {imageHash: string}>("session", "reflect/ehentai/gallery/image-hash",p => `${p.gid}-${p.page}`)
    },
    /**
     * 临时存储。
     */
    cache: {
        /**
         * 临时关闭了自动收集。
         */
        closeAutoCollect: createEndpointWithDefault<boolean>("session", "cache/source-data/close-auto-collect", false),
        /**
         * 最近收集的source data identity。
         * 在downloaded created时被用于节流，避免重复下载同一个identity的来源数据。
         */
        sourceDataCollected: createSetEndpoint<{site: string, sourceId: string}>("session", "cache/source-data/collected", p => `${p.site}-${p.sourceId}`),
        /**
         * 最近手动下载的文件的一些附加信息。
         * 这些附加信息在手动下载时被写入，并在determining过程中被提取出来，代替从下载项获得的信息来使用。
         */
        downloadItemInfo: createDictEndpoint<string, {referrer: string, sourcePath: SourceDataPath | undefined}>("session", "cache/download/info", p => p.toString())
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
