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

export function usePath<P>(): Ref<P>
export function usePath<P, O>(from: (o: O) => P, to: (p: P) => O): Ref<P>
export function usePath<P, O>(from?: (o: O) => P, to?: (p: P) => O): Ref<P> {
    const { route } = useTabRoute()

    if(from && to) {
        const data: Ref<O> = ref(route.value.path as any)

        watch(() => route.value.path, newPath => { if(newPath !== data.value) data.value = newPath as O }, {immediate: true, deep: true})

        return computed({
            get: () => from(data.value),
            set: value => route.value.path = data.value = to(value)
        })
    }else{
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