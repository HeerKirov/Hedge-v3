import { Ref, ref } from "vue"
import { Rect, Position } from "@/components/interaction"
import { installation } from "@/utils/reactivity"
import { sleep } from "@/utils/process"
import { MetaTagProps } from "./MetaTagCallout/context"

export const SERVICE_CONF: Record<ServiceContext["callout"] | "default", ServiceConf> = {
    metaTag: {width: 350},
    default: {alignOffset: 16, directionOffset: 32, directionOffsetMin: 16, position: "right-top"}
}

type ServiceContext
    = MetaTagProps

export interface CalloutService {
    show(context: ServiceContext): void
    close(): void
}

interface InternalCalloutService extends CalloutService {
    context: Ref<ServiceContext | null>
}

export const [installInternalService, useInternalService] = installation(function (): InternalCalloutService {
    const context = ref<ServiceContext | null>(null)

    let awaitOpen = false

    const show = async (newCtx: ServiceContext) => {
        //tips: 点击按钮时，由于事件传导顺序，close会被open先触发，因此使open延迟生效
        //使用一个标记，在标记生效期间告知close事件，接下来有新的open，因此不必close。这样可以抹消点击后的闪烁
        awaitOpen = true
        await sleep(1)
        awaitOpen = false
        context.value = newCtx
    }

    const close = () => {
        if(!awaitOpen) {
            context.value = null
        }
    }

    return {context, show, close}
})

export const installCalloutService: () => CalloutService = installInternalService
export const useCalloutService: () => CalloutService = useInternalService

export interface ServiceBaseType<TYPE extends string> {
    base: Rect
    callout: TYPE
}

export interface ServiceConf {
    width?: number
    height?: number
    position?: Position
    alignOffset?: number
    directionOffset?: number
    directionOffsetMin?: number
}
