
export function lazy<T>(by: () => T): () => T {
    let generated = false
    let obj: T | undefined

    return function(): T {
        if(generated) return obj!
        obj = by()
        generated = true
        return obj
    }
}