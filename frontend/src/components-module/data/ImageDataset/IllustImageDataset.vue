<script setup lang="ts" generic="T extends CommonIllust">
import { computed } from "vue"
import { Icon, NumBadge } from "@/components/universal"
import { Flex, FlexItem } from "@/components/layout"
import { FileInfoDisplay, SourceInfo } from "@/components-business/form-display"
import { PaginationData, PaginationViewState, QueryInstance } from "@/functions/fetch"
import { CommonIllust } from "@/functions/http-client/api/illust"
import { useAssets } from "@/functions/app"
import { TypeDefinition } from "@/modules/drag"
import { datetime } from "@/utils/datetime"
import { toRef } from "@/utils/reactivity"
import { installDatasetContext, isVideoExtension } from "./context"
import SelectedCountBadge from "./SelectedCountBadge.vue"
import DatasetGridFramework from "./DatasetGridFramework.vue"
import DatasetRowFramework from "./DatasetRowFramework.vue"

const props = defineProps<{
    /**
     * 分页数据。
     */
    data: PaginationData<T>
    /**
     * 视口状态。
     */
    state: PaginationViewState | null
    /**
     * 查询实例。选择器模块会用到，被用于自由选取数据。
     */
    queryInstance?: QueryInstance<T, number>
    /**
     * 视图模式，Grid表模式或row行模式。
     */
    viewMode?: "grid" | "row"
    /**
     * 在grid模式下，图片的填充模式。
     */
    fitType?: "cover" | "contain"
    /**
     * 在grid模式下，每行的列数。
     */
    columnNum?: number
    /**
     * 选择器：已选择项。
     */
    selected?: number[]
    /**
     * 选择器：已选择项索引。
     */
    selectedIndex?: (number | undefined)[]
    /**
     * 选择器：最后一个选择项。
     */
    lastSelected?: number | null
    /**
     * 是否显示“已选择数量”的浮标UI。
     */
    selectedCountBadge?: boolean
    /**
     * 是否显示每个时间分区的头标识。
     */
    partitionHeader?: boolean
    /**
     * 可拖曳开关：项允许被拖曳，被识别为指定的拖曳类型。
     */
    draggable?: boolean
    /**
     * 可拖放开关：允许将项拖放到此组件，并触发drop事件。
     */
    droppable?: boolean
}>()

const emit = defineEmits<{
    /**
     * 发送update state事件。
     */
    (e: "update:state", offset: number, limit: number): void
    /**
     * 发送navigate事件。
     */
    (e: "navigate", offset: number): void
    /**
     * 更改选择项。
     */
    (e: "select", selected: number[], lastSelected: number | null): void
    /**
     * 右键单击某项。
     */
    (e: "contextmenu", i: T, option: {alt: boolean} | undefined): void
    /**
     * 双击某项。
     */
    (e: "dblclick", id: number, alt: boolean): void
    /**
     * 在选择项上按下enter。
     */
    (e: "enter", id: number): void
    /**
     * 在选择项上按下space。
     */
    (e: "space", id: number): void
    /**
     * 将数据项拖曳到组件上，触发添加项目的事件。
     */
    (e: "drop", insertIndex: number | null, images: TypeDefinition["illusts"], mode: "ADD" | "MOVE"): void
}>()

const keyOf = (item: CommonIllust) => item.id

const data = toRef(props, "data")
const state = toRef(props, "state")
const columnNum = computed(() => props.viewMode === "grid" ? (props.columnNum ?? 3) : undefined)
const selected = computed(() => props.selected ?? [])
const selectedIndex = computed(() => props.selectedIndex ?? [])
const lastSelected = computed(() => props.lastSelected ?? null)
const draggable = computed(() => props.draggable ?? false)
const droppable = computed(() => props.droppable ?? false)

const { assetsUrl } = useAssets()

const style = computed(() => ({"--var-fit-type": props.fitType ?? "cover"}))

installDatasetContext({
    queryInstance: props.queryInstance,
    data, state, keyOf, columnNum,
    selected, lastSelected, selectedIndex,
    draggable, droppable,
    dragAndDropType: "illusts",
    updateState: (_, __) => emit("update:state", _, __),
    navigate: (_) => emit("navigate", _),
    select: (_, __) => emit("select", _, __),
    rightClick: (_, __) => emit("contextmenu", _ as T, __),
    dblClick: (_, __) => emit("dblclick", _, __),
    enterClick: (_) => emit("enter", _),
    spaceClick: (_) => emit("space", _),
    dropData: (_, __, ___) => emit("drop", _, __ as TypeDefinition["illusts"], ___)
})

</script>

<template>
    <div class="w-100 h-100 relative" :style="style">
        <DatasetGridFramework v-if="viewMode === 'grid'" :key-of="keyOf" :column-num="columnNum!" v-slot="{ item, thumbType, prevItem }">
            <img :class="$style['grid-img']" :src="assetsUrl(item.filePath[thumbType])" :alt="`illust-${item.id}`"/>
            <Icon v-if="item.favorite" :class="$style['grid-favorite']" icon="heart"/>
            <Icon v-if="isVideoExtension(item.filePath.extension)" :class="$style['grid-video']" icon="video"/>
            <NumBadge v-if="item.childrenCount" fixed="right-top" :num="item.childrenCount"/>
            <div v-if="partitionHeader && (prevItem === null || (prevItem !== null && item.partitionTime?.timestamp !== prevItem.partitionTime?.timestamp))" :class="$style['grid-partition-header']">{{item.partitionTime.year}}年{{item.partitionTime.month}}月{{item.partitionTime.day}}日</div>
        </DatasetGridFramework>
        <DatasetRowFramework v-else :key-of="keyOf" :row-height="32" v-slot="{ item }">
            <Flex horizontal="stretch" align="center">
                <FlexItem :shrink="0" :grow="0">
                    <img :class="$style['row-img']" :src="assetsUrl(item.filePath.sample)" :alt="`illust-${item.id}`"/>
                </FlexItem>
                <FlexItem :width="30">
                    <div class="ml-1">{{item.id}}</div>
                </FlexItem>
                <FlexItem :shrink="0">
                    <div :class="$style.children">
                        <template v-if="item.childrenCount">
                            <Icon icon="images"/>{{item.childrenCount}}项
                        </template>
                    </div>
                </FlexItem>
                <FlexItem :shrink="0">
                    <div :class="$style['row-favorite']"><Icon v-if="item.favorite" class="has-text-danger" icon="heart"/></div>
                </FlexItem>
                <FlexItem :width="15" :shrink="0">
                    <div class="has-text-warning has-text-centered">
                        <template v-if="item.score">
                            {{item.score}}<Icon icon="star"/>
                        </template>
                    </div>
                </FlexItem>
                <FlexItem :width="35">
                    <div class="no-wrap overflow-hidden"><SourceInfo v-if="item.type === 'IMAGE'" :source="item.source"/></div>
                </FlexItem>
                <FlexItem :width="20" :shrink="0">
                    <div class="mr-1">
                        <FileInfoDisplay mode="simple" :extension="item.filePath.extension"/>
                    </div>
                </FlexItem>
                <FlexItem :shrink="0">
                    <div :class="$style.time">{{datetime.toSimpleFormat(item.orderTime)}}</div>
                </FlexItem>
            </Flex>
        </DatasetRowFramework>
        <SelectedCountBadge v-if="selectedCountBadge" :count="selected?.length"/>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/size"
@use "@/styles/base/color"

.grid-img
    height: 100%
    width: 100%
    object-position: center
    object-fit: var(--var-fit-type, cover)

.grid-favorite
    position: absolute
    right: 0.3rem
    bottom: 0.25rem
    color: color.$dark-mode-text-color
    filter: drop-shadow(0 0 1px color.$dark-mode-background-color)

.grid-video
    position: absolute
    left: 0.3rem
    bottom: 0.25rem
    color: color.$dark-mode-text-color
    filter: drop-shadow(0 0 1px color.$dark-mode-background-color)

.grid-partition-header
    position: absolute
    left: 0
    top: 0
    padding: 0 size.$spacing-1
    border-bottom-right-radius: size.$radius-size-std
    background-color: color.$light-mode-background-color
    @media (prefers-color-scheme: dark)
        background-color: color.$dark-mode-background-color

.row-img
    margin-top: 1px
    margin-left: 4px
    height: 30px
    width: 30px
    object-position: center
    object-fit: cover

.children
    width: 3.5rem

.row-favorite
    width: 1.5rem
    text-align: center

.time
    width: 8rem
    margin-right: 0.5rem
    margin-left: 0.25rem
    text-align: right
</style>
