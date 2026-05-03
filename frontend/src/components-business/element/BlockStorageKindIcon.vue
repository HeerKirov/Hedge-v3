<script setup lang="ts">
import { computed } from "vue"
import { Icon } from "@/components/universal"

const props = withDefaults(defineProps<{
    hasZipFile: boolean
    hasDirectory: boolean
    variant?: "row" | "detail"
}>(), {
    variant: "row"
})

type Kind = "zip-only" | "dir-only" | "both" | "plain"

const kind = computed<Kind>(() => {
    if(props.hasZipFile && props.hasDirectory) {
        return "both"
    }
    if(props.hasZipFile) {
        return "zip-only"
    }
    if(props.hasDirectory) {
        return "dir-only"
    }
    return "plain"
})

</script>

<template>
    <div :class="[$style.wrap, variant === 'detail' ? $style['wrap-detail'] : $style['wrap-row']]">
        <template v-if="kind === 'zip-only'">
            <Icon icon="archive" :class="[$style['icon-base'], variant === 'detail' ? $style['icon-detail'] : $style['icon-row'], $style['tone-zip']]"/>
        </template>
        <template v-else-if="kind === 'dir-only'">
            <Icon icon="folder" :class="[$style['icon-base'], variant === 'detail' ? $style['icon-detail'] : $style['icon-row'], $style['tone-folder']]"/>
        </template>
        <template v-else-if="kind === 'both'">
            <div :class="[$style['split-square'], variant === 'detail' ? $style['split-detail'] : $style['split-row']]" title="含压缩包与子目录">
                <span :class="[$style['split-hemi'], $style['split-hemi-a']]">
                    <Icon icon="archive" :class="[$style['split-icon'], $style['tone-zip']]"/>
                </span>
                <span :class="[$style['split-hemi'], $style['split-hemi-b']]">
                    <Icon icon="folder" :class="[$style['split-icon'], $style['tone-folder']]"/>
                </span>
                <!-- 右上→左下对角线：SVG 保证线宽与叠放，避免旋转 div 被裁切/盖住 -->
                <svg :class="$style['split-line-svg']" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                    <line x1="100" y1="0" x2="0" y2="100" :class="$style['split-line-stroke']" vector-effect="non-scaling-stroke"/>
                </svg>
            </div>
        </template>
        <template v-else>
            <Icon icon="folder" :class="[$style['icon-base'], variant === 'detail' ? $style['icon-detail'] : $style['icon-row'], $style['tone-folder']]"/>
        </template>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/color"

.wrap
    display: flex
    align-items: center
    justify-content: center

.wrap-row
    width: 100%
    height: 100%

.wrap-detail
    width: 100%
    height: 100%

.icon-base
    flex-shrink: 0

.icon-row
    width: 1.35rem
    height: 1.35rem

.icon-detail
    width: 40%
    max-width: 4.5rem
    height: auto

.tone-zip
    color: color.$light-mode-success
    @media (prefers-color-scheme: dark)
        color: color.$dark-mode-success

.tone-folder
    color: color.$light-mode-warning
    @media (prefers-color-scheme: dark)
        color: color.$dark-mode-warning

// 对角线分割：左上三角形为压缩包，右下为文件夹；共置于正方形内
.split-square
    position: relative
    flex-shrink: 0
    // 笔划会略超出正方形，hidden 会裁掉对角线两端；图标已由 clip-path 约束
    overflow: visible
    border-radius: 2px
    isolation: isolate

.split-row
    width: 1.35rem
    height: 1.35rem
    aspect-ratio: 1

.split-detail
    width: min(72%, 4.5rem)
    max-width: 4.5rem
    aspect-ratio: 1

.split-hemi
    position: absolute
    inset: 0
    z-index: 0
    display: flex
    align-items: center
    justify-content: center
    pointer-events: none

// 对角线 TR—BL：左上为压缩包，右下为文件夹
.split-hemi-a
    clip-path: polygon(0 0, 100% 0, 0 100%)

.split-hemi-b
    clip-path: polygon(100% 0, 100% 100%, 0 100%)

.split-icon
    width: 78%
    height: auto

.split-line-svg
    position: absolute
    inset: 0
    width: 100%
    height: 100%
    z-index: 2
    pointer-events: none
    overflow: visible

.split-line-stroke
    fill: none
    stroke: color.$black
    // 屏幕像素级线宽，不随 SVG 缩放变细
    stroke-width: 1.35
    stroke-linecap: square
    @media (prefers-color-scheme: dark)
        stroke: color.$white
</style>
