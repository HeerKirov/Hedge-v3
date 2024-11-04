import { ComponentPublicInstance, onMounted, onUnmounted, ref, Ref, watch } from "vue"
import { sleep } from "@/utils/process"

/**
 * 提供一个observer，监视一个Element的Resize事件。
 * @param elementRef 引用此Element的ref
 * @param event 事件
 * @param options immediate: 挂载时立刻触发回调
 */
export function onElementResize<NULLABLE extends Readonly<boolean> = false>(elementRef: Ref<HTMLElement | undefined>, event: (rect: NULLABLE extends true ? DOMRect | undefined : DOMRect, element: NULLABLE extends true ? HTMLElement | undefined : HTMLElement) => void, options?: {immediate?: boolean, nullable?: NULLABLE}) {
    let element: HTMLElement | undefined = undefined
    let skipFirst = options?.immediate ?? false
    const observer = new ResizeObserver(entries => {
        if(skipFirst) event(entries[0].contentRect, element!)
        else skipFirst = true
    })

    onMounted(() => {
        if(elementRef.value) observer.observe(element = elementRef.value)
    })

    onUnmounted(() => {
        if(element) {
            observer.unobserve(element)
            if(options?.nullable) event(undefined as any, undefined as any)
        }
    })

    watch(elementRef, v => {
        if(element) observer.unobserve(element)
        if((element = v) != undefined) observer.observe(element)
        else if(options?.nullable) event(undefined as any, undefined as any)
    })
}

/**
 * 注册一个监听事件，监听点击目标元素以外的元素的事件。
 * @param refs 监听点击此目标以外的元素
 * @param event 事件
 */
export function onOutsideClick(refs: Ref<HTMLElement | ComponentPublicInstance | undefined> | Ref<HTMLElement | ComponentPublicInstance | undefined>[], event: (e: MouseEvent) => void) {
    onMounted(async() => {
        //tips: 一个magic用法：如果某个click事件造成了此VCA挂载，但click target又不属于ref，那这次click事件仍会传递至本次click事件中。
        //      因此，制造一个微小的延迟，造成事实上的异步，使挂载click事件晚于可能的触发事件
        await sleep(1)
        document.addEventListener("click", clickDocument)
        document.addEventListener("mousedown", mouseDownDocument)
    })

    onUnmounted(() => {
        document.removeEventListener("click", clickDocument)
        document.removeEventListener("mousedown", mouseDownDocument)
    })

    if(refs instanceof Array) {
        for(const r of refs) {
            watch(r, (div, o) => {
                if(o) {
                    (o instanceof HTMLElement ? o : o.$el).removeEventListener("click", clickRef)
                }
                if(div) {
                    (div instanceof HTMLElement ? div : div.$el).addEventListener("click", clickRef)
                }
            }, {immediate: true})
        }
    }else{
        watch(refs, (div, o) => {
            if(o) {
                (o instanceof HTMLElement ? o : o.$el).removeEventListener("click", clickRef)
            }
            if(div) {
                (div instanceof HTMLElement ? div : div.$el).addEventListener("click", clickRef)
            }
        }, {immediate: true})
    }

    let clickEventBuffer: MouseEvent | null = null
    let mouseDownTarget: EventTarget | null = null

    const clickRef = async (e: MouseEvent) => {
        // tips: 如果某个click事件造成了点击元素被卸载，但点击元素又属于此ref，那这次click事件会被判定为outside，造成意外。
        //      对此，需要一个办法，排除从点击元素发生的click事件引发的此类情况。
        //      这里采用的方案是再直接监听ref DOM的click事件。只要此事件接收了Event，就将其记录下来，并在之后的document click事件中忽略此Event。
        //      为此还要避免Event经过ref DOM但中途被拦截没有传到document的情况，因此需要在短暂的异步后，自行清除此值。
        clickEventBuffer = e
        await sleep(1)
        clickEventBuffer = null
    }

    const mouseDownDocument = (e: MouseEvent) => {
        mouseDownTarget = e.target
    }

    const clickDocument = refs instanceof Array ? (e: MouseEvent) => {
        if(clickEventBuffer === e) {
            clickEventBuffer = null
            return
        }
        const target = mouseDownTarget ?? e.target
        if(mouseDownTarget) mouseDownTarget = null
        for(const r of refs) {
            if(r.value && !(r.value === target || (r.value instanceof HTMLElement ? r.value : r.value.$el).contains(target as Node))) {
                event(e)
                break
            }
        }
    } : (e: MouseEvent) => {
        if(clickEventBuffer === e) {
            clickEventBuffer = null
            return
        }
        const target = mouseDownTarget ?? e.target
        if(mouseDownTarget) mouseDownTarget = null
        if(refs.value && !(refs.value === target || (refs.value instanceof HTMLElement ? refs.value : refs.value.$el).contains(target as Node))) {
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
 * @param elementRef
 * @param options immediate: 挂载时立刻获得数据；fixed: 获得元素的fixed绝对定位位置
 */
export function useElementRect(elementRef: Ref<HTMLElement | undefined>, options?: {immediate?: boolean, fixed?: boolean}) {
    const rect = ref<DOMRect>()

    onElementResize(elementRef, (value, element) => {
        rect.value = options?.fixed ? element?.getBoundingClientRect() : value
    }, {nullable: true, ...options})

    return rect
}