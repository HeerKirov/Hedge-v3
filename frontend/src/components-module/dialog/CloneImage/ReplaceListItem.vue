<script setup lang="ts">
import { ThumbnailImage } from "@/components/universal"
import { DetailIllust } from "@/functions/http-client/api/illust"
import ReplaceListItemMetadata from "./ReplaceListItemMetadata.vue"
import { useDraggable, useDroppable } from "@/modules/drag";

const props = defineProps<{
    index: number
    from: number | DetailIllust | null
    to: number | DetailIllust | null
}>()

const emit = defineEmits<{
    (e: "preview", index: number, key: "from" | "to"): void
    (e: "drop", index: number, key: "from" | "to", illustId: number): void
}>()

const dragEventsFrom = useDraggable("illusts", () => typeof props.from === "object" && props.from !== null ? [props.from] : [])

const dragEventsTo = useDraggable("illusts", () => typeof props.to === "object" && props.to !== null ? [props.to] : [])

const dropEventsFrom = useDroppable("illusts", (items) => { if(items.length > 0) emit("drop", props.index, "from", items[0].id) })

const dropEventsTo = useDroppable("illusts", (items) => { if(items.length > 0) emit("drop", props.index, "to", items[0].id) })

</script>

<template>
    <div :class="[$style.root, 'flex', 'jc-between', 'gap-1']">
        <div :class="$style.metadata">
            <ReplaceListItemMetadata v-if="typeof from === 'object' && from !== null" :value="from" align="right"/>
        </div>
        <div :class="$style.image">
            <ThumbnailImage class="is-cursor-zoom-in" max-height="12rem" :file="typeof from === 'object' && from !== null ? from.filePath.thumbnail : null" :draggable="typeof from === 'object' && from !== null"
                            @click="$emit('preview', index, 'from')" @dragstart="dragEventsFrom.onDragstart" @dragend="dragEventsFrom.onDragend"
                            @dragenter="dropEventsFrom.onDragenter" @dragleave="dropEventsFrom.onDragleave" @dragover="dropEventsFrom.onDragover" @drop="dropEventsFrom.onDrop"/>
        </div>
        <div :class="$style.image">
            <ThumbnailImage class="is-cursor-zoom-in" max-height="12rem" :file="typeof to === 'object' && to !== null ? to.filePath.thumbnail : null" :draggable="typeof to === 'object' && to !== null"
                            @click="$emit('preview', index, 'to')" @dragstart="dragEventsTo.onDragstart" @dragend="dragEventsTo.onDragend"
                            @dragenter="dropEventsTo.onDragenter" @dragleave="dropEventsTo.onDragleave" @dragover="dropEventsTo.onDragover" @drop="dropEventsTo.onDrop"/>
        </div>
        <div :class="$style.metadata">
            <ReplaceListItemMetadata v-if="typeof to === 'object' && to !== null" :value="to" align="left"/>
        </div>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/size"
.root
    --var-image-size: 6rem
    @media screen and (min-width: 800px)
        --var-image-size: 10rem
    @media screen and (min-width: 1024px)
        --var-image-size: 12rem

.metadata
    flex: 0 0 auto
    width: calc(50% - var(--var-image-size) - size.$spacing-1 * 3 / 2)

.image
    flex: 0 0 auto
    width: var(--var-image-size)
    height: var(--var-image-size)
</style>