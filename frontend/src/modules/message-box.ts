import { reactive } from "vue"
import { installation } from "@/utils/reactivity"

export interface MessageBoxManager {
    showMessage(options: MessageBoxOptions): Promise<{action: string, checks: string[]}>
    showOkMessage(type: MessageBoxType, message: string, detailMessage?: string): void
    showYesNoMessage(type: MessageBoxType, message: string, detailMessage?: string): Promise<boolean>
    showCheckBoxMessage(type: MessageBoxType, message: string, detailMessage: string | undefined, checks: MessageBoxCheckBox[]): Promise<{ok: boolean, checks: string[]}>
}

export interface MessageBoxOptions {
    title: string
    message: string
    detailMessage?: string
    buttons: MessageBoxButton[]
    checks?: MessageBoxCheckBox[]
    enter?: string
    esc?: string
}

export interface MessageBoxButton {
    name?: string
    action: string
    type?: "primary" | "danger" | "warning"
    icon?: string
}

export interface MessageBoxCheckBox {
    key: string
    name?: string
    defaultValue?: boolean
}

interface MessageBoxConsumer extends MessageBoxManager {
    messageTasks: MessageTask[]
}

export interface MessageTask {
    options: MessageBoxOptions
    resolve(ret: {action: string, checks: string[]}): void
}

export const [installMessageBoxManager, useMessageBoxManager] = installation(function () {
    const messageTasks = reactive<MessageTask[]>([])

    const showMessage = (options: MessageBoxOptions): Promise<{action: string, checks: string[]}> => {
        return new Promise<{action: string, checks: string[]}>(resolve => {
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
        return res.action === "yes"
    }
    const showCheckBoxMessage = async (type: MessageBoxType, message: string, detailMessage: string | undefined, checks: MessageBoxCheckBox[]): Promise<{ok: boolean, checks: string[]}> => {
        const res = await showMessage({
            title: STD_TITLES[type],
            message,
            detailMessage,
            buttons: [type === "warn" ? DangerYesButton : YesButton, NoButton],
            checks,
            enter: "yes",
            esc: "no"
        })
        return {ok: res.action === "yes", checks: res.checks}
    }

    return <MessageBoxConsumer>{messageTasks, showMessage, showOkMessage, showYesNoMessage, showCheckBoxMessage}
})

export const useMessageBox: () => MessageBoxManager = useMessageBoxManager

const OkButton: MessageBoxButton = {name: "确定", action: "ok", type: "primary"}
const YesButton: MessageBoxButton = {name: "是", action: "yes", type: "primary"}
const DangerYesButton: MessageBoxButton = {name: "是", action: "yes", type: "danger"}
const NoButton: MessageBoxButton = {name: "否", action: "no"}


type MessageBoxType = "info" | "prompt" | "error" | "confirm" | "warn"

const STD_TITLES: {[key in MessageBoxType]: string} = {
    "info": "消息",       //有信息需要告知
    "prompt": "提示",     //有问题需要提示给用户，例如表单验证不通过、有非法值，适用于正常业务流程
    "error": "错误",      //发生内部错误或严重错误，一般只适用于业务流程出现异常时
    "confirm": "确认",    //有操作需要用户确认
    "warn": "警告",       //有不可逆操作需要警告用户并确认
} as const
