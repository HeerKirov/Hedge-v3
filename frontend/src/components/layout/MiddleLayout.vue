<script setup lang="ts">
import { Flex } from "@/components/layout"
</script>

<template>
    <div :class="$style['middle-layout']">
        <Flex v-if="!!$slots.left" :class="$style['layout-container']" horizontal="left" :shrink="0">
            <slot name="left"/>
        </Flex>
        <Flex v-if="!!$slots.default" :class="$style['layout-container']" horizontal="center" :shrink="0">
            <slot/>
        </Flex>
        <Flex v-if="!!$slots.right" :class="$style['layout-container']" horizontal="right" :shrink="0">
            <slot name="right"/>
        </Flex>
    </div>
</template>

<style module lang="sass">
.middle-layout
    display: flex
    flex-wrap: nowrap
    justify-content: space-between
    width: 100%
    height: 100%

    > .layout-container
        align-items: center

        min-width: 2rem
        &:not(:empty)
            min-width: 8rem

        &:first-child
            justify-content: flex-start
        &:last-child
            justify-content: flex-end
        &:not(:first-child):not(:last-child)
            justify-content: center
            min-width: 50%
            max-width: 75%
</style>
