<script setup lang="ts">
import { Tag } from "@/components/universal"
import { SimpleAnnotation } from "@/functions/http-client/api/annotations"
import { useDraggable } from "@/modules/drag"

const props = defineProps<{
    /**
     * annotation value.
     */
    value: SimpleAnnotation
    /**
     * 是否可拖曳。开启后，注解可以被拖曳，完成拖曳响应。
     */
    draggable?: boolean
    /**
     * 可点击样式。开启后Tag是可点击的样式。
     */
    clickable?: boolean
    /**
     * 是否可被文本选中。
     */
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
