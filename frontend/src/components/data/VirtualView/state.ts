import { reactive } from "vue"
import { optionalInstallation } from "@/utils/reactivity"
import { SendRefEmitter, useRefEmitter } from "@/utils/emitter"

/**
 * 虚拟数据视图的导航控制器。它提供一组有关当前导航位置的数据，并提供一个“导航到指定位置”的方法。
 */
export interface VirtualViewNavigation {
    state: Readonly<ScrollState>
    navigateTo(itemOffset: number): void
}

interface VirtualViewNavigationConsumer {
    state: ScrollState
    navigateTo(itemOffset: number): void
    navigateEvent: SendRefEmitter<number>
}

interface ScrollState {
    /**
     * 滚动条的当前偏移位置。
     */
    scrollTop: number
    /**
     * 滚动条的高度。它相当于content区域的高度-屏幕高度。滚动位置和高度可以计算出滚动条的滚动百分比。
     */
    scrollHeight: number
    /**
     * 当前显示区域中的第一个数据项的offset。可以用作数值导航。以第一个中轴线位于显示区域内的项为准。
     */
    itemOffset: number
    /**
     * 当前显示区域一共显示了多少个数据项。从offset的项开始，到最后一个中轴线位于显示区域内的项结束。
     */
    itemLimit: number
    /**
     * 当前的数据项总数量。
     */
    itemTotal: number | undefined
}

const [installVirtualViewNavigationConsumer, useVirtualViewNavigationConsumer] = optionalInstallation(function (): VirtualViewNavigationConsumer {
    const navigateEvent = useRefEmitter<number>()
    return {
        state: reactive({
            scrollTop: 0,
            scrollHeight: 0,
            itemOffset: 0,
            itemLimit: 0,
            itemTotal: undefined
        }),
        navigateTo(itemOffset) {
            navigateEvent.emit(itemOffset)
        },
        navigateEvent
    }
})

export { useVirtualViewNavigationConsumer }

export const installVirtualViewNavigation: () => VirtualViewNavigation = installVirtualViewNavigationConsumer

export const useVirtualViewNavigation: () => VirtualViewNavigation = useVirtualViewNavigationConsumer
