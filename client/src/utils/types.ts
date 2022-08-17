export const maps = {
    mapArray<V, R>(m: {[k: string]: V}, trans: (k: string, v: V) => R): R[] {
        const ret: R[] = []
        for(const k in m) {
            ret.push(trans(k, m[k]))
        }
        return ret
    }
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
