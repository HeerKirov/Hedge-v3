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
@import "../../styles/base/size"

.group
    > *
        display: inline-block
        vertical-align: super
        &:not(:last-child)
            margin-right: $spacing-1
    &:not(.single-line)
        > *
            margin-bottom: $spacing-1
</style>
