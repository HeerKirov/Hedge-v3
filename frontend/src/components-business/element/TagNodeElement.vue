<script setup lang="ts">
import { computed, ref, Ref } from "vue"
import { Tag, Icon } from "@/components/universal"
import { TagAddressType, TagGroupType } from "@/functions/http-client/api/tag"
import { useDraggable } from "@/modules/drag"

const props = defineProps<{
    node: {id: number, name: string, color: string | null, type: TagAddressType, group: TagGroupType}
    draggable?: boolean
    clickable?: boolean
}>()

const properties = computed(() => ({
    isAddr: props.node.type !== "TAG",
    isSequenced: props.node.group === "SEQUENCE" || props.node.group === "FORCE_AND_SEQUENCE",
    isForced: props.node.group === "FORCE" || props.node.group === "FORCE_AND_SEQUENCE",
    isGroup: props.node.group !== "NO"
}))

const dragEvents = useDraggable("tag", () => ({
    id: props.node.id,
    name: props.node.name,
    color: props.node.color
}))

</script>

<template>
    <Tag :color="node.color" :line-style="properties.isAddr ? 'dashed' : 'solid'" :clickable="clickable" :draggable="draggable" v-bind="dragEvents">
        <Icon v-if="properties.isGroup && !properties.isSequenced" icon="object-group"/>
        <Icon v-else-if="properties.isGroup && properties.isSequenced" icon="sort-alpha-down"/>
        <b v-if="properties.isForced">!</b>
        {{node.name}}
    </Tag>
</template>
