export const arrays = {
    newArray<T>(length: number, generator: (index: number) => T): T[] {
        return Array(length).fill(null).map((_, index) => generator(index))
    },
    split<T>(arr: T[], condition: (prev: T, next: T) => boolean): T[][] {
        const result: T[][] = []
        let beginIndex = 0
        for(let i = 0; i < arr.length; i++) {
            if(i + 1 === arr.length || condition(arr[i], arr[i + 1])) {
                const part = arr.slice(beginIndex, i + 1)
                if(part.length) result.push(part)
                beginIndex = i + 1
            }
        }
        return result
    },
    insertGap<T, G>(arr: T[], gap: () => G): (T | G)[] {
        const result: (T | G)[] = []

        let first = true
        for (const item of arr) {
            if(first) {
                first = false
            }else{
                result.push(gap())
            }
            result.push(item)
        }

        return result
    },
    filterInto<T>(arr: T[], condition: (value: T) => boolean): [T[], T[]] {
        const r1: T[] = []
        const r2: T[] = []
        for (const item of arr) {
            if(condition(item)) {
                r1.push(item)
            }else{
                r2.push(item)
            }
        }
        return [r1, r2]
    },
    window<T>(arr: T[], size: number): T[][] {
        const result: T[][] = []
        let beginIndex = 0
        for(let i = 0; i < arr.length; i++) {
            if(i + 1 === arr.length || (i != 0 && i % size === 0)) {
                const part = arr.slice(beginIndex, i + 1)
                if(part.length) result.push(part)
                beginIndex = i + 1
            }
        }
        return result
    },
    toMap<T extends string, R>(arr: T[], generator: (value: T, index: number) => R): {[key in T]: R} {
        const ret: {[key: string]: R} = {}
        arr.forEach((t, i) => {
            ret[t] = generator(t, i)
        })
        return <{[key in T]: R}>ret
    },
    toTupleMap<T, K extends string, R>(arr: T[], generator: (value: T, index: number) => [K, R]): {[key in K]: R} {
        const ret: {[key: string]: R} = {}
        arr.forEach((t, i) => {
            const [k, v] = generator(t, i)
            ret[k] = v
        })
        return <{[key in K]: R}>ret
    },
    equals<T>(a: T[], b: T[], equalsBy: (a: T, b: T) => boolean = (a, b) => a === b): boolean {
        if (a.length !== b.length) {
            return false
        }
        for (let i = 0; i < a.length; ++i) {
            if (!equalsBy(a[i], b[i])) {
                return false
            }
        }
        return true
    }
}

export const maps = {
    map<T, R>(map: {[key: string]: T}, transfer: (value: T, key: string) => R): {[key: string]: R} {
        const ret: {[key: string]: R} = {}
        for(const [key, value] of Object.entries(map)) {
            ret[key] = transfer(value, key)
        }
        return ret
    },
    filter<T>(map: {[key: string]: T}, condition: (key: string, value: T) => boolean): {[key: string]: T} {
        const ret: {[key: string]: T} = {}
        for(const [key, value] of Object.entries(map)) {
            if(condition(key, value)) {
                ret[key] = value
            }
        }
        return ret
    },
    equals<T>(a: {[key: string]: T}, b: {[key: string]: T}, equalsBy: (a: T, b: T) => boolean = (a, b) => a === b): boolean {
        const entriesA = Object.entries(a)
        if(entriesA.length !== Object.keys(b).length) {
            return false
        }
        for(const [key, valueA] of entriesA) {
            if(!b.hasOwnProperty(key) || !equalsBy(valueA, b[key])) {
                return false
            }
        }
        return true
    }
}

export const numbers = {
    round2decimal(n: number): number {
        return Math.round(n * 100) / 100
    },
    roundNDecimal(n: number, len: number): number {
        const x = Math.pow(10, len)
        return Math.round(n * x) / x
    },
    floorHalfDecimal(n: number): number {
        return Math.floor(n * 2) / 2
    },
    between(min: number, value: number, max: number): number {
        return value < min ? min : value > max ? max : value
    },
    toBytesDisplay(byteSize: number): string {
        if(byteSize >= 1 << 30) {
            return `${numbers.roundNDecimal(byteSize / (1 << 30), 3)} GiB`
        }else if(byteSize >= 1 << 20) {
            return `${numbers.roundNDecimal(byteSize / (1 << 20), 3)} MiB`
        }else if(byteSize >= 1 << 10) {
            return `${numbers.roundNDecimal(byteSize / (1 << 10), 3)} KiB`
        }else{
            return `${numbers.roundNDecimal(byteSize, 3)} B`
        }
    }
}

export const strings = {
    repeat(char: string, times: number): string {
        let s = ""
        for (let i = 0; i < times; i++) {
            s += char
        }
        return s
    },
    lastPathOf(path: string): string {
        const idx = path.lastIndexOf("/")
        if(idx >= 0) {
            return path.substring(idx + 1)
        }else{
            return path
        }
    }
}

export const objects = {
    deepEquals(a: any, b: any): boolean {
        const typeA = a === null ? "null" : typeof a, typeB = b === null ? "null" : typeof b

        if(typeA === "object" && typeB === "object") {
            const aIsArray = a instanceof Array, bIsArray = b instanceof Array
            if(aIsArray && bIsArray) {
                if(arrays.equals(a, b, objects.deepEquals)) {
                    return true
                }
            }else if(!aIsArray && !bIsArray) {
                if(maps.equals(a, b, objects.deepEquals)) {
                    return true
                }
            }
            return false
        }else if(typeA !== typeB) {
            return false
        }else{
            return a === b
        }
    },
    deepCopy<T>(any: T): T {
        const type = any === null ? "null" : typeof any
        if(type === "object") {
            if(any instanceof Array) {
                return any.map(v => objects.deepCopy(v)) as any as T
            }else{
                return maps.map(any as any as {}, v => objects.deepCopy(v)) as any as T
            }
        }else{
            return any
        }
    },
    clear(a: any): any {
        for(const key of Object.keys(a)) {
            delete a[key]
        }
        return a
    },
    copyTo(from: any, to: any) {
        for(const [key, value] of Object.entries(from)) {
            to[key] = value
        }
    }
}

export function createObjectFunction<F extends Function, O extends object>(func: F, obj: O): F & O {
    for(const [k ,v] of Object.entries(obj)) {
        (func as any)[k] = v
    }
    return func as any
}
