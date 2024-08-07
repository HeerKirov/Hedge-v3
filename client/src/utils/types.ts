export const maps = {
    mapArray<V, R>(m: {[k: string]: V}, trans: (k: string, v: V) => R): R[] {
        const ret: R[] = []
        for(const k in m) {
            ret.push(trans(k, m[k]))
        }
        return ret
    },
    parse<K extends number | string | symbol, V>(arr: [K, V][]): Record<K, V> {
        const ret: Record<K, V> = {} as Record<K, V>
        for(const [k, v] of arr) {
            ret[k] = v
        }
        return ret
    },
}

export const arrays = {
    compare(a: number[], b: number[]): number {
        for(let i = 0; a[i] !== undefined && b[i] !== undefined; ++i) {
            if(a[i] === undefined) {
                return -1
            }else if(b[i] === undefined) {
                return 1
            }else if(a[i] > b[i]) {
                return 1
            }else if(a[i] < b[i]) {
                return -1
            }
        }
        return 0
    }
}

/**
 * 适用于各种IPC通用返回值的返回类型。它包括了几种常见情况。
 * ok: 成功，可以获取返回结果。
 * code !== undefined: 失败，可以获取一个预料之内的已编码的错误。
 * else: 失败，且只能获取一个预料之外的未编码的错误信息。
 */
export type IResponse<T, C = string, I = any> = ResponseOk<T> | ResponseError<C, I> | ResponseConnectionError

interface ResponseOk<T> {
    ok: true
    data: T
}

interface ResponseError<C, I> {
    ok: false
    code: C
    message?: string | null
    info?: I
}

interface ResponseConnectionError {
    ok: false
    code: undefined
    message: string
}