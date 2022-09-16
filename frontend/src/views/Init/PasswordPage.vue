<script setup lang="ts">
import { reactive } from "vue"
import { Button } from "@/components/universal"
import { CheckBox, Input } from "@/components/form"
import { BottomLayout } from "@/components/layout"
import { useMessageBox } from "@/services/module/message-box"

const props = defineProps<{
    hasPassword: boolean
    password: string
}>()

const emit = defineEmits<{
    (e: "submit", hasPassword: boolean, password: string): void
}>()

const message = useMessageBox()

const data = reactive({
    hasPassword: props.hasPassword,
    password: props.password,
    checkPassword: props.password
})

const submit = () => {
    if(data.hasPassword) {
        if(data.password.trim() === "") {
            message.showOkMessage("prompt", "口令不能设置为空。", "如果不想使用口令，请取消勾选“使用口令”。")
            return
        }else if(data.password !== data.checkPassword) {
            message.showOkMessage("prompt", "确认口令与输入的口令不一致。")
            return
        }
    }
    emit("submit", data.hasPassword, data.password)
}

</script>

<template>
    <BottomLayout>
        <h3 class="mb-4">设置口令</h3>
        <p class="mb-2">设定登录口令，每次打开Hedge之前都会进行验证，阻止不希望的访问。</p>
        <CheckBox v-model:value="data.hasPassword">使用口令</CheckBox>
        <template v-if="data.hasPassword">
            <label class="label mt-2">输入口令</label>
            <Input v-model:value="data.password" type="password" placeholder="输入口令"/>
            <label class="label mt-2">确认口令</label>
            <Input v-model:value="data.checkPassword" type="password" placeholder="确认口令"/>
        </template>
        <p v-else class="mt-2 secondary-text">您选择了不设置口令。App打开时不会进行验证，允许任何访问。</p>

        <template #bottom>
            <Button class="float-right" type="primary" mode="filled" icon="arrow-right" @click="submit">下一步</Button>
        </template>
    </BottomLayout>
</template>

<style module lang="sass">

</style>
