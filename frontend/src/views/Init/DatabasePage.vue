<script setup lang="ts">
import { reactive } from "vue"
import { Button } from "@/components/universal"
import { Input, CheckBox } from "@/components/form"
import { BottomLayout } from "@/components/layout"
import { useMessageBox } from "@/services/module/message-box"
import { dialogManager } from "@/services/module/dialog"

const props = defineProps<{
    customLocation: boolean
    storagePath: string
}>()

const emit = defineEmits<{
    (e: "prev"): void
    (e: "submit", customLocation: boolean, storagePath: string): void
}>()

const message = useMessageBox()

const data = reactive({
    customLocation: props.customLocation,
    storagePath: props.storagePath
})

const submit = () => {
    if(data.customLocation) {
        if(data.storagePath.trim() === "") {
            message.showOkMessage("prompt", "存储位置不能设置为空。", "如果不想使用自定义存储位置，请选择“使用默认存储位置”。")
            return
        }
    }
    emit("submit", data.customLocation, data.storagePath)
}

const selectCustomLocation = async () => {
    const location = await dialogManager.openDialog({
        title: "选择存储位置",
        properties: ["openDirectory", "createDirectory"]
    })
    if(location) {
        data.storagePath = location[0]
    }
}

</script>

<template>
    <BottomLayout>
        <h3 class="mb-4">设置存储位置</h3>
        <p class="mb-2">Hedge默认将文件存储于程序默认的存储位置下。使用默认位置，或者启用自定义位置。</p>
        <CheckBox v-model:value="data.customLocation">使用自定义位置</CheckBox>
        <template v-if="data.customLocation">
            <label class="label mt-2">自定义位置</label>
            <Input v-model:value="data.storagePath" placeholder="输入口令"/>
            <Button class="ml-1" mode="filled" type="primary" square icon="file" @click="selectCustomLocation"/>
            <p class="mt-1 secondary-text">自定义存储位置不在Hedge的托管范围内，需要确保该位置可用且可访问，否则存储相关功能是无效的。</p>
        </template>
        <p v-else class="mt-2 secondary-text">您选择了默认存储位置。</p>
        <template #bottom>
            <Button type="primary" mode="light" icon="arrow-left" @click="$emit('prev')">上一步</Button>
            <Button class="float-right" type="primary" mode="filled" icon="arrow-right" @click="submit">下一步</Button>
        </template>
    </BottomLayout>
</template>

<style module lang="sass">

</style>
