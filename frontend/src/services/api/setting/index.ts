import { computed, onMounted, onUnmounted, ref, toRaw, watch } from "vue"
import { remoteIpcClient } from "@/functions/ipc-client"
import { AuthSetting } from "@/functions/ipc-client/constants"
import { ServiceOption } from "@/functions/http-client/api/setting-service"
import { useFetchReactive } from "@/functions/fetch"
import { useAppEnv, useServerStatus } from "@/functions/app"
import { computedMutable, toRef, toRefNullable } from "@/utils/reactivity";

export function useServiceStorageInfo() {
    return useFetchReactive({
        get: client => client.serviceRuntime.storage
    })
}

export function useSettingAuthData() {
    const value = ref<AuthSetting>()

    onMounted(async () => value.value = await remoteIpcClient.setting.auth.get())

    watch(value, async (_, o) => {
        if(o !== undefined && value.value !== undefined) {
            await remoteIpcClient.setting.auth.set(toRaw(value.value))
        }
    }, {deep: true})

    return value
}

export function useSettingServerData() {
    return useFetchReactive<ServiceOption>({
        get: client => client.settingService.get,
        update: client => client.settingService.update,
        eventFilter: "setting/service/changed"
    })
}

export function useSettingConnectionInfo() {
    const serverStatus = useServerStatus()

    const connectionStatus = toRef(serverStatus, "connectionStatus")

    const connectionInfo = computedMutable(() => {
        if(serverStatus.value.connectionInfo !== null) {
            return {
                runningTime: formatInterval(Date.now() - serverStatus.value.connectionInfo.startTime),
                port: getPortFromHost(serverStatus.value.connectionInfo!.host),
                pid: serverStatus.value.connectionInfo!.pid
            }
        }
        return null
    })

    let timer: NodeJS.Timer | null = null

    onMounted(() => {
        timer = setInterval(() => {
            if(connectionInfo.value !== null && serverStatus.value.connectionInfo !== null) {
                connectionInfo.value.runningTime = formatInterval(Date.now() - serverStatus.value.connectionInfo.startTime)
            }
        }, 1000)
    })

    onUnmounted(() => {
        if(timer !== null) {
            clearInterval(timer)
            timer = null
        }
    })

    function getPortFromHost(host: string): number {
        const idx = host.lastIndexOf(":")
        return parseInt(host.slice(idx + 1))
    }

    function formatInterval(interval: number): string {
        const secInterval = Math.floor(interval / 1000)
        const sec = secInterval % 60
        const min = (secInterval - sec) % 3600 / 60
        const hour = Math.floor(secInterval / 3600)

        function dbl(i: number): string | number {
            return i >= 10 ? i : `0${i}`
        }

        return `${dbl(hour)}:${dbl(min)}:${dbl(sec)}`
    }

    return {connectionStatus, connectionInfo}
}

export function useSettingChannel() {
    const appEnv = useAppEnv()

    const currentChannel = appEnv.channel
    const defaultChannel = ref<string>()
    const channels = ref<string[]>([])

    onMounted(async () => {
        channels.value = await remoteIpcClient.setting.channel.list()
        defaultChannel.value = await remoteIpcClient.setting.channel.getDefault()
    })

    watch(defaultChannel, (v, o) => {
        if(v !== undefined && o !== undefined) {
            remoteIpcClient.setting.channel.setDefault(v).finally()
        }
    })

    return {channels, currentChannel, defaultChannel, toggle: remoteIpcClient.setting.channel.toggle}
}
