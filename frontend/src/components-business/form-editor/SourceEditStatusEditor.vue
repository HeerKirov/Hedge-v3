<script setup lang="ts">
import { Select } from "@/components/form"
import { SourceEditStatus } from "@/functions/http-client/api/source-data"

defineProps<{
    value?: SourceEditStatus
}>()

defineEmits<{
    (e: "update:value", value: SourceEditStatus): void
}>()

const items: {value: SourceEditStatus, label: string}[] = [
    {value: "NOT_EDITED", label: "未编辑"},
    {value: "EDITED", label: "已编辑"},
    {value: "ERROR", label: "标记错误"},
    {value: "IGNORED", label: "标记忽略"}
]

</script>

<template>
    <Select :items="items" :value="value" @update:value="$emit('update:value', $event)"/>
</template>
