<script setup lang="ts">
import { toRef, watch } from "vue"
import { useListeningEvent } from "@/utils/emitter"
import { Padding, useVirtualViewContext } from "./context"

// == Virtual Row View 虚拟滚动网格组件 ==
// 虚拟滚动组件，且按照Row行的排布模式计算滚动。虚拟滚动要求每个行的高度固定，剩下的会自动计算。
// 此组件遵循通用的虚拟滚动组件数据格式，即通过@update事件发出所需数据的范围，之后给出实际数据的limit/offset/total并将单元填入slot即可。
// 组件的单元会自动应用flex排布、宽度100%以填充横线区域，但要求手动为单元设置与参数一致的高度。

const props = withDefaults(defineProps<{
    /**
     * 位于滚动区域和内容中夹着的padding。这部分padding会被自动算入容器高度。
     */
    padding?: Padding | number
    /**
     * 每个行的高度。
     */
    rowHeight?: number
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
    rowHeight: 0
})

const emit = defineEmits<{
    (e: "update:state", offset: number, limit: number): void
}>()

const metrics = toRef(props, "metrics")
const state = toRef(props, "state")

const { scrollState, navigateEvent, bindDiv } = useVirtualViewContext(props.padding)

//scroll滚动位置发生变化时，计算为state属性，并通过事件上报
watch(() => [scrollState.value.top, scrollState.value.height], ([top, height]) => {
    if(top !== null && height !== null) {
        const offset = Math.floor(top / props.rowHeight)
        const limit = Math.ceil((top + height) / props.rowHeight) - offset
        if(!state.value || offset !== state.value.offset || limit !== state.value.limit) {
            emit("update:state", offset, limit)
        }
    }
})

//上层的metrics属性，计算为本层的数据区域填充值
watch(metrics, metrics => {
    if(metrics) {
        scrollState.value.actualTop = metrics.offset * props.rowHeight
        scrollState.value.actualHeight = metrics.limit * props.rowHeight
    }
}, {deep: true})

//上层的state属性，计算为本层的scroll滚动位置
watch(state, state => {
    if(state) {
        scrollState.value.totalHeight = state.total * props.rowHeight
        if(scrollState.value.top === null || state.offset !== Math.floor(scrollState.value.top / props.rowHeight)) scrollState.value.top = state.offset * props.rowHeight
        // 仅应该当height为null时，才能此处设置height，因为这种情况下需要以state作为初始值初始化滚动状态。
        // 其余情况下，它应当始终由组件内部根据高度获得，否则有可能固定到一个错误的limit上无法变更
        if(scrollState.value.height === null) scrollState.value.height = state.limit * props.rowHeight
    }
}, {deep: true, immediate: true})

//监听并处理导航事件
useListeningEvent(navigateEvent, offset => {
    if(state.value && scrollState.value.top !== null && scrollState.value.height !== null) {
        //计算出此时完全在视口范围内的行的上下限
        const innerFirst = Math.ceil(scrollState.value.top / props.rowHeight), innerLast = Math.floor((scrollState.value.top + scrollState.value.height) / props.rowHeight)
        if(offset < innerFirst) {
            scrollState.value.top = offset * props.rowHeight
        }else if(offset >= innerLast) {
            scrollState.value.top = (offset + 1) * props.rowHeight - scrollState.value.height
        }
    }
})

</script>

<template>
    <div v-bind="bindDiv()">
        <div :class="$style.content">
            <slot/>
        </div>
    </div>
</template>

<style module lang="sass">
.content
    display: flex
    flex-flow: wrap
    align-items: stretch
    > *
        width: 100%
</style>
