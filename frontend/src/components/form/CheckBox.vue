<script setup lang="ts">
import { ref, watch } from "vue"

const props = defineProps<{
    value?: boolean
    disabled?: boolean
}>()

const emit = defineEmits<{
    (e: "update:value", value: boolean): void
}>()

const value = ref(props.value)

watch(() => props.value, v => value.value = v)

const onUpdate = (e: Event) => {
    value.value = (e.target as HTMLInputElement).checked
    emit("update:value", value.value)
}

</script>

<template>
    <label :class="{[$style.checkbox]: true, [$style.disabled]: disabled}">
        <input type="checkbox" :checked="value" :disabled="disabled" @change="onUpdate"/>
        <slot/>
    </label>
</template>

<style module lang="sass">
.checkbox
    cursor: pointer
    display: inline-block
    line-height: 1
    position: relative
    input[type=checkbox]
        cursor: pointer
        vertical-align: top
        margin: 0 0.25em 0.05em 0
    &.disabled
        cursor: default
        input[type=checkbox]
            cursor: default
</style>
