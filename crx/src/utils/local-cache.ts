export interface LocalCacheOptions<K> {
    keyAs?: (key: K) => any
    maxSize?: number
    ttl?: number // 过期时长（毫秒）
}

export interface LocalCache<K, V> {
    get(key: K): V | undefined
    set(key: K, value: V): void
    del(key: K): void
    clear(): void
}

interface CacheEntry<V> {
    value: V
    expiresAt?: number // 过期时间戳（毫秒）
}

class LocalCacheManager<K, V> implements LocalCache<K, V> {
    private cache = new Map<any, CacheEntry<V>>()
    private readonly maxSize?: number
    private readonly ttl?: number
    private readonly keyAs?: (key: K) => any

    constructor(options?: LocalCacheOptions<K>) {
        this.maxSize = options?.maxSize
        this.ttl = options?.ttl
        this.keyAs = options?.keyAs
    }

    get(key: K): V | undefined {
        const actualKey = this.keyAs?.(key) ?? key
        const entry = this.cache.get(actualKey)
        if (entry === undefined) {
            return undefined
        }

        // 检查是否过期
        if (entry.expiresAt !== undefined && Date.now() > entry.expiresAt) {
            this.cache.delete(actualKey)
            return undefined
        }

        // 如果设置了 maxSize，访问时需要更新 LRU 位置（删除后重新插入）
        if (this.maxSize !== undefined) {
            this.cache.delete(actualKey)
            this.cache.set(actualKey, entry)
        }

        return entry.value
    }

    set(key: K, value: V): void {
        const actualKey = this.keyAs?.(key) ?? key
        const expiresAt = this.ttl !== undefined ? Date.now() + this.ttl : undefined
        this.cache.set(actualKey, { value, expiresAt })
        this.trimIfNeeded()
    }

    del(key: K): void {
        const actualKey = this.keyAs?.(key) ?? key
        this.cache.delete(actualKey)
    }

    clear(): void {
        this.cache.clear()
    }

    private trimIfNeeded(): void {
        if (this.maxSize === undefined) {
            return
        }

        while (this.cache.size > this.maxSize) {
            // Map 的 keys() 返回的迭代器按插入顺序，第一个就是最旧的
            const firstKey = this.cache.keys().next().value
            if (firstKey !== undefined) {
                this.cache.delete(firstKey)
            } else {
                break
            }
        }
    }
}

// 缓存管理器实例的缓存，key -> manager 映射
const managerCache = new Map<string, LocalCache<any, any>>()

export function createLocalCache<K, V>(key: string, options?: LocalCacheOptions<K>): LocalCache<K, V> {
    // 如果已经存在相同 key 的管理器，直接返回
    if (managerCache.has(key)) {
        return managerCache.get(key) as LocalCache<K, V>
    }

    // 创建新的管理器并缓存
    const manager = new LocalCacheManager<K, V>(options)
    managerCache.set(key, manager)
    return manager
}