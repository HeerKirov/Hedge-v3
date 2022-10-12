import { AnalysedKeyPress, analyseKeyPress, KeyCode, KeyPress } from "./definition"
import { platform } from "@/functions/ipc-client"

/*
 * 自行包装，并经过平台统一化处理的Keyboard Event。
 * - 使用统一化定义了的按键表，更方便地定义组合键；
 * - 自动根据平台差异，整合meta和alt键；
 */

export interface KeyEvent {
    /**
     * 按键代码。
     */
    key: KeyCode
    /**
     * 是否一同按下alt(win/linux)/option(mac)。
     */
    altKey: boolean
    /**
     * 是否一同按下shift。
     */
    shiftKey: boolean
    /**
     * 是否一同按下ctrl(win/linux)/cmd(mac)。这个属性整合了平台差异。
     */
    metaKey: boolean
    /**
     * 阻止事件继续向上/向前传递。
     * 在global keyboard event中时，这意味着先前挂载的事件都不会继续响应，被阻断在当前事件中了。
     */
    stopPropagation(): void
    /**
     * 阻止按键事件的原本事件响应。
     */
    preventDefault(): void
    /**
     * 事件发起者。
     */
    target: EventTarget | null
}

/**
 * 快捷处理：只拦截处理指定的事件。用在v-on事件绑定时。
 */
export function onKey(keys: KeyPress | KeyPress[], func: (e: KeyEvent) => void) {
    const validator = createKeyEventValidator(keys)
    return function(e: KeyEvent) {
        if(validator(e)) {
            func(e)
        }
    }
}

/**
 * 快捷处理：只拦截处理{Enter}事件。用在v-on事件绑定时。
 */
export function onKeyEnter(func: (e: KeyEvent) => void) {
    return function(e: KeyEvent) {
        if(e.key === "Enter" && !e.metaKey && !e.altKey && !e.shiftKey) {
            func(e)
        }
    }
}

/**
 * 判断一个事件是否符合给定的keypress。
 */
export function checkPrimitiveKeyEvent(key: AnalysedKeyPress, e: KeyboardEvent): boolean {
    return key.key === e.code && key.altKey === e.altKey && key.shiftKey === e.shiftKey && ((platform === "darwin" && key.metaKey === e.metaKey) || (platform !== "darwin" && key.metaKey === e.ctrlKey))
}

/**
 * 判断一个事件是否符合给定的keypress。
 */
export function checkKeyEvent(key: AnalysedKeyPress, e: KeyEvent): boolean {
    return key.key === e.key && key.altKey === e.altKey && key.shiftKey === e.shiftKey && key.metaKey === e.metaKey
}

/**
 * 解析一组按键描述，生成一个判断器。
 */
export function createPrimitiveKeyEventValidator(key: KeyPress | KeyPress[] | undefined): (e: KeyboardEvent) => boolean {
    if(key instanceof Array) {
        const ks = key.map(analyseKeyPress)
        return (e) => ks.some(k => checkPrimitiveKeyEvent(k, e))
    }else if(key !== undefined) {
        const k = analyseKeyPress(key)
        return (e) => checkPrimitiveKeyEvent(k, e)
    }else{
        return () => false
    }
}

/**
 * 解析一组按键描述，生成一个判断器。
 */
export function createKeyEventValidator(key: KeyPress | KeyPress[] | undefined): (e: KeyEvent) => boolean {
    if(key instanceof Array) {
        const ks = key.map(analyseKeyPress)
        return (e) => ks.some(k => checkKeyEvent(k, e))
    }else if(key !== undefined) {
        const k = analyseKeyPress(key)
        return (e) => checkKeyEvent(k, e)
    }else{
        return () => false
    }
}

/**
 * 将原生事件转换为代理事件。
 */
export function toKeyEvent(e: KeyboardEvent): KeyEvent {
    return {
        key: e.code as KeyCode,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
        metaKey: (platform === "darwin" && e.metaKey) || (platform !== "darwin" && e.ctrlKey),
        target: e.target,
        stopPropagation() {
            e.stopPropagation()
            e.stopImmediatePropagation()
        },
        preventDefault() {
            e.preventDefault()
        }
    }
}
