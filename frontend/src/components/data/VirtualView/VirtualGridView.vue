<script setup lang="ts">
import { computed, toRef, watch } from "vue"
import { computedEffect } from "@/utils/reactivity"
import { useListeningEvent } from "@/utils/emitter"
import { useVirtualViewContext } from "./context"

// == Virtual Grid View 虚拟滚动网格组件 ==
// 虚拟滚动组件，且按照Grid网格的排布模式计算滚动。虚拟滚动要求每个网格单元的长宽比固定、网格列数确定，剩下的会自动计算。
// 此组件遵循通用的虚拟滚动组件数据格式，即通过@update事件发出所需数据的范围，之后给出实际数据的limit/offset/total并将单元填入slot即可。
// 组件的单元会自动应用flex排布、自动换行，但要求手动为单元设置固定的长宽比。

const props = withDefaults(defineProps<{
    /**
     * 位于滚动区域和内容中夹着的padding。这部分padding会被自动算入容器高度。
     */
    padding?: {top?: number, bottom?: number, left?: number, right?: number} | number
    /**
     * Grid的列数。
     */
    columnCount?: number
    /**
     * 每个Grid Unit的宽高比。
     */
    aspectRatio?: number
    /**
     * 当前提供的数据的内容。
     */
    metrics?: {offset: number, limit: number}
    /**
     * 当前虚拟视图的滚动位置。
     */
    state?: {total: number, offset: number, limit: number} | null
}>(), {
    padding: 0,
    columnCount: 3,
    aspectRatio: 1
})

const emit = defineEmits<{
    (e: "update:state", offset: number, limit: number): void
}>()

const metrics = toRef(props, "metrics")
const state = toRef(props, "state")

const { scrollState, navigateEvent, bindDiv } = useVirtualViewContext(props.padding)

//每行的高度，由单元格的宽度计算得来
const unitHeight = computed(() => (scrollState.value.contentWidth ?? window.innerWidth) / props.columnCount / props.aspectRatio)
//由于数据可能不是直接对齐行首的，因此需要计算前置空缺数量，然后补上
const prefixCount = computedEffect(() => (metrics.value?.offset ?? 0) % props.columnCount)
//前置空缺div的CSS。宽度要保留一点，因为在宽度快速变化时，实时布局立即生效，在一个异步事件后才进行js计算，这会导致出现闪烁
const prefixDivStyle = computed(() => prefixCount.value > 0 ? {width: `${prefixCount.value * unitHeight.value * props.aspectRatio * 0.95}px`, height: `${unitHeight.value}px`} : undefined)

//scroll滚动位置发生变化时，计算为state属性，并通过事件上报
watch(() => [scrollState.value.top, scrollState.value.height], ([top, height]) => {
    if(top !== null && height !== null) {
        const offset = Math.floor(top / unitHeight.value)
        const limit = Math.ceil((top + height) / unitHeight.value) - offset
        if(!state.value || offset !== Math.floor(state.value.offset / props.columnCount) || limit !== Math.ceil((state.value.limit + state.value.offset) / props.columnCount) - Math.floor(state.value.offset / props.columnCount)) {
            emit("update:state", offset * props.columnCount, limit * props.columnCount)
        }
    }
})

//上层的metrics属性，计算为本层的数据区域填充值
watch(metrics, metrics => {
    if(metrics) {
        const offset = Math.floor(metrics.offset / props.columnCount), limit = Math.ceil((metrics.offset + metrics.limit) / props.columnCount) - offset
        scrollState.value.actualTop = offset * unitHeight.value
        scrollState.value.actualHeight = limit * unitHeight.value
    }
}, {deep: true})

//上层的state属性，计算为本层的scroll滚动位置，并对照实际视口大小修正state
watch(state, state => {
    if(state) {
        //计算数据区域的总高度
        scrollState.value.totalHeight = Math.ceil(state.total / props.columnCount) * unitHeight.value
        //计算按行计数的offset和limit
        const offset = Math.floor(state.offset / props.columnCount) , limit = Math.ceil((state.offset + state.limit) / props.columnCount) - offset
        if(scrollState.value.top === null || offset !== Math.floor(scrollState.value.top / unitHeight.value)) scrollState.value.top = offset * unitHeight.value
        // 仅应该当height为null时，才能此处设置height，因为这种情况下需要以state作为初始值初始化滚动状态。
        // 其余情况下，它应当始终由组件内部根据高度获得，否则有可能固定到一个错误的limit上无法变更
        if(scrollState.value.height === null) scrollState.value.height = limit * unitHeight.value
    }
}, {deep: true, immediate: true})

//监听并处理导航事件
useListeningEvent(navigateEvent, offset => {
    const row = Math.floor(offset / props.columnCount)
    if(state.value && scrollState.value.top !== null && scrollState.value.height !== null) {
        //计算出此时完全在视口范围内的行的上下限
        const innerFirst = Math.ceil(scrollState.value.top / unitHeight.value), innerLast = Math.floor((scrollState.value.top + scrollState.value.height) / unitHeight.value)
        if(row < innerFirst) {
            scrollState.value.top = row * unitHeight.value
        }else if(row >= innerLast) {
            scrollState.value.top = (row + 1) * unitHeight.value - scrollState.value.height
        }
    }
})

//本层的额外事件：列数或行高发生变化，此时将重新计算视口位置，保持之前在视口中心的一行的单元格继续位于视口中心
watch(() => [props.columnCount, unitHeight.value], ([columnCount, unitHeight]) => {
    if(state.value && scrollState.value.top !== null && scrollState.value.height !== null) {
        //根据state计算之前的视口中心的一格的索引值
        const centerIndex = Math.round(state.value.offset)
        //计算此格当前的行，进一步计算新的scrollTop滚动量。如果新滚动量距离当前滚动量超过了一行的偏移值，就更新滚动值
        const scrollTop = Math.ceil(centerIndex / columnCount) * unitHeight
        if(Math.abs(scrollState.value.top - scrollTop) > unitHeight) {
            scrollState.value.top = scrollTop
        }
    }
})

</script>

<template>
    <div v-bind="bindDiv()">
        <div :class="$style.content">
            <div v-if="prefixCount > 0" :style="prefixDivStyle"/>
            <slot/>
        </div>
    </div>
</template>

<style module lang="sass">
.content
    display: flex
    flex-flow: wrap
    justify-content: flex-start
    align-content: flex-start
</style>
