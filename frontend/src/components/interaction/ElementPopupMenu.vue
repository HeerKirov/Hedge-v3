<script setup lang="ts">
import { ComponentPublicInstance, Ref, toRef } from "vue"
import { MenuItem, useElementPopupMenu } from "@/modules/popup-menu"

const props = defineProps<{
    items?: MenuItem<undefined>[] | (() => MenuItem<undefined>[])
    position?: "top" | "bottom"
    align?: "left" | "center" | "right"
    offsetX?: number
    offsetY?: number
}>()

defineSlots<{
    default(props: {popup(): void, setEl: typeof setEl, attrs: any}): any
}>()

const items = typeof props.items === "function" ? props.items : toRef(props, "items") as Ref<MenuItem<undefined>[]>

const options = {position: props.position, align: props.align, offsetX: props.offsetX, offsetY: props.offsetY}

const { popup, element } = useElementPopupMenu(items, options)

const setEl = (el: ComponentPublicInstance | Element | null | undefined) => {
    if(el instanceof Element) {
        element.value = el
    }else if(el === null || el === undefined) {
        element.value = undefined
    }else{
        element.value = el.$el
    }
}

</script>

<template>
    <slot :popup="popup" :setEl="setEl" :attrs="$attrs"/>
</template>