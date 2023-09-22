<script setup lang="ts">
import { computed } from "vue"
import { Select } from "@/components/form"
import { useSettingSite } from "@/services/setting"

defineProps<{
    value: string | null
    size?: "small" | "std" | "large"
}>()

const emit = defineEmits<{
    (e: "update:value", value: string | null): void
}>()

const { data: sites } = useSettingSite()

const NOT_SELECT_ITEM = {label: "未选择", value: "__UNDEFINED"}

const items = computed(() => [NOT_SELECT_ITEM, ...sites.value?.map(s => ({label: s.title, value: s.name})) ?? []])

const updateValue = (value: string | undefined) => {
    if(value === "__UNDEFINED" || !value) {
        emit("update:value", null)
    }else{
        emit("update:value", value)
    }
}

</script>

<template>
    <Select :items="items" :size="size" :value="value || '__UNDEFINED'" @update:value="updateValue"/>
</template>
