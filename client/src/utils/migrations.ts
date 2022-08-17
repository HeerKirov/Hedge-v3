import { maps } from "./types"

/**
 * 对目标上下文执行版本号检测和同步更改。
 */
export async function migrate<C>(context: C, migrations: {[version: string]: Migrate<C>}, version: Property<C>): Promise<C & {changed: boolean}> {
    const currentVersion = tupleOfVersion(version.get(context))

    const steps = (maps
        .mapArray(migrations, (k, v) => [tupleOfVersion(k), v]) as [[number, number, number], Migrate<C>][])
        .filter(([v]) => compareVersionTuple(v, currentVersion) > 0)
        .sort(([va], [vb]) => compareVersionTuple(va, vb))

    let changed = false
    for (let [v, func] of steps) {
        const stringVersion = stringOfVersion(v)
        version.set(context, stringVersion)
        await func(context)
        changed = true
        console.log(`[migrate] version ${stringVersion} is migrated.`)
    }

    return {changed, ...context}
}

export type Migrate<C> = (context: C) => Promise<void>

export interface Property<C> {
    get(context: C): string
    set(context: C, v: string): void
}

function tupleOfVersion(version: string): [number, number, number] {
    const [x, y, z] = version.split(".", 3).map(v => parseInt(v))
    return [x, y, z]
}

function stringOfVersion(version: [number, number, number]): string {
    return version.join(".")
}

function compareVersionTuple(a: [number, number, number], b: [number, number, number]): number {
    for(let i = 0; i < 3; ++i) {
        if(a[i] < b[i]) return -1
        else if(a[i] > b[i]) return 1
    }
    return 0
}
