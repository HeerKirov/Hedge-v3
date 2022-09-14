import { installation } from "@/utils/reactivity"
import { HttpClient } from "@/functions/http-client"
import { BasicException } from "@/functions/http-client/exceptions"
import { WsClient } from "@/functions/ws-client"

interface FetchManagerOptions {
    httpClient: HttpClient
    wsClient: WsClient
    handleException(e: BasicException): void
}

export const [installFetchManager, useFetchManager] = installation(function (options: FetchManagerOptions): FetchManagerOptions {
    return options
})

export interface ErrorHandler<E extends BasicException> {
    (e: E): E | void
}
