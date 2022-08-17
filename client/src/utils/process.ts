export type Platform = "win32" | "darwin" | "linux"

export function getNodePlatform(): Platform {
    const platform = process.platform
    if(platform === "win32" || platform === "darwin" || platform === "linux") {
        return platform
    }
    throw new Error(`Unsupported platform ${platform}.`)
}

export async function promiseAll(...promises: Promise<unknown>[]): Promise<void> {
    for (const promise of promises) {
        await promise
    }
}

/**
 * 线程睡眠一段时间。
 * @param timeMs
 */
export async function sleep(timeMs: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, timeMs))
}

/**
 * 创建一个异步的计划任务，可以控制其开关。
 */
export function scheduleFuture(intervalMs: number, task: (future: ScheduledFuture) => Promise<void>, stopEvent?: () => Promise<void>): ScheduledFuture {
    let running = false

    function start() {
        if(!running) {
            running = true
            run().catch(console.error)
        }
    }

    function stop() {
        running = false
        stopEvent?.()?.finally()
    }

    const future = {start, stop}

    async function run() {
        while(running) {
            try {
                await task(future)
            }catch (e) {
                console.error(e)
            }
            if(running) await sleep(intervalMs)
        }
    }

    return future
}

export interface ScheduledFuture {
    start(): void
    stop(): void
}
