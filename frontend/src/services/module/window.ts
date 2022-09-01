import { remoteIpcClient } from "@/functions/ipc-client"

export interface WindowManager {
    newWindow(): void
    newWindow(url: string): void
    openSetting(): void
    openGuide(): void
}

export const windowManager: WindowManager = remoteIpcClient.window
