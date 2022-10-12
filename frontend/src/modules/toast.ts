import { reactive } from "vue"
import { BasicException } from "@/functions/http-client/exceptions"
import { installation } from "@/utils/reactivity"

export type ToastType = "success" | "warning" | "danger" | "info" | "plain"

export interface ToastManager {
    toast(title: string, type: ToastType, content: string | undefined): void
    handleError(title: string, message: string | undefined): void
    handleException(e: BasicException): void
}

interface ToastConsumer extends ToastManager {
    toasts: Toast[]
}

interface Toast {
    uniqueKey: number
    title: string
    type: ToastType
    content: string | undefined
}

export const [installToastManager, useToastManager] = installation(function (): ToastConsumer {
    let seq = 0

    const toasts = reactive<Toast[]>([])

    const toast = (title: string, type: ToastType, content: string | undefined) => toasts.push({uniqueKey: seq++, title, type, content})
    const handleError = (title: string, message: string | undefined) => toast(title, "danger", message)
    const handleException = (e: BasicException) => toast(`${e.status}: ${e.code}`, "danger", e.message)

    return { toasts, toast, handleError, handleException }
})

export const useToast: () => ToastManager = useToastManager
