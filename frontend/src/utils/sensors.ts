import { onMounted, onUnmounted, ref, Ref, watch } from "vue"
import { sleep } from "@/utils/process"

/**
 * 提供一个observer，监视一个Element的Resize事件。
 * @param ref 引用此Element的ref
 * @param event 事件
 */
export function onElementResize(ref: Ref<HTMLElement | undefined>, event: (rect: DOMRect) => void) {
    let element: HTMLElement | undefined = undefined
    const observer = new ResizeObserver(entries => event(entries[0].contentRect))

    onMounted(() => {
        if(ref.value) observer.observe(element = ref.value)
    })

    onUnmounted(() => {
        if(element) observer.unobserve(element)
    })

    watch(ref, v => {
        if(element) observer.unobserve(element)
        if((element = v) != undefined) observer.observe(element)
    })
}

/**
 * 注册一个监听事件，监听点击目标元素以外的元素的事件。
 * @param ref 监听点击此目标以外的元素
 * @param event 事件
 */
export function onOutsideClick(ref: Ref<HTMLElement | undefined>, event: (e: MouseEvent) => void) {
    onMounted(async() => {
        //tips: 一个magic用法：如果某个click事件造成了此VCA挂载，但click target又不属于ref，那这次click事件仍会传递至本次click事件中
        //      因此，制造一个微小的延迟，造成事实上的异步，使挂载click事件晚于可能的触发事件
        await sleep(1)
        document.addEventListener("click", clickDocument)
    })

    onUnmounted(() => {
        document.removeEventListener("click", clickDocument)
    })

    const clickDocument = (e: MouseEvent) => {
        const target = e.target
        if(ref.value && !(ref.value === target || ref.value.contains(target as Node))) {
            event(e)
        }
    }
}

/**
 * 提供两个事件和一个ref用于监视鼠标是否悬停在目标元素上。
 */
export function useMouseHover() {
    const hover = ref(false)

    const onMouseover = () => hover.value = true

    const onMouseleave = () => hover.value = false

    return {hover, onMouseover, onMouseleave}
}
