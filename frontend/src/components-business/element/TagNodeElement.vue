<script setup lang="ts">
import { Tag, Icon } from "@/components/universal"
import { TagAddressType } from "@/functions/http-client/api/tag"
import { useDraggable } from "@/modules/drag"
import { UsefulColors } from "@/constants/ui"

const props = defineProps<{
    node: {id: number, name: string, color: UsefulColors | null, type: TagAddressType, isSequenceGroup: boolean, isOverrideGroup: boolean}
    draggable?: boolean
    clickable?: boolean
}>()

const dragEvents = useDraggable("tag", () => ({
    id: props.node.id,
    name: props.node.name,
    color: props.node.color
}))

</script>

<template>
    <Tag :color="node.color ?? undefined" :line-style="props.node.type !== 'TAG' ? 'dashed' : 'solid'" :clickable="clickable" :draggable="draggable" v-bind="dragEvents">
        <Icon v-if="node.isSequenceGroup" icon="sort-alpha-down"/>
        <Icon v-if="node.isOverrideGroup" icon="object-group"/>
        {{node.name}}
    </Tag>
</template>
