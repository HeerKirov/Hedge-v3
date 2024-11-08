<script setup lang="ts">

defineProps<{
    count?: number
}>()

</script>

<template>
    <div v-if="count && count > 1" :class="$style.root">
        已选择<b>{{count}}</b>项
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/size"
@use "@/styles/base/color"

.root
    position: absolute
    right: 0
    top: 0
    margin-top: size.$spacing-3
    margin-right: size.$spacing-3
    padding: 0.15rem 0.6rem
    border-radius: size.$radius-size-std
    color: color.$dark-mode-text-color
    background-color: rgba(0, 0, 0, 0.65)
    box-shadow: 0 0 3px rgba(0, 0, 0, 0.65)
</style>
