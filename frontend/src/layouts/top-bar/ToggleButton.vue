<script setup lang="ts">
import { computed } from "vue"
import { Colors } from "@/constants/ui"
import { computedMutable } from "@/utils/reactivity"
import FilterButton from "./FilterButton.vue"

const props = defineProps<{
    value?: any
    items?: {label?: string, value: any, icon?: string, color?: Colors}[]
    square?: boolean
    disabled?: boolean
}>()

const emit = defineEmits<{
    (e: "update:value", v: any): void
}>()

const click = () => {
    if(index.value !== undefined) {
        index.value = (index.value >= props.items!.length - 1) ? 0 : (index.value + 1)
        emit("update:value", index.value)
    }
}

const index = computedMutable<number | undefined>(() => {
    if(props.items?.length) {
        if(props.value !== undefined) {
            return props.items.findIndex(i => i.value === props.value)
        }else{
            return 0
        }
    }else{
        return undefined
    }
})

const current = computed(() => index.value !== undefined ? props.items![index.value] : undefined)

</script>

<template>
    <FilterButton :square="square" :icon="current?.icon" :type="current?.color" @click="click">{{!square && current ? current.label : undefined}}</FilterButton>
</template>
