import { ComponentPublicInstance, computed, onBeforeUnmount, onUnmounted, ref } from "vue"
import { useLocalStorage } from "@/functions/app"
import { usePostFetchHelper } from "@/functions/fetch"
import { useHomepageState } from "@/services/main/homepage"
import { toRef } from "@/utils/reactivity"
import { onOutsideClick } from "@/utils/sensors"

export function useButtonContext() {
    const { backgroundTasks } = useHomepageState()

    const backgroundTaskCount = computed(() => backgroundTasks.value?.filter(i => i.currentValue < i.maxValue).length ?? 0)

    const visible = ref(false)

    const divRef = ref<HTMLElement>()
    const calloutRef = ref<ComponentPublicInstance>()

    onOutsideClick([divRef, calloutRef], () => {
        if(visible.value) {
            visible.value = false
        }
    })

    return {divRef, calloutRef, visible, backgroundTaskCount}
}

export function useCalloutContext() {
    const maxWidth = 600
    const minWidth = 200
    const maxHeight = 600
    const minHeight = 200
    const defaultWidth = 300
    const defaultHeight = 250
    const attachRange = 10
    const localStorage = useLocalStorage<{size: {width: number, height: number}}>("background-task/callout", () => ({size: {width: defaultWidth, height: defaultHeight}}), true)

    const calloutSize = toRef(localStorage, "size")

    const areaRef = ref<ComponentPublicInstance>()

    const resizing = ref<"top" | "right" | "top-right" | null>(null)

    const resizeAreaMouseDown = (type: "top" | "right" | "top-right") => {
        resizing.value = type
        document.addEventListener('mousemove', mouseMove)
        document.addEventListener('mouseup', mouseUp)
    }

    const mouseMove = (e: MouseEvent) => {
        if(areaRef.value) {
            const el: HTMLElement = areaRef.value.$el
            if(resizing.value === "right" || resizing.value === "top-right") {
                const newWidth = e.pageX - el.getBoundingClientRect().left
                calloutSize.value.width
                    = newWidth > maxWidth ? maxWidth
                    : newWidth < minWidth ? minWidth
                    : Math.abs(newWidth - defaultWidth) <= attachRange ? defaultWidth
                    : newWidth
            }

            if(resizing.value === "top" || resizing.value === "top-right") {
                const newHeight = el.getBoundingClientRect().top + el.clientHeight - e.pageY
                calloutSize.value.height
                    = newHeight > maxHeight ? maxHeight
                    : newHeight < minHeight ? minHeight
                    : Math.abs(newHeight - defaultHeight) <= attachRange ? defaultHeight
                    : newHeight
            }
        }
    }

    const mouseUp = () => {
        resizing.value = null
        document.removeEventListener('mousemove', mouseMove)
        document.removeEventListener('mouseup', mouseUp)
    }

    onUnmounted(() => {
        resizing.value = null
        document.removeEventListener('mousemove', mouseMove)
        document.removeEventListener('mouseup', mouseUp)
    })

    return {calloutSize, areaRef, resizeAreaMouseDown, resizing}
}

export function useDataContext() {
    const { backgroundTasks } = useHomepageState()

    const fetchCleanCompleted = usePostFetchHelper(client => client.homepage.cleanCompletedBackgroundTasks)

    onBeforeUnmount(() => {
        //在关闭弹窗时，清理已完成的项
        if(backgroundTasks.value?.length) {
            backgroundTasks.value = backgroundTasks.value.filter(t => t.currentValue < t.maxValue)
            fetchCleanCompleted(undefined).finally()
        }
    })

    return {backgroundTasks}
}