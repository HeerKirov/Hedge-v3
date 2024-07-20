<script setup lang="ts">
import { Button } from "@/components/universal"
import { PlayBoard } from "@/components/data"
import { useAssets } from "@/functions/app"
import { useMouseHover } from "@/utils/sensors"
import { ImageProps, useImagePreviewContext } from "./context"

const props = defineProps<{
    context: ImageProps
    embed?: boolean
}>()

const emit = defineEmits<{
    (e: "close"): void
}>()

const { assetsUrl } = useAssets()

const { targetFile, arrow } = useImagePreviewContext(props.context, () => emit("close"))

const arrowLeftHover = useMouseHover()

const arrowRightHover = useMouseHover()

</script>

<template>
    <PlayBoard :src="assetsUrl(targetFile)"/>
    <div :class="$style['left-area']" @mouseover="arrowLeftHover.onMouseover" @mouseleave="arrowLeftHover.onMouseleave">
        <Button v-if="arrowLeftHover?.hover?.value" :class="$style.arrow" square round size="large" icon="angle-left" @click="arrow('left')"/>
    </div>
    <div :class="$style['right-area']" @mouseover="arrowRightHover.onMouseover" @mouseleave="arrowRightHover.onMouseleave">
        <Button v-if="arrowRightHover?.hover?.value" :class="$style.arrow" square round size="large" icon="angle-right" @click="arrow('right')"/>
        <Button v-if="embed && arrowRightHover?.hover?.value" :class="$style.close" square round size="large" icon="close" @click="$emit('close')"/>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/size"

.left-area
    position: absolute
    left: 0
    top: 0
    bottom: 25%
    width: calc(#{$element-height-large} + #{$spacing-4 * 2})
    > .arrow
        position: absolute
        left: 0
        top: 66.7%
        width: $element-height-large
        height: #{$element-height-large * 2}
        transform: translateY(-50%)
        border-radius: 0 50% 50% 0

.right-area
    position: absolute
    right: 0
    top: 0
    bottom: 25%
    width: calc(#{$element-height-large} + #{$spacing-4 * 2})
    > .arrow
        position: absolute
        right: 0
        top: 66.7%
        width: $element-height-large
        height: #{$element-height-large * 2}
        transform: translateY(-50%)
        border-radius: 50% 0 0 50%
    > .close
        position: absolute
        right: $spacing-2
        top: $spacing-2
</style>