<script setup lang="ts">
import { computed } from "vue"
import { Select } from "@/components/form"
import { useSettingSite } from "@/services/setting"

const props = defineProps<{
    site: string | null
    value: string
    size?: "small" | "std" | "large"
}>()

const emit = defineEmits<{
    (e: "update:value", value: string): void
}>()

const { data: sites } = useSettingSite()

const currentSite = computed(() => sites.value?.find(i => i.name === props.site))

const items = computed(() => currentSite.value?.tagTypes.map(t => ({label: t, value: t})))

const updateValue = (value: string) => emit("update:value", value)

</script>

<template>
    <Select :items="items" :size="size" :value="value" @update:value="updateValue"/>
</template>
