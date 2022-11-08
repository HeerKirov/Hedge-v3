<script setup lang="ts">
import { Select } from "@/components/form"
import { TagAddressType } from "@/functions/http-client/api/tag"

defineProps<{
    value: TagAddressType
}>()

const emit = defineEmits<{
    (e: "update:value", value: TagAddressType): void
    (e: "save"): void
}>()


const TAG_TYPE_SELECT_ITEMS = [
    {label: "标签", value: "TAG"},
    {label: "地址段", value: "ADDR"},
    {label: "虚拟地址段", value: "VIRTUAL_ADDR"}
]

const submit = (value: TagAddressType) => {
    emit("update:value", value)
    emit("save")
}

</script>

<template>
    <Select :items="TAG_TYPE_SELECT_ITEMS" :value="value" @update:value="submit"/>
</template>
