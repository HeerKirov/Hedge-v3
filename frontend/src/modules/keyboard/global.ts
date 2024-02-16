import { onBeforeMount, onMounted, onUnmounted, Ref, watch } from "vue"
import {installation, installationNullable} from "@/utils/reactivity"
import { platform } from "@/functions/ipc-client"
import { AnalysedKeyPress, KeyCode, KeyPress } from "./definition"
import { createKeyEventValidator, createPrimitiveKeyEventValidator, KeyEvent } from "./event"

/*
 * 提供全局的global keyboard服务。为了给所有的快捷键分清楚功能层次，所有的快捷键都使用global keyboard服务来定义。
 * 使用此服务的情况下，快捷键也依赖vue组件加载顺序进行挂载，这就留出了根据不同组件进行先后分层的空间。总是新的的事件首先响应并可以切断传播。
 */

const [installGlobalKeyManager, useGlobalKeyManager] = installation(function() {
    onMounted(() => document.addEventListener("keydown", keydown))
    onUnmounted(() => document.removeEventListener("keydown", keydown))

    const preventDefaultValidator = createKeyEventValidator(["Space", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"])

    function keydown(keyboardEvent: KeyboardEvent) {
        const consumer: KeyEvent = {
            key: keyboardEvent.code as KeyCode,
            altKey: keyboardEvent.altKey,
            shiftKey: keyboardEvent.shiftKey,
            metaKey: (platform === "darwin" && keyboardEvent.metaKey) || (platform !== "darwin" && keyboardEvent.ctrlKey),
            target: keyboardEvent.target,
            stopPropagation() {
                stopPropagation = true
            },
            preventDefault() {
                keyboardEvent.returnValue = false
            }
        }
        let stopPropagation = false

        const calls = callStacks.findLast(c => c.enabled)
        if(calls !== undefined && calls.calls.length > 0) {
            for(const call of calls.calls) {
                call(consumer)
                if(stopPropagation) {
                    break
                }
            }
        }

        //类似Space、方向键一类按键具有默认导航行为。键盘事件的target如果是body，则阻止其默认行为。
        if((consumer.target as Element | null)?.nodeName === "BODY" && preventDefaultValidator(consumer)) {
            consumer.preventDefault()
        }
    }

    const callStacks: {enabled: boolean, calls: ((e: KeyEvent) => void)[]}[] = [{enabled: true, calls: []}]

    return {callStacks}
})

/**
 * 在组件树中安装一个新栈。
 * 为了实现一些隔离性能，global keyboard服务的事件注册有一个可控的栈机制。
 * 简单地说，就是后续的任何useGlobalKey的事件，都只会写入到组件树中最近的安装的一个栈中。
 * 同时，当触发document事件时，只有最后注册的那个栈会被使用。当然，也可以通过一些手段，手动控制已注册的栈的可用性。
 */
const [installGlobalKeyStack, useGlobalKeyStack] = installationNullable(function (enabled?: Ref<boolean>) {
    const calls: ((e: KeyEvent) => void)[] = []
    const callStack = {calls, enabled: enabled?.value ?? true}

    const { callStacks } = useGlobalKeyManager()

    onMounted(() => callStacks.push(callStack))
    onUnmounted(() => callStacks.splice(callStacks.lastIndexOf(callStack), 1))
    if(enabled !== undefined) watch(enabled, enabled => callStack.enabled = enabled)

    return {calls}
})

/**
 * 提供视图内快捷键的声明/注入。当前视图内的表单组件应当选择泄露这些快捷键，以使快捷键在表单内可用。
 * 这组composition API解决的是表单组件的封装与全局快捷键的冲突问题。
 * 为防止意外触发，表单组件会将所有按键拦截，不向上传递，然而这会导致需要的快捷键不被触发。
 * 此方法在上游声明所需快捷键，并由下游来选择是否需要将这些快捷键事件放出去。
 * 此方法还会沿用更上游的注入，将沿途的注入组合起来。
 * @param provideKeys 声明的按键
 * @param intercepted 在此层清空上游的注入。用于分层。
 */
export const [installKeyDeclaration, useKeyDeclaration] = installation(function (provideKeys: KeyPress | KeyPress[], intercepted: boolean = false) {
    const currentKeys = typeof provideKeys === "object" ? provideKeys : [provideKeys]
    if(intercepted) {
        return { declaredKeys: currentKeys, validator: createKeyEventValidator(currentKeys), primitiveValidator: createPrimitiveKeyEventValidator(currentKeys) }
    }else{
        const parent = useKeyDeclaration()
        const keys: KeyPress[] = [...parent.declaredKeys, ...currentKeys]
        return { declaredKeys: keys, validator: createKeyEventValidator(keys), primitiveValidator: createPrimitiveKeyEventValidator(keys) }
    }
}, () => ({
    declaredKeys: [],
    validator: () => false,
    primitiveValidator: () => false
}))

/**
 * 提供全局统一处理全局按键响应的方式，用来处理除焦点元素外的按键响应，并确保它们按期望的顺序执行。
 */
export function useGlobalKey(event: (e: KeyEvent) => void, stack?: ReturnType<typeof useGlobalKeyStack>) {
    const { calls } = stack ?? useGlobalKeyStack() ?? useGlobalKeyManager().callStacks[0]

    const add = (call: (e: KeyEvent) => void) => {
        calls.unshift(call)
    }

    const remove = (call: (e: KeyEvent) => void) => {
        const i = calls.indexOf(call)
        calls.splice(i, 1)
    }

    onBeforeMount(() => add(event))
    onUnmounted(() => remove(event))
}

/**
 * 只捕获特定的组合键类型，并拦截上层传递和按键响应。相当于一个通用的快捷键挂载器。
 * @param keys 按键
 * @param event 触发事件
 * @param options interceptAll: 总是拦截所有按键向上游传递
 * @param stack 使用在同级注入的stack
 */
export function useInterceptedKey(keys: KeyPress | KeyPress[], event: (e: AnalysedKeyPress) => void, options?: {interceptAll?: boolean, preventDefault?: boolean}, stack?: ReturnType<typeof useGlobalKeyStack>) {
    const checker = createKeyEventValidator(keys)
    if(options?.interceptAll) {
        useGlobalKey(e => {
            if(checker(e)) {
                event(e)
                if(options?.preventDefault) e.preventDefault()
            }
            e.stopPropagation()
        }, stack)
    }else{
        useGlobalKey(e => {
            if(checker(e)) {
                e.stopPropagation()
                event(e)
                if(options?.preventDefault) e.preventDefault()
            }
        }, stack)
    }
}

/**
 * 创建一个拦截挂载。它将会在挂载后拦截所有向上传递的按键响应。用作视图分层机制。它也会使用KeyDeclaration机制，清空来自上游的注入。
 */
export function useInterception(stack?: ReturnType<typeof useGlobalKeyStack>) {
    useGlobalKey(e => {
        e.stopPropagation()
    }, stack)
    installKeyDeclaration([], true)
}

export { installGlobalKeyManager, installGlobalKeyStack }
