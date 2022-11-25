<script setup lang="ts">
import { toRefs } from "vue"
import { useTagDroppable } from "./context"

const props = defineProps<{
    parentId: number | null
    ordinal: number
}>()

const { parentId, ordinal } = toRefs(props)

const { dragover, ...dropEvents } = useTagDroppable(parentId, ordinal)

</script>

<template>
    <div :class="{[$style.dragover]: dragover}" v-bind="dropEvents"/>
</template>

<style module lang="sass">
.dragover
    background-color: rgba(127, 127, 127, 0.5)
</style>
