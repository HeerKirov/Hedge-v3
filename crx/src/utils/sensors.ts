import React, { useEffect, useRef } from "react"
import { analyseShortcut } from "@/utils/shortcut"

/**
 * 注册一个document级别的快捷键，使用的是CRX API中的某个按键。
 */
export function useChromeExtensionShortcut(command: string, callback: (e: KeyboardEvent) => void) {
    const callerRef = useRef<(e: KeyboardEvent) => boolean>(undefined)

    chrome.runtime.getPlatformInfo().then(async platform => {
        const commands = await chrome.commands.getAll()
        const shortcut = commands.find(c => c.name === command && c.shortcut !== undefined)?.shortcut
        if(shortcut !== undefined) {
            callerRef.current = analyseShortcut(shortcut, platform.os)
        }
    })

    useEffect(() => {
        const keydown = (e: KeyboardEvent) => {
            if(callerRef.current !== undefined) {
                if(callerRef.current(e)) {
                    callback(e)
                }
            }
        }

        document.addEventListener("keydown", keydown)

        return () => document.removeEventListener("keydown", keydown)
    }, [callback])
}

export function useShortcut(shortcut: string, callback: (e: KeyboardEvent) => void) {
    const callerRef = useRef(analyseShortcut(shortcut, "win"))

    useEffect(() => {
        const keydown = (e: KeyboardEvent) => {
            if(callerRef.current(e)) {
                callback(e)
            }
        }

        document.addEventListener("keydown", keydown)

        return () => document.removeEventListener("keydown", keydown)
    }, [callback])
}

export function useOutsideClick(ref: React.RefObject<HTMLElement | null>, event: (e: MouseEvent) => void, active?: boolean) {
    useEffect(() => {
        if(!active) return

        let clickEventBuffer: MouseEvent | null = null
        let mouseDownTarget: EventTarget | null = null

        const clickRef = (e: MouseEvent) => {
            // tips: 如果某个click事件造成了点击元素被卸载，但点击元素又属于此ref，那这次click事件会被判定为outside，造成意外。
            //      对此，需要一个办法，排除从点击元素发生的click事件引发的此类情况。
            //      这里采用的方案是再直接监听ref DOM的click事件。只要此事件接收了Event，就将其记录下来，并在之后的document click事件中忽略此Event。
            //      为此还要避免Event经过ref DOM但中途被拦截没有传到document的情况，因此需要在短暂的异步后，自行清除此值。
            clickEventBuffer = e
            setTimeout(() => {
                clickEventBuffer = null
            }, 1)
        }

        const mouseDownDocument = (e: MouseEvent) => {
            mouseDownTarget = e.target
        }

        const clickDocument = (e: MouseEvent) => {
            if(clickEventBuffer === e) {
                clickEventBuffer = null
                return
            }
            const target = mouseDownTarget ?? e.target
            if(mouseDownTarget) mouseDownTarget = null
            if(ref.current && !(ref.current === target || ref.current.contains(target as Node))) {
                event(e)
            }
        }

        // tips: 一个magic用法：如果某个click事件造成了此hook激活，但click target又不属于ref，那这次click事件仍会传递至本次click事件中。
        //      因此，制造一个微小的延迟，造成事实上的异步，使挂载click事件晚于可能的触发事件
        const timeoutId = setTimeout(() => {
            document.addEventListener("click", clickDocument)
            document.addEventListener("mousedown", mouseDownDocument)
            
            // 在 ref 元素上监听 click 事件
            if(ref.current) {
                ref.current.addEventListener("click", clickRef)
            }
        }, 1)

        return () => {
            clearTimeout(timeoutId)
            document.removeEventListener("click", clickDocument)
            document.removeEventListener("mousedown", mouseDownDocument)
            if(ref.current) {
                ref.current.removeEventListener("click", clickRef)
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [event, active])
}
