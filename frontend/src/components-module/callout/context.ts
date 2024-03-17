import { Ref, ref } from "vue"
import { Rect, Position } from "@/components/interaction"
import { installation } from "@/utils/reactivity"
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

    let lastTime: number = 0
    let oneClickTimer: NodeJS.Timeout | null = null

    const show = (newCtx: ServiceContext) => {
        if(oneClickTimer !== null) {
            clearTimeout(oneClickTimer)
            oneClickTimer = null
        }else{
            const now = Date.now()
            //这里的时间是要加上第一次缓冲的时间，因为lastTime是从首次点击开始计算的
            if(now - lastTime < 250) {
                context.value = null
                lastTime = Date.now()
            }else{
                lastTime = Date.now()
                oneClickTimer = setTimeout(() => {
                    oneClickTimer = null
                    context.value = newCtx
                }, 150)
            }
        }
    }

    const close = () => { context.value = null }

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
