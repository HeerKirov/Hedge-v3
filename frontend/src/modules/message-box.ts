import { reactive } from "vue"
import { installation } from "@/utils/reactivity"

export interface MessageBoxManager {
    showMessage(options: MessageBoxOptions): Promise<string>
    showOkMessage(type: MessageBoxType, message: string, detailMessage?: string): void
    showYesNoMessage(type: MessageBoxType, message: string, detailMessage?: string): Promise<boolean>
}

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

const OkButton: MessageBoxButton = {name: "??????", action: "ok", type: "primary"}
const YesButton: MessageBoxButton = {name: "???", action: "yes", type: "primary"}
const DangerYesButton: MessageBoxButton = {name: "???", action: "yes", type: "danger"}
const NoButton: MessageBoxButton = {name: "???", action: "no"}


type MessageBoxType = "info" | "prompt" | "error" | "confirm" | "warn"

const STD_TITLES: {[key in MessageBoxType]: string} = {
    "info": "??????",       //?????????????????????
    "prompt": "??????",     //?????????????????????????????????????????????????????????????????????????????????????????????????????????
    "error": "??????",      //?????????????????????????????????????????????????????????????????????????????????
    "confirm": "??????",    //???????????????????????????
    "warn": "??????",       //?????????????????????????????????????????????
} as const
