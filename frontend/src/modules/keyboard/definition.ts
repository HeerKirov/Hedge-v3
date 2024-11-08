
/*
 * 此处将受支持的按键形式标准化了。
 * - 定义了所有可用的按键；
 * - 定义了用这些按键可以书写的组合键形式；
 * - 给出了从组合键字符串到结构的解析方式。
 */

/**
 * 支持的所有组合键形式。包括Meta, Alt, Shift和所有KeyCode的组合。
 */
export type KeyPress = KeyCode
    | `${KeyFuncMeta}+${KeyCode}`
    | `${KeyFuncAlt}+${KeyCode}`
    | `${KeyFuncMeta}+${KeyFuncShift}+${KeyCode}`
    | `${KeyFuncMeta}+${KeyFuncAlt}+${KeyCode}`

type KeyFuncAlt = "Alt"
type KeyFuncMeta = "Meta"
type KeyFuncShift = "Shift"

/**
 * 支持的所有KeyCode。
 */
export type KeyCode = KeyCodeFunc | KeyCodeArrow | KeyCodeDigit | KeyCodeKey | KeyCodeSignal

type KeyCodeFunc = "Enter" | "Escape" | "Backspace" | "Tab" | "Space" | "Home" | "End" | "PageUp" | "PageDown"
type KeyCodeArrow = "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight"
type KeyCodeDigit = `Digit${"0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"}`
type KeyCodeKey = `Key${"A" | "B" | "C" | "D" | "E" | "F" | "G" | "H" | "I" | "J" | "K" | "L" | "M" | "N" | "O" | "P" | "Q" | "R" | "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z"}`
type KeyCodeSignal
    = /* ` */ "Backquote"
    | /* - */ "Minus"
    | /* = */ "Equal"
    | /* [ */ "BracketLeft"
    | /* ] */ "BracketRight"
    | /* \ */ "Backslash"
    | /* ; */ "Semicolon"
    | /* ' */ "Quote"
    | /* , */ "Comma"
    | /* . */ "Period"
    | /* / */ "Slash"

export interface AnalysedKeyPress {key: KeyCode, altKey: boolean, shiftKey: boolean, metaKey: boolean}

/**
 * 解析keyPress格式的按键描述，将其转换为结构化的按键描述。
 * @param key
 */
export function analyseKeyPress(key: KeyPress): AnalysedKeyPress {
    const matcher = key.match(/(Meta\+)?(Alt\+)?(Shift\+)?(.+)/)
    if(matcher) {
        const metaKey = matcher[1] !== undefined
        const altKey = matcher[2] !== undefined
        const shiftKey = matcher[3] !== undefined
        const key = matcher[4]! as KeyCode
        return {key, altKey, metaKey, shiftKey}
    }
    throw new Error(`KeyPress ${key} is not supported.`)
}
