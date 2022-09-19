/**
 * 检查name的命名是否符合要求。用于tag类entity检查。
 * 要求不能包含非空字符和禁用符号。
 */
export function checkTagName(name: string): boolean {
    if(name.length === 0) {
        return false
    }

    for(const c of DISABLE_CHARACTER) {
        if(name.includes(c)) {
            return false
        }
    }

    return true
}

const DISABLE_CHARACTER = ["'", "\"", "`", ".", "|"]

export type PortType = "AUTO" | "RANGE" | number | "ERROR"

/**
 * 校验port字符串的类型。将其划分类自动、范围、确定数字、错误这几类。
 */
export function validatePort(port: string): PortType {
    const trimPort = port.trim()
    if(trimPort === "") {
        return "AUTO"
    }

    if(/^[0-9]+$/.test(trimPort)) {
        return parseInt(trimPort)
    }

    const ports = trimPort.split(",").map(s => s.split("-")).flat(1)
    if(ports.filter(p => !/^[0-9]+$/.test(p)).length > 0) {
        return "ERROR"
    }
    return "RANGE"
}
