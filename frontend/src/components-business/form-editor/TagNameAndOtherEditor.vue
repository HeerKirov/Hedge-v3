<script setup lang="ts">
import { Input, ColorPicker } from "@/components/form"
import { Flex } from "@/components/layout"
import { OtherNameEditor } from "@/components-business/form-editor"
import { UsefulColors } from "@/constants/ui"

const props = defineProps<{
    name: string
    otherNames: string[]
    color: UsefulColors | null
    colorEnabled?: boolean
}>()

const emit = defineEmits<{
    (e: "update", values: [string, string[], string | null]): void
    (e: "update:name", name: string): void
    (e: "update:otherNames", otherNames: string[]): void
    (e: "update:color", color: UsefulColors | null): void
    (e: "save"): void
}>()

const setName = (v: string) => {
    emit("update:name", v)
    emit("update", [v, props.otherNames, props.color])
}
const setOtherNames = (v: string[]) => {
    emit("update:otherNames", v)
    emit("update", [props.name, v, props.color])
}
const setColor = (v: UsefulColors | null) => {
    emit("update:color", v)
    emit("update", [props.name, props.otherNames, v])
}

</script>

<template>
    <Flex class="mb-1">
        <ColorPicker v-if="colorEnabled" class="mr-1" :value="color ?? undefined" @update:value="setColor"/>
        <Input placeholder="标签名称" width="fullwidth" :value="name" @update:value="setName" @enter="$emit('save')" auto-focus update-on-input/>
    </Flex>
    <OtherNameEditor placeholder="标签别名" :value="otherNames" @update:value="setOtherNames"/>
</template>
