<script setup lang="ts">
import { Button } from "@/components/universal"
import { Group } from "@/components/layout"
import { Colors } from "@/constants/ui"

defineProps<{
    items: {value: unknown, label: string, icon: string}[]
    value?: unknown
    mode?: "transparent" | "light" | "filled"
    type?: Colors
    size?: "std" | "small" | "large"
}>()

defineEmits<{
    (e: "update:value", v: unknown): void
}>()

</script>

<template>
    <Group single-line>
        <Button v-for="item in items"
                :icon="item.icon" :size="size"
                :mode="mode && value === item.value ? mode : undefined"
                :type="type && value === item.value ? type : undefined"
                :square="value !== item.value"
                @click="$emit('update:value', item.value)">
            {{value === item.value ? item.label : null}}
        </Button>
    </Group>
</template>
