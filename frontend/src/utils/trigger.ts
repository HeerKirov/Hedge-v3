import { reactive, ref } from "vue"

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
