import { DependencyList, useCallback, useEffect, useRef, useState } from "react"
import { objects } from "@/utils/primitives"

/**
 * 提供对某些state变化的响应。它看起来有点像useEffect，但作用并不相同，它不是副作用，在每次渲染期间就会执行。
 */
export function useWatch(func: () => void, dependencies: DependencyList, options?: {immediate: boolean}) {
    const [prevValue, setPrevValue] = useState(options?.immediate ? null : dependencies)

    function isChange(): boolean {
        if(prevValue === null) {
            return true
        }
        if(prevValue === dependencies) {
            return false
        }
        for(let i = 0; i < dependencies.length; ++i) {
            if(dependencies[i] !== prevValue[i]) {
                return true
            }
        }
        return false
    }

    if(isChange()) {
        setPrevValue(dependencies)
        func()
    }
}

export function usePartialSet<T extends object>(value: T | null | undefined, setValue?: (v: T) => void) {
    return function<K extends keyof T>(key: K, newValue: T[K]) {
        if(value !== null && value !== undefined && setValue && !objects.deepEquals(value[key], newValue)) {
            setValue({...value, [key]: newValue})
        }
    }
}

interface UseEditorProps<T> {
    value: T | null | undefined,
    updateValue?(v: T): void
    default(): T
    afterChange?(v: T | null | undefined): void
}

export function useEditor<T extends object>(props: UseEditorProps<T>) {
    const [editor, setEditor] = useState(props.default())
    const [changed, setChanged] = useState(false)

    useWatch(() => {
        setEditor(props.value ? props.value : props.default())
        props.afterChange?.(props.value)
    }, [props.value], {immediate: true})

    const setProperty = usePartialSet(editor, v => {
        setEditor(v)
        if(!changed) setChanged(true)
    })

    const save = () => {
        setChanged(false)
        props.updateValue?.(editor)
    }

    return {editor, changed, setProperty, save}
}

interface UseCreatorProps<T, F> {
    updateValue?(v: T): void
    to(v: F): T
    default(): F
    effect?(v: T | null | undefined): void
}

export function useCreator<T, F extends object>(props: UseCreatorProps<T, F>) {
    const [editor, setEditor] = useState(props.default())
    const [changed, setChanged] = useState(false)

    const setProperty = usePartialSet(editor, v => {
        setEditor(v)
        if(!changed) setChanged(true)
    })

    const save = () => {
        const form = props.to(editor)
        setChanged(false)
        setEditor(props.default())
        props.updateValue?.(form)
    }

    return {editor, changed, setProperty, save}
}

interface AsyncLoadingProps<T> {
    default: T
    loading?: T
    failed?: T
    call(): Promise<T>
}

export function useAsyncLoading<T>(props: AsyncLoadingProps<T>): [T, (t?: T | ((t: T | null) => T)) => void]
export function useAsyncLoading<T>(call: () => Promise<T>): [T | null, (t?: T | ((t: T | null) => T)) => void]
export function useAsyncLoading<T>(props: AsyncLoadingProps<T> | (() => Promise<T>)): [T | null, (t?: T | ((t: T | null) => T)) => void] {
    const loading = useRef(false)
    const initialized = useRef(false)
    if(typeof props === "function") {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [data, setData] = useState<T | null>(null)

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const refresh = useCallback(() => {
            if(!loading.current) {
                loading.current = true
                props().then(res => {
                    setData(res)
                }).finally(() => {
                    loading.current = false
                })
            }
        }, [props])

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const set = useCallback((newData?: T | ((t: T | null) => T)) => {
            if(newData !== undefined) {
                setData(newData)
            }else{
                refresh()
            }
        }, [refresh])

        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
            if(!initialized.current) {
                initialized.current = true
                refresh()
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [])
    
        return [data, set]
    }else{
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [data, setData] = useState<T>(props.default)

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const refresh = useCallback(() => {
            if(!loading.current) {
                loading.current = true
                if(props.loading !== undefined) setData(props.loading)
                props.call()
                    .then(res => setData(res))
                    .catch(() => { if(props.failed !== undefined) setData(props.failed)})
                    .finally(() => {
                        loading.current = false
                    })
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [props.loading, props.call, props.failed])

        // eslint-disable-next-line react-hooks/rules-of-hooks
        const set = useCallback((newData?: T | ((t: T | null) => T)) => {
            if(newData !== undefined) {
                setData(newData)
            }else{
                refresh()
            }
        }, [refresh])

        // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
            if(!initialized.current) {
                initialized.current = true
                refresh()
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [])
    
        return [data, set]
    }
}
