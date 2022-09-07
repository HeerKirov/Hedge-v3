import { reactive } from "vue"
import { installation } from "@/utils/reactivity"

export interface MessageBoxManager {
    showMessage(options: MessageBoxOptions): Promise<string>
    showOkMessage(type: MessageBoxType, message: string, detailMessage?: string): void
    showYesNoMessage(type: MessageBoxType, message: string, detailMessage?: string): Promise<boolean>
}

type MessageBoxType = "info" | "prompt" | "error" | "confirm" | "warn"

export interface MessageBoxOptions {
    title: string
    message: string
    detailMessage?: string
    buttons: MessageBoxButton[]
    enter?: string
    esc?: string
}

export interface MessageBoxButton {
    name?: string
    action: string
    type?: "primary" | "danger" | "warning"
    icon?: string
}

interface MessageBoxConsumer extends MessageBoxManager {
    messageTasks: MessageTask[]
}

export interface MessageTask {
    options: MessageBoxOptions
    resolve(ret: string): void
}

export const [installMessageBoxManager, useMessageBoxManager] = installation(function () {
    const messageTasks = reactive<MessageTask[]>([])

    const showMessage = (options: MessageBoxOptions): Promise<string> => {
        return new Promise<string>(resolve => {
            messageTasks.push({options, resolve})
        })
    }
    const showOkMessage = (type: MessageBoxType, message: string, detailMessage?: string): void => {
        showMessage({
            title: STD_TITLES[type],
            message,
            detailMessage,
            buttons: [OkButton],
            enter: "ok",
            esc: "ok"
        }).finally(null)
    }
    const showYesNoMessage = async (type: MessageBoxType, message: string, detailMessage?: string): Promise<boolean> => {
        const res = await showMessage({
            title: STD_TITLES[type],
            message,
            detailMessage,
            buttons: [type === "warn" ? DangerYesButton : YesButton, NoButton],
            enter: "yes",
            esc: "no"
        })
        return res === "yes"
    }

    return <MessageBoxConsumer>{messageTasks, showMessage, showOkMessage, showYesNoMessage}
})

export const useMessageBox: () => MessageBoxManager = useMessageBoxManager

const OkButton: MessageBoxButton = {name: "确定", action: "ok", type: "primary"}
const YesButton: MessageBoxButton = {name: "是", action: "yes", type: "primary"}
const DangerYesButton: MessageBoxButton = {name: "是", action: "yes", type: "danger"}
const NoButton: MessageBoxButton = {name: "否", action: "no"}

const STD_TITLES: {[key in MessageBoxType]: string} = {
    "info": "消息",
    "prompt": "提示",
    "error": "错误",
    "confirm": "确认",
    "warn": "警告",
} as const
