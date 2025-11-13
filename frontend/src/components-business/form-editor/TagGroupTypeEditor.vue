<script setup lang="ts">
import { Icon } from "@/components/universal"
import { CheckBox } from "@/components/form"

defineProps<{
    isSequenceGroup: boolean
    isOverrideGroup: boolean
}>()

const emit = defineEmits<{
    (e: "update:isSequenceGroup", value: boolean): void
    (e: "update:isOverrideGroup", value: boolean): void
}>()

</script>

<template>
    <p>
        <CheckBox :value="isSequenceGroup" @update:value="$emit('update:isSequenceGroup', $event)">
            <Icon class="mr-1" icon="sort-alpha-down"/>排序组
        </CheckBox>
    </p>
    <p>
        <CheckBox :value="isOverrideGroup" @update:value="$emit('update:isOverrideGroup', $event)">
            <Icon class="mr-1" icon="object-group"/>覆盖组
        </CheckBox>
    </p>
</template>
