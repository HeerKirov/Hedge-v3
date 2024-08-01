<script setup lang="ts">
import { ref } from "vue"
import { Block, Icon, Button } from "@/components/universal"
import { Input, CheckBox } from "@/components/form"
import { StorageStatus } from "@/functions/http-client/api/app"
import { dialogManager } from "@/modules/dialog"
import { openLocalFile } from "@/modules/others"
import { computedMutable } from "@/utils/reactivity"
import { sleep } from "@/utils/process"

const props = defineProps<{
    connectMode?: "local" | "remote"
    storagePath: string | null
    storageStatus: StorageStatus | undefined
}>()

const emit = defineEmits<{
    (e: "update:storagePath", value: string | null): void
    (e: "refresh:status"): void
}>()

const status = ref<"normal" | "set" | "confirm">("normal")

const form = computedMutable(() => ({
    customLocation: props.storagePath !== null,
    storagePath: props.storagePath
}))

const selectCustomLocation = async () => {
    const location = await dialogManager.openDialog({
        title: "选择存储位置",
        properties: ["openDirectory", "createDirectory"],
        defaultPath: form.value.storagePath ?? undefined
    })
    if(location) {
        form.value.storagePath = location[0]
    }
}

const submit = async () => {
    emit("update:storagePath", form.value.customLocation ? form.value.storagePath : null)
    status.value = "normal"
    await sleep(250)
    emit("refresh:status")
}

const openStorageInExplorer = () => {
    if(props.storageStatus !== undefined) {
        openLocalFile(props.storageStatus.storageDir)
    }
}

</script>

<template>
    <Block v-if="status === 'normal'" class="p-2">
        <div>
            <span v-if="connectMode === 'remote'" :class="[storageStatus?.storageAccessible ? 'has-text-success' : 'has-text-danger', 'is-line-height-std']">
                <Icon class="mx-1" icon="file"/>
                远程服务上的存储: {{ storageStatus?.storageAccessible ? "可访问" : "不可访问" }}
            </span>
            <span v-else-if="!!storagePath" :class="[storageStatus?.storageAccessible ? 'has-text-success' : 'has-text-danger', 'is-line-height-std']">
                <Icon class="mx-1" icon="file"/>
                自定义存储位置: {{ storageStatus?.storageAccessible ? "可访问" : "不可访问" }}
            </span>
            <span v-else class="is-line-height-std">
                <Icon class="mx-1" icon="file"/>
                默认存储位置
            </span>
        </div>
        <div v-if="connectMode === 'local'" class="no-wrap overflow-ellipsis is-font-size-small">
            <code class="selectable">{{storageStatus?.storageDir}}</code>
        </div>
        <div v-if="connectMode === 'local'" class="has-text-right mt-2">
            <Button class="mr-1" icon="folder-open" @click="openStorageInExplorer">打开存储位置</Button>
            <Button icon="edit" @click="status = 'set'">更改存储位置</Button>
        </div>
    </Block>
    <Block v-else-if="status === 'set'" class="p-2">
        <span class="is-line-height-std mr-2">
            <CheckBox v-model:value="form.customLocation">使用自定义位置</CheckBox>
        </span>
        <template v-if="form.customLocation">
            <Input v-model:value="form.storagePath" width="large"/>
            <Button class="ml-1" mode="filled" type="primary" square icon="folder-open" @click="selectCustomLocation"/>
            <p class="secondary-text">自定义存储位置不在Hedge的托管范围内，需要确保该位置可用且可访问，否则存储相关功能是无效的。</p>
        </template>
        <template v-else>
            <p class="secondary-text">您选择了默认存储位置。</p>
        </template>
        <div class="has-text-right mt-1">
            <Button class="mr-1" mode="light" type="primary" icon="save" @click="status = 'confirm'">保存</Button>
            <Button icon="close" @click="status = 'normal'">取消</Button>
        </div>
    </Block>
    <Block v-else class="p-2">
        <div class="has-text-danger m-1">
            即将更改存储位置。更改存储位置不会迁移已有的数据。若有必要，必须手动迁移数据以保证数据可用。
        </div>
        <div class="has-text-right mt-2">
            <Button class="mr-1" mode="light" type="danger" icon="check" @click="submit">确认</Button>
            <Button icon="close" @click="status = 'normal'">取消</Button>
        </div>
    </Block>
</template>
