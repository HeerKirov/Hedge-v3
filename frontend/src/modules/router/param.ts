import { watch } from "vue"
import { RouteName, RouteParameter } from "./definitions"
import { useRouterManager } from "./navigator"

/**
 * 由navigator所使用的params控制器。
 */
export function useRouterParamEmitter() {
    const { paramManager } = useRouterManager()

    return {
        emit<N extends RouteName>(routeName: N, params: RouteParameter[N]["params"]) {
            paramManager.value = {routeName, params}
        }
    }
}

/**
 * 使用当前route的params参数。监听这个参数的到来并发出通知事件。
 * 这不是vue router中的params参数。这个params参数是一种事件通知机制，用来通知既定的页面初始化它的参数。
 */
export function useRouterParamEvent<N extends RouteName>(routeName: N, callback: (params: RouteParameter[N]["params"]) => void) {
    const { paramManager } = useRouterManager()
    watch(paramManager, e => {
        if(e?.routeName === routeName && e.params !== undefined) {
            callback(e.params)
            paramManager.value = null
        }
    }, {immediate: true})
}
