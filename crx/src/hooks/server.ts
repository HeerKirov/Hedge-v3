import { server, Response, BasicException, AppHealth } from "@/functions/server"
import { useAsyncLoading } from "@/utils/reactivity"

export function useServerHealth() {
    const [health, refreshHealth] = useAsyncLoading<AppHealth["status"] | "UNKNOWN" | "DISCONNECTED">({
        default: "UNKNOWN",
        loading: "UNKNOWN",
        failed: "DISCONNECTED",
        async call() {
            const res = await server.app.health()
            return res.ok ? res.data.status : "DISCONNECTED"
        }
    })

    return {health, refreshHealth}
}

export function useEndpoint<T, E extends BasicException>(endpoint: () => Promise<Response<T, E>>) {
    const [data] = useAsyncLoading(async () => {
        const res = await endpoint()
        return res.ok ? {
            data: res.data,
            error: null
        } : {
            data: null,
            error: res.exception
        }
    })

    return data || {data: null, error: null}
}