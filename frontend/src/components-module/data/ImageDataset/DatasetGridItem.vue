<script setup lang="ts">
import { computed } from "vue"
import { Icon } from "@/components/universal"
import { platform } from "@/functions/ipc-client"
import { toRef } from "@/utils/reactivity"
import { useCheckBoxEvents, useDatasetContext, useDragEvents, useDropEvents } from "./context"

const props = defineProps<{
    item: unknown
    index: number
}>()

const dataRef = toRef(props, "item")
const indexRef = toRef(props, "index")

const { queryInstance, selector, keyOf, dblClick: emitDblClick, rightClick: emitRightClick, drag } = useDatasetContext()

const currentSelected = computed(() => selector.selected.value.find(i => i === keyOf(props.item)) !== undefined)

const { isMouseOver, checkboxDrop, checkAreaEvents, checkBoxEvents } = useCheckBoxEvents({selector, keyOf, dataRef, indexRef})

const dragEvents = useDragEvents({
    queryInstance, keyOf,
    draggable: drag.draggable.value,
    selected: selector.selected,
    selectedIndex: selector.selectedIndex,
    byType: drag.byType,
    dataRef: () => dataRef,
    dataMap: images => (images as any)
})

const { isLeftDragover, isRightDragover, leftDropEvents, rightDropEvents } = useDropEvents({
    droppable: drag.droppable,
    draggingFromLocal: drag.draggingFromLocal,
    byType: drag.byType,
    indexRef: () => indexRef,
    onDrop: drag.dropData,
    elseProcess: checkboxDrop
})

const click = (e: MouseEvent) => {
    // 追加添加的任意选择项都会排列在选择列表的最后
    // 选择任意项都会使其成为last selected
    if(e.shiftKey) {
        selector.shiftSelect(props.index, keyOf(props.item)).finally()
    }else if((e.metaKey && platform === "darwin") || (e.ctrlKey && platform !== "darwin")) {
        selector.appendSelect(props.index, keyOf(props.item))
    }else{
        selector.select(props.index, keyOf(props.item))
    }
}

const dblClick = (e: MouseEvent) => {
    if(e.ctrlKey || e.shiftKey || e.metaKey) return
    emitDblClick(keyOf(props.item), e.altKey)
}

const rightClick = (e: MouseEvent) => {
    emitRightClick(props.item, e.altKey ? {alt: e.altKey} : undefined)
}

</script>

<template>
    <div :class="$style.item" @click="click" @contextmenu="rightClick" @dblclick="dblClick" v-bind="dragEvents">
        <div :class="$style.content">
            <slot :selected="currentSelected"/>
        </div>
        <div v-if="currentSelected" :class="$style.selected"><div :class="$style['internal-border']"/></div>
        <div v-if="isLeftDragover" :class="$style['left-drop-tooltip']"/>
        <div v-if="isRightDragover" :class="$style['right-drop-tooltip']"/>
        <div :class="$style['left-touch']" v-bind="leftDropEvents">
            <div :class="$style['checkbox-touch-area']" v-bind="checkAreaEvents">
                <div :class="{[$style.checkbox]: true, 'opacity': !isMouseOver}" v-bind="checkBoxEvents">
                    <Icon icon="plus"/>
                </div>
            </div>
        </div>
        <div :class="$style['right-touch']" v-bind="rightDropEvents"/>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/color"
@use "@/styles/base/size"

.item
    position: relative
    height: 0
    width: calc(100% / var(--var-column-num))
    padding: calc(50% / var(--var-column-num)) 0
    > .content
        position: absolute
        top: 1px
        bottom: 1px
        left: 1px
        right: 1px

    > .selected
        position: absolute
        top: 0
        bottom: 0
        left: 0
        right: 0
        margin: 1px
        border: solid 3px color.$light-mode-primary
        @media (prefers-color-scheme: dark)
            border-color: color.$dark-mode-primary
            border-width: 2px

        > .internal-border
            width: 100%
            height: 100%
            box-sizing: border-box
            border: solid 1px color.$white
            @media (prefers-color-scheme: dark)
                border-color: color.$black

    //分侧的点击浮层(用于判断拖放位置)
    > .left-touch
        position: absolute
        top: 0
        bottom: 0
        left: 0
        width: 50%
    > .right-touch
        position: absolute
        top: 0
        bottom: 0
        right: 0
        width: 50%

    //两侧的拖放提示条
    > .left-drop-tooltip
        z-index: 1
        position: absolute
        top: 0
        bottom: 0
        left: -2px
        width: 5px
        background-color: rgba(127, 127, 127, 0.6)
    > .right-drop-tooltip
        z-index: 1
        position: absolute
        top: 0
        bottom: 0
        right: -3px
        width: 5px
        background-color: rgba(127, 127, 127, 0.6)

    .checkbox-touch-area
        position: absolute
        top: 0
        left: 0
        width: 100%
        height: 50%

        .checkbox
            position: absolute
            left: 3px
            top: 3px
            width: 30px
            height: 30px
            padding: 2px
            color: color.$dark-mode-text-color
            border-radius: size.$radius-size-std
            border: solid 1px color.$dark-mode-text-color
            filter: drop-shadow(0 0 1px color.$dark-mode-background-color)
            > svg
                width: 24px
                height: 24px
</style>
