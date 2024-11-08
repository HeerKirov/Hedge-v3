<script setup lang="ts">

defineProps<{
    singleLine?: boolean
}>()

</script>

<template>
    <div :class="{[$style.group]: true, [$style.singleLine]: singleLine}">
        <slot/>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/size"

.group
    > *
        display: inline-block
        vertical-align: middle
        &:not(:last-child)
            margin-right: size.$spacing-1
    &:not(.single-line)
        > *
            margin-bottom: size.$spacing-1
</style>
