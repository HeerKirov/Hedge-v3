import { computed, onMounted, ref, watch } from "vue"
import { onElementResize } from "@/utils/sensors"
import { optionalInstallation } from "@/utils/reactivity"
import { useRefEmitter } from "@/utils/emitter"
import style from "./style.module.sass"

export function useVirtualViewContext(optionPadding: Padding | number) {
    const { padding, paddingStyle } = getPaddingProperties(optionPadding)

    const { navigateEvent } = useVirtualViewNavigationConsumer()

    const scrollDivRef = ref<HTMLElement>()

    //当前视口区域的滚动量、高度和总滚动区域的高度，以及实际数据区域的高度和滚动量。
    const scrollState = ref<ScrollState>({totalHeight: null, contentWidth: null, top: null, height: null, actualTop: 0, actualHeight: 0})

    //底层事件: 发生滚动事件时重新计算滚动位置
    const onScroll = (e: Event) => {
        const target = e.target as HTMLElement
        scrollState.value.top = target.scrollTop
        scrollState.value.height = target.clientHeight
    }

    //底层事件: 区域大小改变时重新计算滚动位置
    onElementResize(scrollDivRef, (_, el) => {
        scrollState.value.top = el.scrollTop
        scrollState.value.height = el.clientHeight
        scrollState.value.contentWidth = el.clientWidth - padding.left - padding.right
    })

    //底层事件：挂载，初始化
    onMounted(() => {
        if(scrollDivRef.value !== undefined) {
            if(scrollState.value.top === null || scrollState.value.height === null) {
                scrollState.value.top = scrollDivRef.value.scrollTop
                scrollState.value.height = scrollDivRef.value.clientHeight
            }
            scrollState.value.contentWidth = scrollDivRef.value.clientWidth - padding.left - padding.right
        }

        watch(() => scrollState.value.top, top => {
            if(top !== null && scrollDivRef.value && top !== scrollDivRef.value.scrollTop) {
                scrollDivRef.value.scrollTo({top, behavior: "auto"})
                if(top !== scrollDivRef.value.scrollTop) {
                    scrollState.value.top = scrollDivRef.value.scrollTop
                }
            }
        }, {immediate: true})
    })

    const actualOffsetStyle = computed(() => {
        return ({
            height: `${scrollState.value.actualHeight.toFixed(3)}px`,
            paddingTop: `${scrollState.value.actualTop.toFixed(3)}px`,
            paddingBottom: scrollState.value.totalHeight && scrollState.value.height && scrollState.value.totalHeight >= scrollState.value.height ? `${(scrollState.value.totalHeight - scrollState.value.actualTop - scrollState.value.actualHeight).toFixed(3)}px` : "0px"
        })
    })

    const scrollDivStyle = computed(() => ({
        ...paddingStyle,
        "--scroll-content-height": actualOffsetStyle.value.height,
        "--scroll-content-padding-top": actualOffsetStyle.value.paddingTop,
        "--scroll-content-padding-bottom": actualOffsetStyle.value.paddingBottom,
    }))

    const bindDiv = () => ({
        ref: scrollDivRef,
        class: style.scrollList,
        style: scrollDivStyle.value,
        onScroll
    })

    return {scrollState, bindDiv, navigateEvent}
}

export const [useVirtualViewNavigation, useVirtualViewNavigationConsumer] = optionalInstallation(function () {
    const navigateEvent = useRefEmitter<number>()
    return {navigateEvent}
})

/**
 * 根据给出的padding值，计算最终的padding值，并获得padding style。
 */
function getPaddingProperties(originPaddingValue: Padding | number) {
    const padding = {
        top: typeof originPaddingValue === "number" ? originPaddingValue : originPaddingValue?.top ?? 0,
        bottom: typeof originPaddingValue === "number" ? originPaddingValue : originPaddingValue?.bottom ?? 0,
        left: typeof originPaddingValue === "number" ? originPaddingValue : originPaddingValue?.left ?? 0,
        right: typeof originPaddingValue === "number" ? originPaddingValue : originPaddingValue?.right ?? 0
    }
    const paddingStyle = {
        paddingTop: `${padding.top ?? 0}px`,
        paddingBottom: `${padding.bottom ?? 0}px`,
        paddingLeft: `${padding.left ?? 0}px`,
        paddingRight: `${padding.right ?? 0}px`,
    }
    return {padding, paddingStyle}
}

/**
 * 计划的padding属性值。
 */
export interface Padding {
    top?: number
    bottom?: number
    left?: number
    right?: number
}

interface ScrollState {
    /**
     * 根据所有数据计算的总高度。
     */
    totalHeight: number | null
    /**
     * 视口的宽度。在挂载之后才会有数据。
     */
    contentWidth: number | null
    /**
     * 视口的滚动量。
     */
    top: number | null
    /**
     * 视口的高度。
     */
    height: number | null
    /**
     * 实际数据区域的滚动量。
     */
    actualTop: number
    /**
     * 实际数据区域的高度。
     */
    actualHeight: number
}
