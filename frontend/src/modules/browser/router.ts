import { computed, onMounted, ref, Ref, watch } from "vue"
import { useTabRoute } from "./api"

export function useParam<P>(paramName: string): Ref<P | null> {
    const { route } = useTabRoute()

    const data: Ref<P | null> = ref(null)

    watch(() => route.value.params[paramName], (newData = null) => {if(newData !== data.value) data.value = newData}, {immediate: true, deep: true})

    return computed({
        get: () => data.value,
        set: value => {
            data.value = value
            route.value.params[paramName] = value
        }
    })
}

export function usePath<P>(): Ref<P> {
    const { route } = useTabRoute()

    const data: Ref<P> = ref(route.value.path as any)

    watch(() => route.value.path, newPath => { if(newPath !== data.value) data.value = newPath as P }, {immediate: true, deep: true})

    return computed({
        get: () => data.value,
        set: value => {
            data.value = value
            route.value.path = value
        }
    })
}

export function useInitializer(callback: (params: Record<string, any>) => void, option?: {mounted?: boolean}) {
    const { route } = useTabRoute()

    const startWatch = () => watch(() => route.value.initializer, e => {
        if(Object.keys(e).length > 0) {
            callback(e)
            route.value.initializer = {}
        }
    }, {immediate: true})

    if(option?.mounted) { onMounted(startWatch) }else{ startWatch() }
}