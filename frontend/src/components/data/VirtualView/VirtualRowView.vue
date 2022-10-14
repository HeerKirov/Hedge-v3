<script setup lang="ts">
import { watch } from "vue"
import { Padding, ProposeData, useVirtualViewContext } from "./context"

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
     * 位于可视范围外的缓冲区行数。
     */
    bufferSize?: number
    /**
     * 每个行的高度。
     */
    rowHeight?: number
    /**
     * 数据项的总项数。设置为undefined会被认为是需要加载数据。
     */
    total?: number
    /**
     * 当前提供的数据项的limit。
     */
    limit?: number
    /**
     * 当前提供的数据项的offset。
     */
    offset?: number
    /**
     * 最小更新变化阈值，单位是行。当limit和offset的变化值小于此阈值时，将不会发出事件。
     */
    minUpdateDelta?: number
}>(), {
    padding: 0,
    bufferSize: 0,
    rowHeight: 0,
    minUpdateDelta: 0
})

const emit = defineEmits<{
    (e: "update", offset: number, limit: number): void
}>()

const { propose, actual, padding, bindDiv, setViewState, watchViewNavigation } = useVirtualViewContext({
    props: {
        padding() { return props.padding },
        buffer() { return props.bufferSize * props.rowHeight }
    },
    onRefresh() {
        lastDataRequired.offset = undefined
        lastDataRequired.limit = undefined
    }
})

//上层事件: 将total设置有效值会刷新view state的值
watch(() => props.total, (total, oldTotal) => {
    if(total != undefined && oldTotal !== total) {
        updateViewState(propose.value, total)
    }
})

//上层事件: propose发生变化时，重新计算view，以及发送update事件
const lastDataRequired: {offset?: number, limit?: number} = {}
watch(propose, (propose, oldPropose) => {
    //计算请求数据的limit和offset是否有变，并发出事件
    if(lastDataRequired.offset == undefined || lastDataRequired.limit == undefined
        || propose.offsetTop !== oldPropose.offsetTop
        || propose.offsetHeight !== oldPropose.offsetHeight) {

        const offset = Math.floor(propose.offsetTop / props.rowHeight)
        const limit = Math.ceil((propose.offsetTop + propose.offsetHeight) / props.rowHeight) - offset
        if(lastDataRequired.offset == undefined || lastDataRequired.limit == undefined
            || Math.abs(lastDataRequired.offset - offset) > props.minUpdateDelta
            || Math.abs(lastDataRequired.limit - limit) > props.minUpdateDelta) {
            lastDataRequired.offset = offset
            lastDataRequired.limit = limit
            emit("update", offset, limit)
        }
    }

    //计算作为导航的view的值
    if(propose.scrollTop !== oldPropose.scrollTop || propose.scrollHeight !== oldPropose.scrollHeight) {
        updateViewState(propose, props.total)
    }
})

//外部事件: 属性重设时，根据data actual重新计算actual
watch(() => props, props => {
    if(props.total != undefined && props.offset != undefined && props.limit != undefined) {
        const totalHeight = props.total * props.rowHeight
        const actualOffsetTop = props.offset * props.rowHeight
        const actualOffsetHeight = props.limit * props.rowHeight
        actual.value = {totalHeight, top: actualOffsetTop, height: actualOffsetHeight}
    }else{
        if(actual.value.totalHeight != undefined || actual.value.top !== 0 || actual.value.height !== 0) {
            actual.value = {totalHeight: undefined, top: 0, height: 0}
        }
    }
}, {deep: true})

//外部事件: 外部指定了滚动位置，指定方式是指定item offset
watchViewNavigation(itemOffset => [itemOffset * props.rowHeight, props.rowHeight])

//功能: 更新view state的值
function updateViewState(propose: ProposeData, total: number | undefined) {
    if(propose.contentHeight != undefined && total != undefined) {
        //根据可视区域的顶端计算当前首行的行数。四舍五入使首行被计算为"超过一半在可视区域内的行"
        const firstItemOffset = Math.round((propose.scrollTop - padding.top) / props.rowHeight)
        //同样的方法计算当前尾行的行数
        const lastItemOffset = Math.min(total, Math.round((propose.scrollTop + propose.contentHeight + padding.bottom) / props.rowHeight))

        setViewState(firstItemOffset, lastItemOffset - firstItemOffset, total)
    }else{
        setViewState(0, 0, undefined)
    }
}

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
