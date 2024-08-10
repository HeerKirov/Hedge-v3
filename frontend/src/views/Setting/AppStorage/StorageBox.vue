<script setup lang="ts">
import { computed, ref } from "vue"
import { Block, Icon, Button } from "@/components/universal"
import { Input, CheckBox } from "@/components/form"
import { dialogManager } from "@/modules/dialog"
import { openLocalFile } from "@/modules/others"
import { useAppStorageStatus, useSettingAuth } from "@/services/setting"
import { computedMutable } from "@/utils/reactivity"
import { sleep } from "@/utils/process"
import { numbers } from "@/utils/primitives"

const props = defineProps<{
    storagePath: string | null
}>()

const emit = defineEmits<{
    (e: "update:storagePath", value: string | null): void
}>()

const { data: settingAuth } = useSettingAuth()

const { data: storageStatus, refresh: refreshStorageStatus } = useAppStorageStatus()

const storageSize = computed(() => {
    if(storageStatus.value !== undefined) {
        const mib = storageStatus.value.storageSize / (1024 * 1024)
        if(mib >= 1024) {
            return `${numbers.round2decimal(mib / 1024)}GiB`
        }else{
            return `${numbers.round2decimal(mib)}MiB`
        }
    }else{
        return ""
    }
})

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
    refreshStorageStatus()
}

const openStorageInExplorer = () => {
    if(storageStatus.value !== undefined) {
        openLocalFile(storageStatus.value.storageDir)
    }
}

</script>

<template>
    <Block v-if="status === 'normal'" class="p-2">
        <div>
            <span v-if="settingAuth?.mode === 'remote'" class="has-text-primary is-line-height-std">
                <Icon class="mx-1" icon="globe"/>
                远程存储位置 <span class="is-font-size-small">(<code>{{ settingAuth?.remote?.host }}</code>)</span>
            </span>
            <span v-else-if="!!storagePath" :class="[storageStatus?.storageAccessible ? 'has-text-success' : 'has-text-danger', 'is-line-height-std']">
                <Icon class="mx-1" icon="file-pen"/>
                自定义存储位置: {{ storageStatus?.storageAccessible ? "可访问" : "不可访问" }}
            </span>
            <span v-else class="is-line-height-std">
                <Icon class="mx-1" icon="file"/>
                默认存储位置
            </span>
        </div>
        <div v-if="settingAuth?.mode === 'local'" class="no-wrap overflow-ellipsis is-font-size-small mb-1">
            <code class="selectable">{{storageStatus?.storageDir}}</code>
        </div>
        <div class="flex">
            <div class="flex-item is-line-height-std w-100 ml-1">当前存储大小：<b>{{ storageSize }}</b></div>
            <template v-if="settingAuth?.mode === 'local'">
                <Button class="flex-item no-grow-shrink mr-1" icon="folder-open" @click="openStorageInExplorer">打开存储位置</Button>
                <Button class="flex-item no-grow-shrink" icon="edit" @click="status = 'set'">更改存储位置</Button>
            </template>
            <div v-else class="flex-item w-50 has-text-right is-line-height-std secondary-text mr-2">无法查看或更改远程位置的存储。</div>
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
