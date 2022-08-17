export function createParameters(argv: string[]) {
    function contains(flag: string): boolean {
        return argv.find(v => v === flag) != undefined
    }

    function opt(param: string, defaultValue?: string): string | undefined {
        const index = argv.findIndex(v => v === param)
        const value = index >= 0 ? argv[index + 1] : undefined
        return value ?? defaultValue
    }

    return {contains, opt}
}
