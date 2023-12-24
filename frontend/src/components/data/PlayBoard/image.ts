import { computed, nextTick, Ref, ref, watch } from "vue"
import { numbers } from "@/utils/primitives"
import { onElementResize } from "@/utils/sensors"

export function useImagePosition(zoomValue: Ref<number>) {
    /*
     * image play board核心算法：
     * 该算法的输入为image.(width, height)属性，view.(width, height)属性，view.(scrollTop, scrollLeft)，缩放属性zoom。
     * 计算目标是计算出container容器的container.(width, height)，以及container容器的margin.(top, left)作为矫正距离，
     * 还包括view.(scrollTop, scrollLeft)，作为显示区域在变换中的矫正。
     */
    const viewRef = ref<HTMLElement>()
    const containerRef = ref<HTMLElement>()

    const view = ref<Rect | null>(null)
    const aspect = ref<number | null>(null)

    onElementResize(viewRef, rect => {
        //view的值变化/初始化。触发container重算。
        view.value = {width: rect.width, height: rect.height}
    }, {immediate: true})

    const imageLoadedEvent = async (e: Event) => {
        //图像加载完成，用natural属性计算其aspect
        const el = e.target as HTMLImageElement
        aspect.value = el.naturalHeight > 0 && el.naturalWidth > 0 ? el.naturalWidth / el.naturalHeight : null
    }

    const container = computed(() => view.value !== null && aspect.value !== null ? computeContainerProps(view.value, aspect.value, zoomValue.value) : null)

    const containerStyle = computed(() => container.value ? {
        "width": `${container.value.width}px`,
        "height": `${container.value.height}px`,
        "margin-left": `${container.value.left}px`,
        "margin-top": `${container.value.top}px`
    } : undefined)

    watch(zoomValue, async (zoom, oldZoom) => {
        if(view.value !== null && aspect.value !== null && container.value !== null && viewRef.value !== undefined) {
            const oldScroll = {top: viewRef.value.scrollTop, left: viewRef.value.scrollLeft}
            const position = computeScrollPosition(view.value, container.value, zoom, oldZoom, oldScroll)
            await nextTick()
            viewRef.value.scrollTo({...position, behavior: "auto"})
        }
    })

    return {viewRef, containerRef, containerStyle, imageLoadedEvent}
}

interface Rect { width: number, height: number }
interface Margin { top: number, left: number }

/**
 * 计算新的container的尺寸和偏移位置。
 * 当zoom或view发生变化时，应该重新计算。
 */
function computeContainerProps(view: Rect, aspect: number, zoom: number): Rect & Margin {
    const viewAspect: number = view.width / view.height
    const stdContainer: Rect
        = aspect > viewAspect ? {width: view.width, height: view.width / aspect}
        : aspect < viewAspect ? {width: view.height * aspect, height: view.height}
            : view
    const containerRect: Rect = {
        width: stdContainer.width * zoom / 100,
        height: stdContainer.height * zoom / 100
    }
    const containerMargin: Margin = {
        top: containerRect.height < view.height ? (view.height - containerRect.height) / 2 : 0,
        left: containerRect.width < view.width ? (view.width - containerRect.width) / 2 : 0
    }

    return {...containerRect, ...containerMargin}
}

/**
 * 计算新的container的滚动位置。
 * 当zoom发生变化时(container也会变化)，应该重新计算。
 * FUTURE: 这个算法似乎还有点瑕疵，需要优化。
 */
function computeScrollPosition(view: Rect, container: Rect, zoom: number, oldZoom: number, oldScroll: Margin): Margin {
    const zoomAspect: number = zoom / oldZoom
    const oldDelta: Margin = {
        top: oldScroll.top + view.height / 2,
        left: oldScroll.left + view.width / 2
    }
    const delta: Margin = {
        top: zoomAspect * oldDelta.top,
        left: zoomAspect * oldDelta.left
    }

    return {
        top: numbers.between(0, delta.top - view.height / 2, container.height - view.height),
        left: numbers.between(0, delta.left - view.width / 2, container.width - view.width)
    }
}
