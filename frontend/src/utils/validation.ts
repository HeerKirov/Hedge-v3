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
