<script setup lang="ts">
import { ref } from "vue"
import { Block, Icon, Button } from "@/components/universal"
import { Input, CheckBox } from "@/components/form"
import { MiddleLayout } from "@/components/layout"
import { dialogManager } from "@/services/module/dialog"
import { useServiceStorageInfo } from "@/services/setting"
import { computedMutable } from "@/utils/reactivity"
import { sleep } from "@/utils/process"

const props = defineProps<{
    storagePath: string | null
}>()

const emit = defineEmits<{
    (e: "update:storagePath", value: string | null): void
}>()

const { data: storageInfo, refresh: refreshStorageInfo } = useServiceStorageInfo()

const status = ref<"normal" | "set" | "confirm">("normal")

const form = computedMutable(() => ({
    customLocation: props.storagePath !== null,
    storagePath: props.storagePath
}))

const selectCustomLocation = async () => {
    const location = await dialogManager.openDialog({
        title: "选择存储位置",
        properties: ["openDirectory", "createDirectory"],
        defaultPath: storageInfo.value?.storageDir
    })
    if(location) {
        form.value.storagePath = location[0]
    }
}

const submit = async () => {
    emit("update:storagePath", form.value.customLocation ? form.value.storagePath : null)
    status.value = "normal"
    await sleep(250)
    refreshStorageInfo()
}

//TODO 需要client支持“打开目录位置”的功能

</script>

<template>
    <Block v-if="status === 'normal'" class="p-2">
        <div>
            <span v-if="!!storagePath" :class="[storageInfo?.accessible ? 'has-text-success' : 'has-text-danger', 'is-line-height-std']">
                <Icon class="mx-1" icon="file"/>
                自定义位置: {{ storageInfo?.accessible ? "可访问" : "不可访问" }}
            </span>
            <span v-else class="is-line-height-std">
                <Icon class="mx-1" icon="file"/>
                默认位置
            </span>
            <Button class="float-right" @click="status = 'set'">更改存储位置</Button>
        </div>
        <div class="no-wrap overflow-ellipsis is-font-size-small">
            <code class="selectable">{{ storageInfo?.storageDir }}</code>
        </div>
    </Block>
    <Block v-else-if="status === 'set'" class="p-2">
        <span class="is-line-height-std mr-2">
            <CheckBox v-model:value="form.customLocation">使用自定义位置</CheckBox>
        </span>
        <template v-if="form.customLocation">
            <Input v-model:value="form.storagePath" width="large"/>
            <Button class="ml-1" mode="filled" type="primary" square icon="file" @click="selectCustomLocation"/>
            <p class="secondary-text">自定义存储位置不在Hedge的托管范围内，需要确保该位置可用且可访问，否则存储相关功能是无效的。</p>
        </template>
        <template v-else>
            <p class="secondary-text">您选择了默认存储位置。</p>
        </template>
        <Button class="float-right" @click="status = 'normal'">取消</Button>
        <Button class="float-right mr-1" mode="light" type="primary" @click="status = 'confirm'">保存</Button>
    </Block>
    <Block v-else class="p-2">
        <MiddleLayout>
            <template #left>
                <span class="has-text-danger">
                    即将更改存储位置。更改存储位置不会迁移已有的数据。若有必要，必须手动迁移数据以保证数据可用。
                </span>
            </template>
            <template #right>
                <Button class="mr-1" mode="light" type="primary" @click="submit">确认</Button>
                <Button @click="status = 'normal'">取消</Button>
            </template>
        </MiddleLayout>
    </Block>
</template>

<style module lang="sass">

</style>
