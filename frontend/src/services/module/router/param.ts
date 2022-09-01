import { ref, watch } from "vue"
import { installation } from "@/utils/reactivity"
import { RouteName, RouteParameter } from "./definitions"

const [installRouterParamManager, useParamManager] = installation(function () {
    return ref<{routeName: RouteName, params: any} | null>(null)
})

export { installRouterParamManager }

/**
 * 由navigator所使用的params控制器。
 */
export function useRouterParamEmitter() {
    const content = useParamManager()

    return {
        emit<N extends RouteName>(routeName: N, params: RouteParameter[N]["params"]) {
            content.value = {routeName, params}
        }
    }
}

/**
 * 使用当前route的params参数。监听这个参数的到来并发出通知事件。
 * 这不是vue router中的params参数。这个params参数是一种事件通知机制，用来通知既定的页面初始化它的参数。
 */
export function useRouterParamEvent<N extends RouteName>(routeName: N, callback: (params: RouteParameter[N]["params"]) => void) {
    const content = useParamManager()
    watch(content, e => {
        if(e?.routeName === routeName && e.params !== undefined) {
            callback(e.params)
            content.value = null
        }
    }, {immediate: true})
}
