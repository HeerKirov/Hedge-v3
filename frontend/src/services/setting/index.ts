import { computed, onMounted, ref, toRaw, watch } from "vue"
import { remoteIpcClient } from "@/functions/ipc-client"
import { AuthSetting, BehaviourSetting, StorageSetting } from "@/functions/ipc-client/constants"
import { ServerOption, MetaOption, QueryOption, ImportOption, FindSimilarOption, StorageOption } from "@/functions/http-client/api/setting"
import { useFetchReactive, usePathFetchHelper } from "@/functions/fetch"
import { useAppEnv, useServerStatus } from "@/functions/app"
import { useMessageBox } from "@/modules/message-box"
import { numbers } from "@/utils/primitives"
import { useSetInterval } from "@/utils/process"
import { computedMutable, optionalInstallation, refAsync, toRef } from "@/utils/reactivity"

export function useAppStorageStatus() {
    return useFetchReactive({
        get: client => client.app.storageStatus
    })
}

export function useClientCacheStatus() {
    const message = useMessageBox()
    const cacheStatus = refAsync(null, remoteIpcClient.local.cacheStatus)

    const cleanCache = async () => {
        if(await message.showYesNoMessage("confirm", "确认要清理全部缓存吗?")) {
            await remoteIpcClient.local.cleanAllCacheFiles()
            cacheStatus.value = await remoteIpcClient.local.cacheStatus()
        }
    }

    return {cacheStatus, cleanCache}
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

export function useSettingBehaviour() {
    const value = ref<BehaviourSetting>()

    onMounted(async () => value.value = await remoteIpcClient.setting.behaviour.get())

    watch(value, async (_, o) => {
        if(o !== undefined && value.value !== undefined) {
            await remoteIpcClient.setting.behaviour.set(toRaw(value.value))
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

    useSetInterval(() => {
        if(connectionInfo.value !== null && serverStatus.value.connectionInfo !== null) {
            connectionInfo.value.runningTime = numbers.toHourTimesDisplay(Date.now() - serverStatus.value.connectionInfo.startTime, false)
        }
    }, 1000)

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

export function useLogViewer() {
    const fetchRead = usePathFetchHelper(client => client.app.log.get)

    const { data: logListRes } = useFetchReactive({
        get: client => client.app.log.list
    })

    const logFiles = computed(() => logListRes.value?.toReversed() ?? [])

    const selected = computedMutable<string | null>(o => o ?? logFiles.value?.[0] ?? null)

    const data = ref("")

    let offset = 0

    async function read() {
        if(selected.value) {
            const res = await fetchRead(selected.value, {offset})
            if(res !== undefined) {
                if(res.newOffset !== undefined) offset = res.newOffset
                if(res.text) data.value += res.text
            }
        }
    }

    onMounted(() => {
        watch(selected, () => {
            data.value = ""
            offset = 0
            read().finally()
        }, {immediate: true})
    })

    useSetInterval(read, 5000)

    return {logFiles, selected, data}
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
    return useFetchReactive({
        get: client => client.setting.source.site.list,
        eventFilter: "setting/source-site/changed"
    })
})
