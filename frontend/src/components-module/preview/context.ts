import { shallowRef } from "vue"
import { sleep } from "@/utils/process"
import { installation } from "@/utils/reactivity"
import { ImageProps } from "./ImagePreview/context"

type ServiceContext = ImageProps

export interface PreviewService {
    show(ctx: ServiceContext): void
    close(): void
}

export const [installInternalService, useInternalService] = installation(function() {
    const context = shallowRef<ServiceContext | null>(null)

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

    return {show, close, context}
})

export const installEmbedPreviewService: () => PreviewService = installInternalService
export const installPreviewService: () => PreviewService = installInternalService
export const usePreviewService: () => PreviewService = useInternalService

export interface ServiceBaseType<TYPE extends string> {
    preview: TYPE
}

export type Push = (newCtx: ServiceContext) => void