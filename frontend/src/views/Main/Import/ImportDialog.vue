<script setup lang="ts">
import { computed } from "vue"
import { DialogBox } from "@/components/interaction"
import { numbers } from "@/utils/primitives"

const props = defineProps<{
    progress: {value: number, max: number}
    progressing: boolean
}>()

const progressingStyle = computed(() => ({
    'width': props.progress.max > 0 ? `${numbers.round2decimal(props.progress.value * 100 / props.progress.max)}%` : `50%`
}))

</script>

<template>
    <DialogBox :visible="progressing" position="fixed" :close-on-click-outside="false" :close-on-escape="false" intercept-event>
        <div :class="$style.content">
            <label class="label">正在导入</label>
            <p>{{progress.value}} / {{progress.max}}</p>
            <div :class="$style['progress-bar']">
                <div :class="$style.progressing" :style="progressingStyle"/>
            </div>
        </div>
    </DialogBox>
</template>

<style module lang="sass">
@import "../../../styles/base/size"
@import "../../../styles/base/color"

.content
    padding: $spacing-3 0 $spacing-4 0
    width: 24rem
    max-height: 12rem
    text-align: center
    > p
        margin-top: $spacing-1
    > .progress-bar
        display: inline-block
        position: relative
        overflow: hidden
        width: 12rem
        height: 1rem
        margin-top: $spacing-1
        border-radius: $radius-size-very-large
        background-color: $light-mode-border-color
        @media (prefers-color-scheme: dark)
            background-color: $dark-mode-border-color

        > .progressing
            position: absolute
            left: 0
            top: 0
            bottom: 0
            background-color: $light-mode-primary
            @media (prefers-color-scheme: dark)
                background-color: $dark-mode-primary
</style>
