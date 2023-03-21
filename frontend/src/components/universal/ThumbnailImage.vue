<script setup lang="ts">
import { computed } from "vue"
import { Icon } from "@/components/universal"
import { useAssets } from "@/functions/app"

const props = defineProps<{
    file?: string | null
    alt?: string
    numTagValue?: number,
    minHeight?: string,
    maxHeight?: string
}>()

const { assetsUrl } = useAssets()

const style = computed(() => ({
    "min-height": props.minHeight ?? "4rem",
    "max-height": props.maxHeight ?? "12rem"
}))

</script>

<template>
    <div :class="$style['thumbnail-image']">
        <img :src="assetsUrl(props.file ?? null)" :alt="alt" :style="style"/>
        <div v-if="numTagValue !== undefined" :class="$style['num-tag']">
            <Icon icon="images"/>
            {{numTagValue}}
        </div>
    </div>
</template>

<style module lang="sass">
@import "../../styles/base/size"
@import "../../styles/base/color"

.thumbnail-image
    text-align: center
    position: relative
    > img
        width: 100%
        box-sizing: border-box
        object-fit: contain
        object-position: center
        border-radius: $radius-size-std
        border: solid 1px $light-mode-border-color
        @media (prefers-color-scheme: dark)
            border-color: $dark-mode-border-color

    > .num-tag
        position: absolute
        right: 0.35rem
        top: 0.35rem
        padding: 0.125rem 0.25rem
        border-radius: $radius-size-std
        color: $dark-mode-text-color
        background-color: rgba(0, 0, 0, 0.65)
</style>
