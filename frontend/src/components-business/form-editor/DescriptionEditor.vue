<script setup lang="ts">
import { Input } from "@/components/form"
import { KeyEvent } from "@/modules/keyboard"

defineProps<{
    value: string
    enterToSave?: boolean
}>()

defineEmits<{
    (e: "update:value", value: string): void
    (e: "enter", value: KeyEvent): void
}>()

</script>

<template>
    <div>
        <Input type="textarea" placeholder="描述" width="fullwidth" size="small"
               :value="value" @update:value="$emit('update:value', $event)" @enter="$emit('enter', $event)"
               :flip-enter="enterToSave" update-on-input auto-focus/>
    </div>
</template>
