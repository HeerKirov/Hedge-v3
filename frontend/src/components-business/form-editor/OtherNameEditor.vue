<script setup lang="ts">
import { ref } from "vue"
import { Button } from "@/components/universal"
import { Input } from "@/components/form"
import { Flex } from "@/components/layout"
import { useMessageBox } from "@/modules/message-box"
import { checkTagName } from "@/utils/validation"

const props = defineProps<{
    value: string[]
    placeholder?: string
}>()

const emit = defineEmits<{
    (e: "update:value", value: string[]): void
}>()

const message = useMessageBox()

const addTextBox = ref("")

const update = (idx: number, value: string) => {
    emit("update:value", [...props.value.slice(0, idx), value, ...props.value.slice(idx + 1)])
}

const remove = (idx: number) => {
    emit("update:value", [...props.value.slice(0, idx), ...props.value.slice(idx + 1)])
}

const add = () => {
    const text = addTextBox.value.trim()
    if(text) {
        if(checkTagName(text)) {
            emit("update:value", [...props.value, text])
            addTextBox.value = ""
        }else{
            message.showOkMessage("prompt", "不合法的别名。", "别名不能为空，且不能包含 ` \" ' . | 字符。")
        }
    }
}

</script>

<template>
    <Flex v-for="(item, idx) in value" class="mb-1">
        <Input class="mr-1" width="fullwidth" size="small" :value="item" @update:value="update(idx, $event)"/>
        <Button size="small" square icon="times" @click="remove(idx)"/>
    </Flex>
    <Flex>
        <Input class="mr-1" width="fullwidth" size="small" :placeholder="placeholder" v-model:value="addTextBox" update-on-input @blur="add" @enter="add"/>
        <Button size="small" square icon="times" disabled/>
    </Flex>
</template>
