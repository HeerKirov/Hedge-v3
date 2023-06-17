<script setup lang="ts">
import { Block, Button } from "@/components/universal"
import { Input, CheckBox } from "@/components/form"
import { SiteUpdateForm } from "@/functions/http-client/api/setting"
import { useMessageBox } from "@/modules/message-box"
import { computedMutable } from "@/utils/reactivity"

const props = defineProps<{
    name: string
    title: string
    hasSecondaryId: boolean
    ordinal: number
}>()

const emit = defineEmits<{
    (e: "update", form: SiteUpdateForm): void
    (e: "delete"): void
}>()

const message = useMessageBox()

const content = computedMutable(() => ({
    title: props.title
}))

const submit = () => {
    if(!content.value.title.trim()) {
        message.showOkMessage("prompt", "站点显示名称错误。", "站点显示名称不能设置为空。")
        return
    }
    emit("update", {...content.value})
}

const trash = async () => {
    if(await message.showYesNoMessage("warn", "确定删除此站点吗？", "此操作不可撤回。")) {
        emit("delete")
    }
}

</script>

<template>
    <Block class="p-2 relative">
        <label class="label">站点名称</label>
        <Input class="mt-1" placeholder="站点名称" :value="name" disabled/>
        <label class="label mt-1">站点显示名称</label>
        <Input class="mt-1" placeholder="站点显示名称" v-model:value="content.title"/>
        <div class="is-line-height-std"><CheckBox :value="hasSecondaryId" disabled>站点拥有二级ID</CheckBox></div>
        <div class="mt-2">
            <Button type="primary" icon="save" @click="submit">保存站点</Button>
            <Button class="ml-1" type="danger" icon="trash" square @click="trash"/>
        </div>
    </Block>
</template>
