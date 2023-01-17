<script setup lang="ts">
import { onMounted, ref, watch } from "vue"

const props = defineProps<{
    value?: string
    items?: { label: string, value: string }[]
    size?: "small" | "std" | "large"
}>()

const emit = defineEmits<{
    (e: "update:value", value: string, index: number): void
}>()

const selectDom = ref<HTMLSelectElement>()

const changed = (e: Event) => {
    if(props.items != undefined) {
        const idx = (e.target as HTMLSelectElement).selectedIndex
        const value = props.items[idx]?.value
        if(value != undefined) {
            emit("update:value", value, idx)
        }
    }
}

onMounted(watchProps)

watch(() => [props.items, props.value], watchProps)

function watchProps() {
    if(selectDom.value != undefined && props.items != undefined && props.items.length > 0) {
        if(props.value != undefined) {
            const idx = props.items.findIndex(item => item.value === props.value)
            if(idx >= 0) selectDom.value.selectedIndex = idx
        }else{
            emit("update:value", props.items[0].value, 0)
        }
    }
}

</script>

<template>
    <div :class="[$style.select, $style[`is-size-${size ?? 'std'}`]]">
        <select ref="selectDom" @change="changed">
            <option v-for="item in items" :key="item.value" :value="item.value" :selected="item.value === value">{{item.label}}</option>
        </select>
    </div>
</template>

<style module lang="sass">
@import "../../styles/base/size"
@import "../../styles/base/color"

.select
    display: inline-block
    position: relative
    vertical-align: top
    select
        display: block
        outline: none
        line-height: 1.2
        height: $element-height-std
        padding: 0 0.75em 0 0.75em
        border: 1px solid $light-mode-border-color
        border-radius: $radius-size-std
        @media (prefers-color-scheme: dark)
            border-color: $dark-mode-border-color

.is-size-small
    font-size: $font-size-small
    height: $element-height-small
.is-size-std
    font-size: $font-size-std
    height: $element-height-std
.is-size-large
    font-size: $font-size-large
    height: $element-height-large
</style>
