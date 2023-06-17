<script setup lang="ts">
import { reactive } from "vue"
import { Block, Button } from "@/components/universal"
import { Input, CheckBox } from "@/components/form"
import { SiteCreateForm } from "@/functions/http-client/api/setting"
import { useMessageBox } from "@/modules/message-box"

const emit = defineEmits<{
    (e: "create", form: SiteCreateForm): void
}>()

const message = useMessageBox()

const form = reactive({
    name: "",
    title: "",
    hasSecondaryId: false
})

const submit = () => {
    if(!form.name.trim()) {
        message.showOkMessage("prompt", "站点名称错误。", "站点名称不能设置为空。")
        return
    }else if(!form.title.trim()) {
        message.showOkMessage("prompt", "站点显示名称错误。", "站点显示名称不能设置为空。")
        return
    }
    emit("create", {...form})
    form.name = ""
    form.title = ""
    form.hasSecondaryId = false
}

</script>

<template>
    <Block class="p-2 relative">
        <label class="label">站点名称</label>
        <Input class="mt-1" placeholder="站点名称" v-model:value="form.name"/>
        <label class="label mt-1">站点显示名称</label>
        <Input class="mt-1" placeholder="站点显示名称" v-model:value="form.title"/>
        <div class="is-line-height-std"><CheckBox v-model:value="form.hasSecondaryId">站点拥有二级ID</CheckBox></div>
        <Button class="mt-2" type="success" icon="plus" @click="submit">添加站点</Button>
    </Block>
</template>
