<script setup lang="ts">
import { computed } from "vue"
import { Button } from "@/components/universal"
import { ElementPopupMenu } from "@/components/interaction"
import { MenuItem } from "@/modules/popup-menu"
import { arrays } from "@/utils/primitives"

defineOptions({
    inheritAttrs: false
})

const props = withDefaults(defineProps<{
    value?: number
    max?: number
    min?: number
}>(), {
    value: 3,
    max: 16,
    min: 3
})

const emit = defineEmits<{
    (e: "update:value", v: number): void
}>()

const menuItems = computed(() => arrays.newArray(props.max - props.min + 1, i => (<MenuItem<undefined>>{
    type: "radio",
    label: `${i + props.min} 列`,
    checked: props.value === i + props.min,
    click() {
        emit("update:value", i + props.min)
    }
})))

</script>

<template>
    <ElementPopupMenu :items="menuItems" position="bottom" v-slot="{ setEl, popup }">
        <Button v-bind="$attrs" :ref="setEl" class="flex-item no-grow-shrink px-3" icon="columns" @click="popup">{{value}}</Button>
    </ElementPopupMenu>
</template>
