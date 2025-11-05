
/**
 * 解析一个快捷键文本，将其转换为函数调用的形式。快捷键文本来自CRX API.
 */
export function analyseShortcut(shortcut: string, platform: `${chrome.runtime.PlatformOs}`) {
    const keys = shortcut.split("+")

    const keyEvent: KeyEvent = {
        shiftKey: false,
        altKey: false,
        ctrlKey: false,
        metaKey: false,
        code: ""
    }

    for(const key of keys) {
        if(key === "Shift") keyEvent.shiftKey = true
        else if(key === "Alt" || (platform === "mac" && key === "Option")) keyEvent.altKey = true
        else if(key === "Ctrl" || (platform === "mac" && key === "MacCtrl")) keyEvent.ctrlKey = true
        else if(platform === "mac" && key === "Command") keyEvent.metaKey = true
        else if(ALPHAS.includes(key)) keyEvent.code = `Key${key}`
        else if(DIGITS.includes(key)) keyEvent.code = `Digit${key}`
        else if(ARROWS.includes(key)) keyEvent.code = `Arrow${key}`
        else if(STD_KEYS.includes(key)) keyEvent.code = key
    }

    return keyEventToCaller(keyEvent)
}

function keyEventToCaller(keyEvent: KeyEvent) {
    return function(e: KeyboardEvent) {
        return e.code === keyEvent.code && keyEvent.shiftKey === e.shiftKey && keyEvent.ctrlKey === e.ctrlKey && keyEvent.metaKey === e.metaKey && keyEvent.altKey === e.altKey
    }
}

interface KeyEvent {
    shiftKey: boolean
    altKey: boolean
    ctrlKey: boolean
    metaKey: boolean
    code: string
}

const ALPHAS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
const DIGITS = "0123456789"
const ARROWS = ["Up", "Down", "Left", "Right"]
const STD_KEYS = ["Comma", "Period", "Home", "End", "PageUp", "PageDown", "Space", "Insert", "Delete", "Enter"]
