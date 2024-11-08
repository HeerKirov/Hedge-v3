<script setup lang="ts">
import { Icon } from "@/components/universal"

const props = defineProps<{
    expanded?: boolean
}>()

const emit = defineEmits<{
    (e: "update:expanded", value: boolean): void
}>()

const click = (e: MouseEvent) => {
    emit("update:expanded", !props.expanded)
    e.stopPropagation()
}

</script>

<template>
    <button :class="$style.button" @click="click">
        <Icon :icon="expanded ? 'caret-down' : 'caret-right'"/>
    </button>
</template>

<style module lang="sass">
.button
    display: inline-block
    color: inherit
    background-color: transparent
    cursor: pointer
    padding: 0 0.25em

    &:hover
        opacity: 0.75
</style>
