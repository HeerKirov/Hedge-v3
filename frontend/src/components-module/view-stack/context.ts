import { inject, InjectionKey, ref, Ref, watch } from "vue"
import { useRoute } from "vue-router"
import { installation } from "@/utils/reactivity"
import { generateOperations, StackViewInfo } from "./definition"

interface StacksContext<INFO> {
    stacks: Ref<INFO[]>
    hasRootView: Ref<boolean>
}

export interface StacksOperationContext<INFO> {
    stacks: Readonly<Ref<INFO[]>>
    hasRootView: Readonly<Ref<boolean>>
    setRootView(info: INFO): void
    push(info: INFO): void
    close(info: INFO): void
}

interface EachViewContext {
    stackIndex: number
}

interface CommonOperations {
    size(): number
    isClosable(): boolean
    closeView(): void
    closeAll(): void
}

export type ViewStacks = CommonOperations & ReturnType<typeof generateOperations>

export const [installViewStackContext, useViewStackContext] = installation(function () {
    const stacksContext: StacksContext<StackViewInfo> = {
        stacks: ref([]),
        hasRootView: ref(false)
    }

    const route = useRoute()
    watch(() => route.name, () => {
        //路由发生变化时，清空栈区
        stacksContext.stacks.value.splice(0, stacksContext.stacks.value.length)
    })

    return stacksContext
})

export function installViewStack() {
    const stacksContext = installViewStackContext()
    return createViewStacksOperations(stacksContext, undefined)
}

export function useViewStack() {
    const stacksContext = useViewStackContext()
    const eachView = inject(eachViewInjection, () => null, true)
    return createViewStacksOperations(stacksContext, eachView?.stackIndex)
}

function createViewStacksOperations(stacksContext: StacksContext<StackViewInfo>, stackIndex: number | undefined): ViewStacks {
    const stackOperationContext: StacksOperationContext<StackViewInfo> = {
        stacks: stacksContext.stacks,
        hasRootView: stacksContext.hasRootView,
        setRootView(info: StackViewInfo) {
            stacksContext.stacks.value = [info]
            stacksContext.hasRootView.value = true
        },
        push(info: StackViewInfo) {
            stacksContext.stacks.value.push(info)
        },
        close(info: StackViewInfo) {
            const index = stacksContext.stacks.value.findIndex(i => i === info)
            if(index >= 0) {
                stacksContext.stacks.value.splice(index, 1)
            }
        }
    }
    return {
        ...createCommonOperations(stacksContext, stackIndex),
        ...generateOperations(stackOperationContext)
    }
}

function createCommonOperations({ stacks, hasRootView }: StacksContext<StackViewInfo>, stackIndex: number | undefined): CommonOperations {
    return {
        size() {
            return stacks.value.length
        },
        isClosable() {
            return !hasRootView.value || stackIndex !== undefined && stackIndex > 0
        },
        closeView() {
            if(stackIndex !== undefined) {
                stacks.value.splice(stackIndex, 1)
            }else if(stacks.value.length > 0) {
                stacks.value.splice(stacks.value.length - 1, 1)
            }
        },
        closeAll() {
            stacks.value.splice(0, stacks.value.length)
        }
    }
}

export const eachViewInjection: InjectionKey<EachViewContext> = Symbol()
