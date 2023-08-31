import { onMounted, onUnmounted, ref, Ref, watch } from "vue"
import { sleep } from "@/utils/process"

/**
 * 提供一个observer，监视一个Element的Resize事件。
 * @param elementRef 引用此Element的ref
 * @param event 事件
 */
export function onElementResize(elementRef: Ref<HTMLElement | undefined>, event: (rect: DOMRect) => void) {
    let element: HTMLElement | undefined = undefined
    const observer = new ResizeObserver(entries => event(entries[0].contentRect))

    onMounted(() => {
        if(elementRef.value) observer.observe(element = elementRef.value)
    })

    onUnmounted(() => {
        if(element) observer.unobserve(element)
    })

    watch(elementRef, v => {
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
        //tips: 一个magic用法：如果某个click事件造成了此VCA挂载，但click target又不属于ref，那这次click事件仍会传递至本次click事件中。
        //      因此，制造一个微小的延迟，造成事实上的异步，使挂载click事件晚于可能的触发事件
        await sleep(1)
        document.addEventListener("click", clickDocument)
    })

    onUnmounted(() => {
        document.removeEventListener("click", clickDocument)
    })

    watch(ref, (div, o) => {
        if(o) {
            o.removeEventListener("click", clickRef)
        }
        if(div) {
            div.addEventListener("click", clickRef)
        }
    }, {immediate: true})

    let clickEventBuffer: MouseEvent | null = null

    const clickRef = async (e: MouseEvent) => {
        // tips: 如果某个click事件造成了点击元素被卸载，但点击元素又属于此ref，那这次click事件会被判定为outside，造成意外。
        //      对此，需要一个办法，排除从点击元素发生的click事件引发的此类情况。
        //      这里采用的方案是再直接监听ref DOM的click事件。只要此事件接收了Event，就将其记录下来，并在之后的document click事件中忽略此Event。
        //      为此还要避免Event经过ref DOM但中途被拦截没有传到document的情况，因此需要在短暂的异步后，自行清除此值。
        clickEventBuffer = e
        await sleep(1)
        clickEventBuffer = null
    }

    const clickDocument = (e: MouseEvent) => {
        if(clickEventBuffer === e) {
            clickEventBuffer = null
            return
        }
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

/**
 * 提供一个通过鼠标拖曳改变区域宽度的机制。该机制依赖于一块独立的HTML元素，通过托放这块元素来改变大小。
 */
export function useResizeBar(options: {areaRef: Ref<HTMLElement | undefined>, location: "left" | "right", width: Ref<number>, defaultWidth: number, maxWidth: number, minWidth: number, attachRange: number}) {
    const { defaultWidth, maxWidth, minWidth, attachRange, areaRef, location, width } = options

    const resizeAreaMouseDown = () => {
        document.addEventListener("mousemove", mouseMove)
        document.addEventListener("mouseup", mouseUp)
    }

    const mouseMove = location === "left" ? (e: MouseEvent) => {
        if(areaRef.value) {
            const newWidth = areaRef.value.getBoundingClientRect().left + areaRef.value.clientWidth - e.pageX
            width.value
                = newWidth > maxWidth ? maxWidth
                : newWidth < minWidth ? minWidth
                : Math.abs(newWidth - defaultWidth) <= attachRange ? defaultWidth
                : newWidth
        }
    } : (e: MouseEvent) => {
        if(areaRef.value) {
            const newWidth = e.pageX - areaRef.value.getBoundingClientRect().left
            width.value
                = newWidth > maxWidth ? maxWidth
                : newWidth < minWidth ? minWidth
                : Math.abs(newWidth - defaultWidth) <= attachRange ? defaultWidth
                : newWidth
        }
    }

    const mouseUp = () => {
        document.removeEventListener("mousemove", mouseMove)
        document.removeEventListener("mouseup", mouseUp)
    }

    onUnmounted(() => {
        document.removeEventListener("mousemove", mouseMove)
        document.removeEventListener("mouseup", mouseUp)
    })

    return {resizeAreaMouseDown}
}

/**
 * 获得窗口尺寸的响应式数据。
 */
export function useWindowSize() {
    const windowSize = ref({height: window.innerHeight, width: window.innerWidth})
    
    const windowResized = () => {
        windowSize.value = {height: window.innerHeight, width: window.innerWidth}
    }

    onMounted(() => {
        window.addEventListener("resize", windowResized)
    })

    onUnmounted(() => {
        window.removeEventListener("resize", windowResized)
    })

    return windowSize
}

/**
 * 获得元素尺寸和方位的响应式数据。
 */
export function useElementRect(elementRef: Ref<HTMLElement | undefined>) {
    const rect = ref<DOMRect>()

    onMounted(() => {
        if(elementRef.value) {
            rect.value = elementRef.value.getBoundingClientRect()
        }
    })

    watch(elementRef, ele => {
        rect.value = ele?.getBoundingClientRect()
    })

    onElementResize(elementRef, value => {
        rect.value = value
    })

    return rect
}