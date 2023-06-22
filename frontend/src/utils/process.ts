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

export interface ThrottleOptions {
    /**
     * 限制最小调用间隔。
     */
    interval?: number
    /**
     * 在限制调用期间内调用，依然会重置时间点，也就是恢复可调用的时间点被重置。
     */
    resetInInterval?: boolean
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
 * 阻止式重复调用限流器。在调用之后的一段时间内，重复调用是无效的。
 */
export function throttle(options?: number | ThrottleOptions): (func?: Function) => void {
    const interval = typeof options === "number" ? options : options?.interval ?? 0
    const condition = typeof options === "object" ? options.condition : null
    const func = typeof options === "object" ? options.func : null
    const resetInInterval = typeof options === "object" ? options.resetInInterval ?? false : false

    let lastCall: number | null = null

    return function (tempFunc?: Function) {
        const now = Date.now()
        if((lastCall === null || now - lastCall >= interval) && (condition?.() ?? true)) {
            lastCall = now
            func?.()
            tempFunc?.()
        }else if(resetInInterval) {
            lastCall = now
        }
    }
}

export interface HoardOptions<P> {
    /**
     * 收集调用的时间间隔。
     */
    interval: number
    /**
     * 在收集到一次调用后，可以延长一点收集时间。建议搭配maxInterval使用。
     */
    lengthenInterval?: number
    /**
     * 最大所允许的时间间隔。
     */
    maxInterval?: number
    /**
     * 直接提供调用函数。
     */
    func: (args: P[]) => void
}

/**
 * 囤积式重复调用限流器。收集一段时间内的所有调用，之后合并为一个调用一同发出。
 */
export function hoard(options: HoardOptions<unknown>): () => void
export function hoard<P>(options: HoardOptions<P>): (arg: P) => void
export function hoard<P>(options: HoardOptions<P>) {
    let data: {startTime: number, currentInterval: number, timer: NodeJS.Timeout} | null = null
    let args: P[] = []

    function gameover() {
        const callArgs = args
        data = null
        args = []
        options.func(callArgs)
    }

    return function(arg: P) {
        args.push(arg)
        if(data === null) {
            data = {
                startTime: Date.now(),
                currentInterval: options.interval,
                timer: setTimeout(gameover, options.interval)
            }
        }else if(options.lengthenInterval !== undefined) {
            //首先计算新interval，使其不会超出maxInterval，且确保新interval更大时，继续执行
            const newInterval = options.maxInterval !== undefined ? Math.min(options.maxInterval, data.currentInterval + options.lengthenInterval) : data.currentInterval + options.lengthenInterval
            if(newInterval > data.currentInterval) {
                const now = Date.now()
                //将now减去startTime得到此次档期已经经过的时间，用newInterval减去此值，得到新Timeout的所需延时
                const ms = newInterval - (now - data.startTime)
                clearTimeout(data.timer)
                data = {
                    startTime: data.startTime,
                    currentInterval: newInterval,
                    timer: setTimeout(gameover, ms > 0 ? ms : 0)
                }
            }
        }
    }
}