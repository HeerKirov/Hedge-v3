import { computed, onMounted, ref, Ref, watch } from "vue"
import { useTabRoute } from "./api"

export function useParam<P>(paramName: string): Ref<P | null>
export function useParam<P>(paramName: string, defaultValue: P): Ref<P>
export function useParam<P>(paramName: string, defaultValue: () => P, defaultFunction: true): Ref<P>
export function useParam<P>(paramName: string, defaultValue?: P | (() => P), defaultFunction?: boolean): Ref<P | null> {
    const { route, routePush } = useTabRoute()

    let data: Ref<P>
    if(defaultFunction && defaultValue instanceof Function) {
        data = ref<P>(defaultValue()) as Ref<P>
    }else if(defaultValue !== undefined) {
        data = ref<P>(defaultValue as P) as Ref<P>
    }else{
        data = ref<P | null>(null) as Ref<P>
    }

    watch(() => route.value.params[paramName], nd => {
        let newData: P
        if(nd === undefined) {
            if(defaultFunction && defaultValue instanceof Function) {
                newData = defaultValue()
            }else if(defaultValue !== undefined) {
                newData = defaultValue as P
            }else{
                newData = null as P
            }
        }else{
            newData = nd
        }

        if(newData !== data.value) data.value = newData
    }, {immediate: true, deep: true})

    return computed({
        get: () => data.value,
        set: value => {
            data.value = value
            routePush({routeName: route.value.routeName, path: route.value.path, params: {...route.value.params, [paramName]: value}})
        }
    })
}

export function usePath<P>(): Ref<P>
export function usePath<P, O>(from: (o: O) => P, to: (p: P) => O): Ref<P>
export function usePath<P, O>(from?: (o: O) => P, to?: (p: P) => O): Ref<P> {
    const { route, routePush } = useTabRoute()

    if(from && to) {
        const data: Ref<O> = ref(route.value.path as any)

        watch(() => route.value.path, newPath => { if(newPath !== data.value) data.value = newPath as O }, {immediate: true, deep: true})

        return computed({
            get: () => from(data.value),
            set: value => routePush({routeName: route.value.routeName, path: data.value = to(value)})
        })
    }else{
        const data: Ref<P> = ref(route.value.path as any)

        watch(() => route.value.path, newPath => { if(newPath !== data.value) data.value = newPath as P }, {immediate: true, deep: true})

        return computed({
            get: () => data.value,
            set: value => routePush({routeName: route.value.routeName, path: data.value = value})
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