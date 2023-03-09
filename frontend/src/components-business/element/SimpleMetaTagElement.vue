<script setup lang="ts">
import { computed } from "vue"
import { Tag } from "@/components/universal"
import { MetaTagTypes, MetaTagValues, SimpleAuthor, SimpleTopic } from "@/functions/http-client/api/all"
import { AUTHOR_TYPE_ICONS, META_TYPE_ICONS, TOPIC_TYPE_ICONS } from "@/constants/entity"
import { useDraggable } from "@/modules/drag"
import { Colors } from "@/constants/ui"
import { toRef } from "@/utils/reactivity"

const props = defineProps<{
    /**
     * meta tag类型。
     */
    type: MetaTagTypes
    /**
     * meta tag值。
     */
    value: MetaTagValues
    /**
     * 使用额外的颜色覆盖。
     */
    color?: Colors
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
    /**
     * 是否使用div包裹一层。
     */
    wrappedByDiv?: boolean
}>()

defineEmits<{
    (e: "click", event: MouseEvent): void
    (e: "dblclick", event: MouseEvent): void
    (e: "contextmenu", event: MouseEvent): void
}>()

const type = toRef(props, "type")
const data = toRef(props, "value")

const dragEvents = useDraggable(type, data)

const icon = computed(() => {
    if(props.type === "author") {
        return AUTHOR_TYPE_ICONS[(props.value as SimpleAuthor).type]
    }else if(props.type === "topic") {
        return TOPIC_TYPE_ICONS[(props.value as SimpleTopic).type]
    }else{
        return META_TYPE_ICONS["TAG"]
    }
})

</script>

<template>
    <div v-if="wrappedByDiv">
        <Tag :color="color ?? value.color ?? undefined" :icon="icon" :clickable="clickable" :draggable="draggable" v-bind="dragEvents" @click="$emit('click', $event)" @dblclick="$emit('dblclick', $event)" @contextmenu="$emit('contextmenu', $event)">
            <span v-if="selectable" class="selectable">{{value.name}}</span>
            <template v-else>{{value.name}}</template>
        </Tag>
        <slot name="behind"/>
    </div>
    <template v-else>
        <Tag :color="color ?? value.color ?? undefined" :icon="icon" :clickable="clickable" :draggable="draggable" v-bind="dragEvents" @click="$emit('click', $event)" @dblclick="$emit('dblclick', $event)" @contextmenu="$emit('contextmenu', $event)">
            <span v-if="selectable" class="selectable">{{value.name}}</span>
            <template v-else>{{value.name}}</template>
        </Tag>
    </template>
</template>
