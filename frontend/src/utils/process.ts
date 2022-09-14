import { reactive, ref } from "vue"

/**
 * 线程睡眠一段时间。
 * @param timeMs
 */
export async function sleep(timeMs: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, timeMs))
}

/**
 * 一个可监听的触发器。其本身的值没有意义，存在意义是通过响应系统触发监听。它是用reactive实现的。
 */
export function useTrigger() {
    const trigger = reactive({
        value: 0,
        trigger() {
            trigger.value += 1
        }
    })

    return trigger
}

/**
 * 一个可监听的触发器。其本身的值没有意义，存在意义是通过响应系统触发监听。它是用Ref实现的。
 */
export function useRefTrigger() {
    const value = ref(0)
    const trigger = () => value.value += 1

    return {value, trigger}
}

export interface RestrictOptions {
    /**
     * 限制最小调用间隔。
     */
    interval?: number
    /**
     * 提供额外的调用条件。条件为true时才能调用。
     */
    condition?(): boolean
    /**
     * 直接提供调用函数。
     */
    func?: Function
}

/**
 * 节流器。只能用于无返回值的调用。在一段时间内，重复调用是无效的。
 */
export function restrict(options?: number | RestrictOptions): (func?: Function) => void {
    const interval = typeof options === "number" ? options : options?.interval ?? 0
    const condition = typeof options === "object" ? options.condition : null
    const func = typeof options === "object" ? options.func : null

    let lastCall: number | null = null

    return function (tempFunc?: Function) {
        const now = Date.now()
        if((lastCall === null || now - lastCall >= interval) && (condition?.() ?? true)) {
            lastCall = now
            func?.()
            tempFunc?.()
        }
    }
}
