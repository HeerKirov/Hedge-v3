<script setup lang="ts" generic="T = string">
import { computed, onMounted, ref, watch } from "vue"

const props = defineProps<{
    value?: T
    items?: { label: string, value: T }[]
    size?: "small" | "std" | "large"
}>()

const emit = defineEmits<{
    (e: "update:value", value: T, index: number): void
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
    <select ref="selectDom" :value="value" :class="[$style.select, $style[`is-size-${size ?? 'std'}`]]" @change="changed">
        <option v-for="item in items" :key="`${item.value}`" :value="item.value">{{item.label}}</option>
    </select>
</template>

<style module lang="sass">
@import "../../styles/base/size"
@import "../../styles/base/color"

.select
    display: inline-block
    vertical-align: middle
    display: inline-block
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
