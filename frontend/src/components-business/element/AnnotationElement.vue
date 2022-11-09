<script setup lang="ts">
import { Tag } from "@/components/universal"
import { SimpleAnnotation } from "@/functions/http-client/api/annotations"
import { useDraggable } from "@/modules/drag"

const props = defineProps<{
    value: SimpleAnnotation
    draggable?: boolean
    clickable?: boolean
    selectable?: boolean
}>()

const dragEvents = useDraggable("annotation", () => props.value)

</script>

<template>
    <Tag brackets="[]" :clickable="clickable" :draggable="draggable" v-bind="dragEvents">
        <span v-if="selectable" class="selectable">{{value.name}}</span>
        <template v-else>{{value.name}}</template>
    </Tag>
</template>
