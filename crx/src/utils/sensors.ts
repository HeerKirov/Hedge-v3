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
        if(active) {
            const clickDocument = (e: MouseEvent) => {
                const target = e.target
                if(ref.current && !(ref.current === target || ref.current.contains(target as Node))) {
                    event(e)
                }
            }

            //需要从上至下查阅事件。一般的冒泡事件顺序可能导致DOM结构已经变化，将点击元素移出当前区域，造成误判
            document.addEventListener("click", clickDocument, true)

            return () => document.removeEventListener("click", clickDocument, true)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [event, active])
}
