import { onMounted, onUnmounted, ref, toRaw, watch } from "vue"
import { remoteIpcClient } from "@/functions/ipc-client"
import { AuthSetting } from "@/functions/ipc-client/constants"
import { ServiceOption } from "@/functions/http-client/api/setting-service"
import { MetaOption } from "@/functions/http-client/api/setting-meta"
import { QueryOption } from "@/functions/http-client/api/setting-query"
import { ImportOption } from "@/functions/http-client/api/setting-import"
import { FindSimilarOption } from "@/functions/http-client/api/setting-find-similar"
import { useFetchReactive, useRetrieveHelper } from "@/functions/fetch"
import { useAppEnv, useServerStatus } from "@/functions/app"
import { useMessageBox } from "@/modules/message-box"
import { computedMutable, optionalInstallation, toRef } from "@/utils/reactivity"

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

export function useSettingServiceData() {
    return useFetchReactive<ServiceOption>({
        get: client => client.settingService.get,
        update: client => client.settingService.update,
        eventFilter: "setting/service/changed"
    })
}

export function useSettingMetaData() {
    return useFetchReactive<MetaOption>({
        get: client => client.settingMeta.get,
        update: client => client.settingMeta.update,
        eventFilter: "setting/meta/changed"
    })
}

export function useSettingQueryData() {
    return useFetchReactive<QueryOption>({
        get: client => client.settingQuery.get,
        update: client => client.settingQuery.update,
        eventFilter: "setting/query/changed"
    })
}

export function useSettingImportData() {
    return useFetchReactive<ImportOption>({
        get: client => client.settingImport.get,
        update: client => client.settingImport.update,
        eventFilter: "setting/import/changed"
    })
}

export function useSettingFindSimilarData() {
    return useFetchReactive<FindSimilarOption>({
        get: client => client.settingFindSimilar.get,
        update: client => client.settingFindSimilar.update,
        eventFilter: "setting/find-similar/changed"
    })
}

export const [installSettingSite, useSettingSite] = optionalInstallation(function() {
    const messageBox = useMessageBox()

    const { data, refresh } = useFetchReactive({
        get: client => client.settingSource.site.list,
        eventFilter: "setting/source-site/changed"
    })

    const { getData: getItem, createData: createItem, setData: updateItem, deleteData: deleteItem } = useRetrieveHelper({
        get: client => client.settingSource.site.get,
        create: client => client.settingSource.site.create,
        update: client => client.settingSource.site.update,
        delete: client => client.settingSource.site.delete,
        handleErrorInCreate(e) {
            if(e.code === "ALREADY_EXISTS") {
                messageBox.showOkMessage("prompt", "已经存在同名的站点。")
            }else{
                return e
            }
        },
        handleErrorInDelete(e) {
            if(e.code == "CASCADE_RESOURCE_EXISTS") {
                const resourceName = {
                    "Illust": "图库项目",
                    "ImportImage": "导入项目",
                    "SourceAnalyseRule": "来源解析规则"
                }[e.info]
                messageBox.showOkMessage("prompt", "无法删除此来源站点。", `此来源站点仍存在关联的${resourceName}，请先清理关联项，确保没有意外的级联删除。`)
            }else{
                return e
            }
        },
        afterCreate: refresh,
        afterUpdate: refresh,
        afterDelete: refresh
    })

    return {data, getItem, createItem, updateItem, deleteItem}
})
