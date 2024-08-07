import { onMounted, onUnmounted, ref, toRaw, watch } from "vue"
import { remoteIpcClient } from "@/functions/ipc-client"
import { AuthSetting, StorageSetting } from "@/functions/ipc-client/constants"
import { ServerOption, MetaOption, QueryOption, ImportOption, FindSimilarOption, StorageOption } from "@/functions/http-client/api/setting"
import { useFetchReactive, useRetrieveHelper } from "@/functions/fetch"
import { useAppEnv, useServerStatus } from "@/functions/app"
import { useMessageBox } from "@/modules/message-box"
import { numbers } from "@/utils/primitives"
import { computedMutable, optionalInstallation, toRef } from "@/utils/reactivity"

export function useAppStorageStatus() {
    return useFetchReactive({
        get: client => client.app.storageStatus
    })
}

export function useSettingAuth() {
    const value = ref<AuthSetting>()

    onMounted(async () => value.value = await remoteIpcClient.setting.auth.get())

    watch(value, async (_, o) => {
        if(o !== undefined && value.value !== undefined) {
            await remoteIpcClient.setting.auth.set(toRaw(value.value))
        }
    }, {deep: true})

    return {data: value}
}

export function useSettingClientStorage() {
    const value = ref<StorageSetting>()

    onMounted(async () => value.value = await remoteIpcClient.setting.storage.get())

    watch(value, async (_, o) => {
        if(o !== undefined && value.value !== undefined) {
            await remoteIpcClient.setting.storage.set(toRaw(value.value))
        }
    }, {deep: true})

    return {data: value}
}

export function useSettingConnectionInfo() {
    const serverStatus = useServerStatus()

    const connectionStatus = toRef(serverStatus, "connectionStatus")

    const connectionInfo = computedMutable(() => {
        if(serverStatus.value.connectionInfo !== null) {
            return {
                runningTime: numbers.toHourTimesDisplay(Date.now() - serverStatus.value.connectionInfo.startTime, false),
                port: getPortFromHost(serverStatus.value.connectionInfo!.host),
                pid: serverStatus.value.connectionInfo!.pid
            }
        }
        return null
    })

    let timer: NodeJS.Timeout | null = null

    onMounted(() => {
        timer = setInterval(() => {
            if(connectionInfo.value !== null && serverStatus.value.connectionInfo !== null) {
                connectionInfo.value.runningTime = numbers.toHourTimesDisplay(Date.now() - serverStatus.value.connectionInfo.startTime, false)
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

export function useSettingServer() {
    return useFetchReactive<ServerOption>({
        get: client => client.setting.server.get,
        update: client => client.setting.server.update,
        eventFilter: "setting/server/changed"
    })
}

export function useSettingStorage() {
    return useFetchReactive<StorageOption>({
        get: client => client.setting.storage.get,
        update: client => client.setting.storage.update,
        eventFilter: "setting/storage/changed"
    })
}

export function useSettingMeta() {
    return useFetchReactive<MetaOption>({
        get: client => client.setting.meta.get,
        update: client => client.setting.meta.update,
        eventFilter: "setting/meta/changed"
    })
}

export function useSettingQuery() {
    return useFetchReactive<QueryOption>({
        get: client => client.setting.query.get,
        update: client => client.setting.query.update,
        eventFilter: "setting/query/changed"
    })
}

export function useSettingImport() {
    return useFetchReactive<ImportOption>({
        get: client => client.setting.import.get,
        update: client => client.setting.import.update,
        eventFilter: "setting/import/changed"
    })
}

export function useSettingFindSimilar() {
    return useFetchReactive<FindSimilarOption>({
        get: client => client.setting.findSimilar.get,
        update: client => client.setting.findSimilar.update,
        eventFilter: "setting/find-similar/changed"
    })
}

export const [installSettingSite, useSettingSite] = optionalInstallation(function() {
    const message = useMessageBox()

    const { data } = useFetchReactive({
        get: client => client.setting.source.site.list,
        eventFilter: "setting/source-site/changed"
    })

    const { getData: getItem, createData: createItem, setData: updateItem, deleteData: deleteItem } = useRetrieveHelper({
        get: client => client.setting.source.site.get,
        create: client => client.setting.source.site.create,
        update: client => client.setting.source.site.update,
        delete: client => client.setting.source.site.delete,
        handleErrorInCreate(e) {
            if(e.code === "ALREADY_EXISTS") {
                message.showOkMessage("prompt", "已经存在同名的站点。")
            }else{
                return e
            }
        },
        handleErrorInDelete(e) {
            if(e.code == "CASCADE_RESOURCE_EXISTS") {
                const [resource, _, __] = e.info
                const resourceName = {
                    "Illust": "图库项目",
                    "ImportImage": "导入项目",
                    "TrashedImage": "已删除项目",
                    "SourceAnalyseRule": "来源解析规则"
                }[resource]
                message.showOkMessage("prompt", "无法删除此来源站点。", `此来源站点仍存在关联的${resourceName}，请先清理关联项，确保没有意外的级联删除。`)
            }else{
                return e
            }
        }
    })

    return {data, getItem, createItem, updateItem, deleteItem}
})
