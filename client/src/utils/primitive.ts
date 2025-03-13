
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

export class ExpireSet<T> {
    private readonly interval: number
    private readonly set = new Set<T>()
    private readonly arr: {value: T, expireAt: number}[] = []
    constructor(interval: number) {
        this.interval = interval
    }

    add(t: T): boolean {
        const now = Date.now()
        this.cleanExpires(now)
        if(this.set.has(t)) {
            const idx = this.arr.findIndex(i => i.value === t)
            this.arr.splice(idx, 1)
            return false
        }else{
            this.set.add(t)
            this.arr.push({value: t, expireAt: now + this.interval})
            return true
        }
    }

    has(t: T): boolean {
        const now = Date.now()
        this.cleanExpires(now)
        return this.set.has(t)
    }

    del(t: T): boolean {
        const now = Date.now()
        this.cleanExpires(now)
        if(this.set.has(t)) {
            this.set.delete(t)
            const idx = this.arr.findIndex(i => i.value === t)
            this.arr.splice(idx, 1)
            return true
        }else{
            return false
        }
    }

    private cleanExpires(now: number) {
        let i = 0
        for(; i < this.arr.length; i++) {
            if(this.arr[i].expireAt > now) {
                break
            }
        }
        if(i > 0) {
            const deleted = this.arr.splice(0, i)
            for(const deletedElement of deleted) {
                this.set.delete(deletedElement.value)
            }
        }
    }
}