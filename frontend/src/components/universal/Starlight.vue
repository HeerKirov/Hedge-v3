<script setup lang="ts">
import { computed } from "vue"
import { Icon } from "@/components/universal"
import { numbers } from "@/utils/primitives"

const props = withDefaults(defineProps<{
    value?: number | null
    showText?: boolean
    editable?: boolean
    mode?: "colorful" | "none"
}>(), {
    showText: true,
    mode: "colorful"
})

const emit = defineEmits<{
    (e: "update:value", value: number | null): void
}>()

const stdValue = computed(() => props.value !== null && props.value !== undefined ? numbers.roundNDecimal(props.value ?? 0, 1) : null)

const cnt = computed(() => {
    if(stdValue.value !== null) {
        const count = Math.floor(stdValue.value)
        const hasHalf = stdValue.value > count
        const emptyCount = hasHalf ? (4 - count) : (5 - count)
        return {count, hasHalf, emptyCount}
    }else{
        return {count: 0, hasHalf: false, emptyCount: 5}
    }
})

const color = computed(() => props.mode === "colorful" ? [undefined, "secondary", "info", "success", "warning", "danger"][cnt.value.count] : undefined)

const click = (value: number) => {
    if(props.editable) {
        emit("update:value", props.value !== value ? value : null)
    }
}

</script>

<template>
    <span :class="{[$style.editable]: editable, [`has-text-${color}`]: !!color}">
        <Icon v-for="i in cnt.count" icon="star" @click="click(i)"/>
        <Icon v-if="cnt.hasHalf" icon="star-half-stroke" @click="click(cnt.count + 1)"/>
        <Icon v-for="i in cnt.emptyCount" icon="star-regular" @click="click(cnt.count + i + (cnt.hasHalf ? 1 : 0))"/>
        <b v-if="showText && stdValue !== null" :class="$style.text">{{stdValue}}</b>
    </span>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.editable > svg
    cursor: pointer

.text
    display: inline-block
    width: 1em
    text-align: center
    user-select: none
    padding-left: size.$spacing-1
</style>
