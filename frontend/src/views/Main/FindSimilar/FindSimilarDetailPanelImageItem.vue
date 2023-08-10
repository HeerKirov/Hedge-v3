<script setup lang="ts">
import { computed } from "vue"
import { Icon } from "@/components/universal"
import { useAssets } from "@/functions/app"
import { useFindSimilarDetailPanel } from "@/services/main/find-similar"
import { FindSimilarResultImage } from "@/functions/http-client/api/find-similar"

const props = defineProps<{
    item: FindSimilarResultImage
}>()

defineEmits<{
    (e: "click", event: MouseEvent): void
}>()

const {
    selector: { selectMode, compare, multiple }
} = useFindSimilarDetailPanel()

const { assetsUrl } = useAssets()

const selectedMode = computed(() => {
    if(selectMode.value === "COMPARE" && compare.value.a !== null && compare.value.a.type === props.item.type && compare.value.a.id === props.item.id) {
        return "A"
    }else if(selectMode.value === "COMPARE" && compare.value.b !== null && compare.value.b.type === props.item.type && compare.value.b.id === props.item.id) {
        return "B"
    }else if(selectMode.value === "MULTIPLE" && multiple.value.selected.some(i => i.type === props.item.type && i.id === props.item.id)) {
        return "selected"
    }else{
        return "none"
    }
})

</script>

<template>
    <img :class="$style.img" :src="assetsUrl(item.filePath?.sample)" :alt="`${item.type}-${item.id}`" @click="$emit('click', $event)"/>
    <div :class="$style['id-badge']">
        <Icon v-if="item.type === 'IMPORT_IMAGE'" icon="plus-square"/>
        <Icon v-else icon="id-card"/>
        {{item.id}}
    </div>
    <div v-if="selectedMode === 'A'" :class="[$style.selected, $style.a]">
        <div :class="$style['selected-badge']">A</div>
        <div :class="$style['internal-border']"/>
    </div>
    <div v-else-if="selectedMode === 'B'" :class="[$style.selected, $style.b]">
        <div :class="$style['selected-badge']">B</div>
        <div :class="$style['internal-border']"/>
    </div>
    <div v-else-if="selectedMode === 'selected'" :class="$style.selected"><div :class="$style['internal-border']"/></div>
</template>

<style module lang="sass">
@import "../../../styles/base/size"
@import "../../../styles/base/color"

.img
    width: 100%
    height: 100%
    border-radius: $radius-size-std
    object-fit: cover
    object-position: center

.selected
    position: absolute
    top: 0
    bottom: 0
    left: 0
    right: 0
    pointer-events: none
    border: solid 3px $light-mode-primary
    @media (prefers-color-scheme: dark)
        border-color: $dark-mode-primary
        border-width: 2px

    > .internal-border
        width: 100%
        height: 100%
        box-sizing: border-box
        border: solid 1px $white
        @media (prefers-color-scheme: dark)
            border-color: $black

    > .selected-badge
        position: absolute
        right: 0
        top: 0
        font-weight: 700
        padding: 0 0 0 3px
        border-bottom-left-radius: $radius-size-std

    &.a
        border: solid 3px $light-mode-success
        @media (prefers-color-scheme: dark)
            border-color: $dark-mode-success
        > .selected-badge
            background-color: $light-mode-success
            @media (prefers-color-scheme: dark)
                background-color: $dark-mode-success
    &.b
        border: solid 3px $light-mode-warning
        @media (prefers-color-scheme: dark)
            border-color: $dark-mode-warning
        > .selected-badge
            background-color: $light-mode-warning
            @media (prefers-color-scheme: dark)
                background-color: $dark-mode-warning

.id-badge
    position: absolute
    left: 0
    bottom: 0
    padding: 1px 4px
    border-top-right-radius: $radius-size-std
    border-bottom-left-radius: $radius-size-std
    background-color: rgba(0, 0, 0, 0.65)
    color: $dark-mode-text-color
</style>
