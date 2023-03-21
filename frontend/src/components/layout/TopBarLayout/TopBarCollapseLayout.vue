<script setup lang="ts">
import { ref, watch } from "vue"
import { TopBar, useSideLayoutState } from "@/components/layout"
import { useMouseHover } from "@/utils/sensors"
import { sleep } from "@/utils/process"

// == Top Bar Layout 顶栏结构布局 ==
// 用于SideLayout的主要区域的布局，将内容区分割为上面的顶栏和下面的主要内容区两部分。
// 在侧边栏收入时，会自动折叠顶栏区域，直到鼠标移入。

const { isOpen } = useSideLayoutState()

const { hover, ...hoverEvents } = useMouseHover()

const hidden = ref(true)

watch(hover, async (v, _, onInvalidate) => {
    if(v) {
        hidden.value = false
    }else{
        let validate = true
        onInvalidate(() => validate = false)
        await sleep(250)
        if(validate && !hover.value) {
            hidden.value = true
        }
    }
})

</script>

<template>
    <div :class="$style['top-bar-layout']">
        <div :class="{[$style['main-content']]: true, [$style.collapsed]: !isOpen}">
            <slot/>
        </div>
        <div v-bind="hoverEvents">
            <div v-if="!isOpen" :class="$style['trigger-area']"/>
            <TopBar :class="{[$style['top-bar']]: true, [$style.collapsed]: !isOpen && hidden}">
                <slot name="top-bar"/>
            </TopBar>
        </div>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/color"
@import "../../../styles/base/size"

.top-bar-layout
    position: relative
    width: 100%
    height: 100%
    background-color: $light-mode-background-color
    @media (prefers-color-scheme: dark)
        background-color: $dark-mode-background-color

    > .main-content
        position: absolute
        top: $title-bar-height
        left: 0
        right: 0
        bottom: 0
        transition: top 0.3s
        &.collapsed
            top: 0

    .top-bar
        transition: transform 0.3s
        &.collapsed
            transform: translateY(#{-$title-bar-height})
    .trigger-area
        position: absolute
        top: 0
        left: 0
        right: 0
        height: #{$title-bar-height * 2}
</style>
