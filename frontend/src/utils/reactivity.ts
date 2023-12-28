import { computed, inject, InjectionKey, isRef, provide, Ref, ref, reactive, watch, watchEffect, toRef as originToRef, WatchSource } from "vue"

/**
 * 执行computed计算，产生一个ref，它的值会随watch源的变动而重新计算，但它也能被修改。
 */
export function computedMutable<T>(call: (oldValue: T | undefined) => T): Ref<T> {
    //使用一个非响应式的变量来记录并传入旧值，防止data自身改变时也触发computed过程
    let oldValue: T | undefined = undefined
    const data = <Ref<T | undefined>>ref(undefined)
    watchEffect(() => {
        oldValue = call(oldValue)
        data.value = oldValue
    })
    return data as Ref<T>
}

/**
 * 执行computed计算，产生一个ref，它的值会随watch源的变动而重新计算。与另一个函数相比，它使用watch，有明确的watch源。
 */
export function computedWatchMutable<T, W extends object>(watcher: W, call: (oldValue: T | undefined) => T): Ref<T> {
    let oldValue: T | undefined = undefined
    const data = <Ref<T>>ref(call(oldValue))
    watch(watcher, () => {
        oldValue = call(oldValue)
        data.value = oldValue
    })
    return data
}

/**
 * 执行computed计算，使用watch实现，有明确watch源。与computed相比，它的响应性更固定，只会在return value确定变化时才更新下游 (这种确定性遵循EQUAL判断，只适用原生类型和引用)。
 */
export function computedWatch<T, W>(watcher: WatchSource<W>, call: (w: W) => T): Readonly<Ref<T>> {
    const data = <Ref<T>>ref()
    watch(watcher, (value) => {
        data.value = call(value)
    }, {immediate: true})
    return data
}

/**
 * 执行computed计算，使用watchEffect实现，没有明确watch源。与computed相比，它的响应性更固定，只会在return value确定变化时才更新下游 (这种确定性遵循EQUAL判断，只适用原生类型和引用)。
 */
export function computedEffect<T>(call: () => T): Readonly<Ref<T>> {
    const data = <Ref<T>>ref()
    watchEffect(() => {
        data.value = call()
    })
    return data
}

/**
 * 执行computed计算，且计算值异步产生。
 */
export function computedAsync<T>(initValue: T, call: () => Promise<T>): Readonly<Ref<T>> {
    const data = <Ref<T>>ref(initValue)

    watchEffect(async () => data.value = await call())

    return data
}

/**
 * 扩展toRef，允许作为原型的Ref的value为null或undefined，并在此时返回undefined/使设置值操作无效。
 */
export function toRefNullable<T extends object, K extends keyof T>(ref: Ref<T | null | undefined>, key: K): Ref<T[K] | undefined>
export function toRefNullable<T extends object, K extends keyof T>(ref: Ref<T | null | undefined>, key: K, defaultValue: T[K]): Ref<T[K]>
export function toRefNullable<T extends object, K extends keyof T>(ref: Ref<T | null | undefined>, key: K, defaultValue?: T[K]): Ref<T[K] | undefined> {
    return computed({
        get: () => ref.value?.[key] ?? defaultValue,
        set(value) {
            const v = ref.value
            if(value !== undefined && v !== null && v !== undefined) {
                v[key] = value
                ref.value = v
            }
        }
    })
}

/**
 * 扩展toRef，允许从Ref类型toRef。
 */
export function toRef<T extends object, K extends keyof T>(ref: Ref<T> | T, key: K): Ref<T[K]> {
    if(isRef(ref)) {
        return computed({
            get: () => ref.value[key],
            set(value) {
                const v = ref.value
                v[key] = value
                ref.value = v
            }
        })
    }else{
        return originToRef(ref, key)
    }
}

/**
 * 将Ref反过来生成成为reactive的变换。
 * 变换要求Ref的类型必须是array。同时，这种变换是单向的，对reactive的修改不会影响到ref。
 * 实质上是创建了一个watch代理。
 */
export function toReactiveArray<T>(ref: Ref<T[]>): T[] {
    const ret = reactive(ref.value) as any as T[]

    watch(ref, value => ret.splice(0, ret.length, ...value))

    return ret
}

/**
 * 产生依赖注入机制中的install函数和use函数。
 * 该方法的产物需要在上游install，并在下游调用use使用注入结果。
 */
export function installation<F extends (...args: any[]) => any>(func: F, defaultValue?: () => any) {
    type P = Parameters<typeof func>
    type R = ReturnType<typeof func>

    const injection: InjectionKey<R> = Symbol()

    const install = (...args: P) => {
        const d = func(...args)
        provide(injection, d)
        return d
    }

    const use = () => defaultValue ? inject(injection, defaultValue, true)!! : inject(injection)!!

    return [install, use] as [(...args: P) => R, () => R]
}

/**
 * 产生依赖注入机制中的install函数和use函数。
 * 该方法的use函数的结果是可选的，也就是说它接受上游未注入的情况。
 */
export function installationNullable<F extends (...args: any[]) => any>(func: F) {
    type P = Parameters<typeof func>
    type R = ReturnType<typeof func>

    const injection: InjectionKey<R> = Symbol()

    const install = (...args: P) => {
        const d = func(...args)
        provide(injection, d)
        return d
    }

    const use = () => inject(injection, undefined)

    return [install, use] as [(...args: P) => R, () => R | undefined]
}

/**
 * 产生简易的依赖注入机制的use函数。
 * 该方法的产物可以在任意位置use。在use时，它首先尝试提取provide的注入结果，如果没有则重新构建内容并向下注入依赖。
 */
export function optionalInstallation<F extends (...args: any[]) => any>(func: F) {
    type P = Parameters<typeof func>
    type R = ReturnType<typeof func>

    const injection: InjectionKey<R> = Symbol()

    const use = ((...args: P) => {
        function factory() {
            const d = func(...args)
            provide(injection, d)
            return d
        }

        return inject(injection, factory, true)
    }) as (...args: P) => R

    const install = ((...args: P) => {
        const d = func(...args)
        provide(injection, d)
        return d
    }) as (...args: P) => R

    return [install, use]
}
