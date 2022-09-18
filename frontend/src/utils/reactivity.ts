import { computed, inject, InjectionKey, isRef, provide, Ref, ref, reactive, watch, watchEffect, toRef as originToRef } from "vue"

/**
 * 执行computed计算，产生一个ref，它的值会随watch源的变动而重新计算，但它也能被修改。
 */
export function computedMutable<T>(call: () => T): Ref<T> {
    const data = <Ref<T>>ref(call())
    watchEffect(() => data.value = call())
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
