
export type Result<T, E> = {ok: true, value: T} | {ok: false, err: E}

export const strings = {
    removeSuffix(str: string, suffix: string | string[]): string {
        if(typeof suffix === "string") {
            if(str.endsWith(suffix)) {
                return str.slice(0, str.length - suffix.length)
            }
        }else{
            for(const s of suffix) {
                if(str.endsWith(s)) {
                    return str.slice(0, str.length - s.length)
                }
            }
        }
        return str
    }
}

export const dates = {
    parseInLocalDate(str: string): Date | null {
        const matched = str.match(/(\d+)[-\/](\d+)[-\/](\d+)/)
        if(matched) {
            const d = new Date(parseInt(matched[1]), parseInt(matched[2]) - 1, parseInt(matched[3]))
            if(isNaN(d.getTime())) {
                return null
            }else{
                return d
            }
        }else{
            return null
        }
    },
    toFormatDate(date: Date): string {
        function fmt(n: number) { return n > 0 ? n : `0${n}`}
        return `${date.getFullYear()}-${fmt(date.getMonth() + 1)}-${fmt(date.getDate())}`
    },
    compareTo(a: Date, b: Date): -1 | 0 | 1 {
        return numbers.compareTo(a.getTime(), b.getTime())
    }
}

export const arrays = {
    equals<T>(a: T[], b: T[], eq: (a: T, b: T) => boolean = (a, b) => a === b): boolean {
        if (a.length !== b.length) {
            return false
        }
        for (let i = 0; i < a.length; ++i) {
            if (!eq(a[i], b[i])) {
                return false
            }
        }
        return true
    },
    distinctBy<T>(arr: T[], eq: (a: T, b: T) => boolean = (a, b) => a === b): T[] {
        const ret: T[] = []
        for(const item of arr) {
            if(!ret.find(i => eq(i, item))) {
                ret.push(item)
            }
        }
        return ret
    },
    distinct<T>(arr: T[]): T[] {
        const ret: T[] = []
        for(const item of arr) {
            if(!ret.includes(item)) {
                ret.push(item)
            }
        }
        return ret
    },
    maxBy<T>(arr: T[], compare: (a: T, b: T) => number): T | undefined {
        if(arr.length <= 0) {
            return undefined
        }
        let max: T | undefined
        for(const n of arr) {
            if(max === undefined || compare(n, max) > 0) {
                max = n
            }
        }
        return max
    },
    maxOf<T>(arr: T[], valueOf: (a: T) => number): T | undefined {
        if(arr.length <= 0) {
            return undefined
        }
        let max: T | undefined
        let maxValue: number | undefined
        for(const n of arr) {
            const value = valueOf(n)
            if(maxValue === undefined || value > maxValue) {
                max = n
                maxValue = value
            }
        }
        return max
    },
    max(arr: number[]): number | undefined {
        if(arr.length <= 0) {
            return undefined
        }
        let max: number | undefined
        for(const n of arr) {
            if(max === undefined || n > max) max = n
        }
        return max
    },
    minOf<T>(arr: T[], valueOf: (a: T) => number): T | undefined {
        if(arr.length <= 0) {
            return undefined
        }
        let min: T | undefined
        let minValue: number | undefined
        for(const n of arr) {
            const value = valueOf(n)
            if(minValue === undefined || value < minValue) {
                min = n
                minValue = value
            }
        }
        return min
    },
    intersect<T>(...arr: T[][]): T[] {
        if(arr.length <= 0) return []
        let [first, ...then] = arr
        for(const set of then) {
            if(first.length <= 0) return []
            first = first.filter(i => set.includes(i))
        }
        return first
    },
    intersectBy<T>(arr: T[][], eq: (a: T, b: T) => boolean): T[] {
        if(arr.length <= 0) return []
        let [first, ...then] = arr
        for(const set of then) {
            if(first.length <= 0) return []
            first = first.filter(i => set.some(j => eq(i, j)))
        }
        return first
    }
}

export const maps = {
    parse<K extends number | string | symbol, V>(arr: [K, V][]): Record<K, V> {
        const ret: Record<K, V> = {} as Record<K, V>
        for(const [k, v] of arr) {
            ret[k] = v
        }
        return ret
    },
    equals<T>(a: {[key: string]: T}, b: {[key: string]: T}, eq: (a: T, b: T) => boolean = (a, b) => a === b): boolean {
        const entriesA = Object.entries(a)
        if(entriesA.length !== Object.keys(b).length) {
            return false
        }
        for(const [key, valueA] of entriesA) {
            if(!b.hasOwnProperty(key) || !eq(valueA, b[key])) {
                return false
            }
        }
        return true
    }
}

export const objects = {
    deepEquals(a: any, b: any): boolean {
        const typeA = a === null ? "null" : typeof a
        const typeB = b === null ? "null" : typeof b

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
    }
}

export const files = {
    dataURLtoFile(dataURL: string, fileName: string): File {
        const arr = dataURL.split(','), mime = arr[0].match(/:(.*?);/)![1], bstr = atob(arr[1])
        let n = bstr.length, u8arr = new Uint8Array(n)
        while(n--){
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], fileName, {type:mime})
    },
    blobToDataURL(blob: Blob): Promise<string> {
        return new Promise(resolve => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result as string)
            reader.readAsDataURL(blob)
        })
    }
}

export const numbers = {
    compareTo(a: number, b: number): -1 | 0 | 1 {
        return a === b ? 0 : a > b ? 1 : -1
    },
    roundNDecimal(n: number, len: number): number {
        const x = Math.pow(10, len)
        return Math.round(n * x) / x
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
    },
    toHourTimesDisplay(mills: number, optionalHour: boolean = true): string {
        const secInterval = Math.floor(mills / 1000)
        const sec = secInterval % 60
        const min = (secInterval - sec) % 3600 / 60
        const hour = Math.floor(secInterval / 3600)

        function dbl(i: number): string | number {
            return i >= 10 ? i : `0${i}`
        }

        if(optionalHour && hour <= 0) {
            return `${dbl(min)}:${dbl(sec)}`
        }else{
            return `${dbl(hour)}:${dbl(min)}:${dbl(sec)}`
        }
    }
}
