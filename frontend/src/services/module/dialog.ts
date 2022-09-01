import { OpenDialogOptions, MessageOptions, remoteIpcClient } from "@/functions/ipc-client"


export interface DialogManager {
    openDialog(options: OpenDialogOptions): Promise<string[] | null>
    showMessage(options: MessageOptions): Promise<number>
}

export const dialogManager: DialogManager =  {
    async openDialog(options: OpenDialogOptions): Promise<string[] | null> {
        const res = await remoteIpcClient.remote.dialog.openDialog(options)
        return res && res.length ? res : null
    },
    showMessage(options: MessageOptions): Promise<number> {
        return remoteIpcClient.remote.dialog.showMessage(options)
    }
}
