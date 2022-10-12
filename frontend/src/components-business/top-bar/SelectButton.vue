<script setup lang="ts">
import { computed } from "vue"
import { PopupMenu } from "@/components/interaction"
import { MenuItem } from "@/modules/popup-menu"
import { Colors } from "@/constants/ui"
import { computedMutable } from "@/utils/reactivity"
import FilterButton from "./FilterButton.vue"

const props = defineProps<{
    value?: any
    items?: {label: string, value: any, icon?: string, color?: Colors}[]
    square?: boolean
    disabled?: boolean
}>()

const emit = defineEmits<{
    (e: "update:value", v: any): void
}>()

const click = (newValue: any) => () => {
    value.value = newValue
    emit("update:value", newValue)
}

const menuItems = computed<MenuItem<undefined>[]>(() => props.items?.map(item => ({type: "normal", label: item.label, click: click(item.value)})) ?? [])

const value = computedMutable(() => props.value)

const current = computed(() => {
    if(value.value !== undefined && props.items?.length) {
        return props.items.find(i => i.value === value.value)
    }else if(props.items?.length) {
        return props.items[0]
    }else{
        return undefined
    }
})

</script>

<template>
    <PopupMenu :items="menuItems" v-slot="{ popup, setEl }" position="bottom" align="left">
        <FilterButton :ref="setEl" expose-el :square="square" :icon="current?.icon" :type="current?.color" @click="popup">{{!square && current ? current.label : undefined}}</FilterButton>
    </PopupMenu>
</template>
