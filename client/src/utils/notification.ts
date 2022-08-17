import { BrowserWindow, dialog } from "electron"

export interface MessageOptions {
    type: "none" | "info" | "error" | "question"
    buttons?: string[]
    defaultButtonId?: number
    title?: string
    message: string
    detail?: string
    attachedWindow?: BrowserWindow
}

/**
 * 弹出一个消息框用于消息通知。
 * @param options
 */
export async function showMessage(options: MessageOptions): Promise<number> {
    if(options.attachedWindow) {
        return (await dialog.showMessageBox(options.attachedWindow, options)).response
    }else{
        return (await dialog.showMessageBox(options)).response
    }
}

/**
 * 弹出一个消息框用于消息通知，且消息框是同步的。因为是同步的，所以要谨慎使用，且不要在渲染进程使用。
 * @param options
 */
export function showMessageSync(options: MessageOptions): number {
    if(options.attachedWindow) {
        return dialog.showMessageBoxSync(options.attachedWindow, options)
    }else{
        return dialog.showMessageBoxSync(options)
    }
}

/**
 * 弹出一个错误通知框。可以用在electron app初始化之前。
 * @param title
 * @param content
 */
export function showError(title: string, content: string) {
    dialog.showErrorBox(title, content)
}