<script setup lang="ts">
import { computed } from "vue"
import { Icon } from "@/components/universal"
import { Flex, FlexItem } from "@/components/layout"
import { FileInfoDisplay, SourceInfo } from "@/components-business/form-display"
import { PaginationData, PaginationViewState, QueryInstance } from "@/functions/fetch"
import { ImportRecord } from "@/functions/http-client/api/import"
import { useAssets } from "@/functions/app"
import { TypeDefinition } from "@/modules/drag"
import { date, datetime } from "@/utils/datetime"
import { toRef } from "@/utils/reactivity"
import { installDatasetContext, isVideoExtension } from "./context"
import SelectedCountBadge from "./SelectedCountBadge.vue"
import DatasetGridFramework from "./DatasetGridFramework.vue"
import DatasetRowFramework from "./DatasetRowFramework.vue"

const props = defineProps<{
    /**
     * 分页数据。
     */
    data: PaginationData<ImportRecord>
    /**
     * 视口状态。
     */
    state: PaginationViewState | null
    /**
     * 查询实例。选择器模块会用到，被用于自由选取数据。
     */
    queryInstance?: QueryInstance<ImportRecord, number>
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
     * 发送“需要数据更新”的请求。
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
    (e: "contextmenu", i: ImportRecord, option: {alt: boolean} | undefined): void
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
    (e: "drop", insertIndex: number | null, images: TypeDefinition["importImages"], mode: "ADD" | "MOVE"): void
}>()

const keyOf = (item: ImportRecord) => item.id

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
    dragAndDropType: "importImages",
    updateState: (_, __) => emit("update:state", _, __),
    navigate: (_) => emit("navigate", _),
    select: (_, __) => emit("select", _, __),
    rightClick: (_, __) => emit("contextmenu", _ as ImportRecord, __),
    dblClick: (_, __) => emit("dblclick", _, __),
    enterClick: (_) => emit("enter", _),
    spaceClick: (_) => emit("space", _),
    dropData: (_, __, ___) => emit("drop", _, __ as TypeDefinition["importImages"], ___)
})

</script>

<template>
    <div class="w-100 h-100 relative" :style="style">
        <DatasetGridFramework v-if="viewMode === 'grid'" :key-of="keyOf" :column-num="columnNum!" v-slot="{ item, thumbType }">
            <img :class="$style['grid-img']" :src="assetsUrl(item.filePath?.[thumbType])" :alt="`import-image-${item.id}`"/>
            <Icon v-if="item.filePath !== null && isVideoExtension(item.filePath.extension)" :class="$style['grid-video']" icon="video"/>
            <div v-if="item.status === 'PROCESSING'" :class="[$style['grid-status-icon'], $style[item.status.toLowerCase()]]"><Icon spin icon="arrow-right-rotate"/></div>
            <div v-else-if="item.status === 'ERROR'" :class="[$style['grid-status-icon'], $style[item.status.toLowerCase()]]"><Icon icon="exclamation"/></div>
            <div v-else-if="item.status === 'COMPLETED'" :class="[$style['grid-status-icon'], $style[item.status.toLowerCase()]]"><Icon icon="check"/></div>
        </DatasetGridFramework>
        <DatasetRowFramework v-else :key-of="keyOf" :row-height="32" v-slot="{ item }">
            <Flex horizontal="stretch" align="center">
                <FlexItem :shrink="0" :grow="0">
                    <img :class="$style['row-img']" :src="assetsUrl(item.filePath?.sample)" :alt="`import-image-${item.id}`"/>
                </FlexItem>
                <FlexItem :width="30">
                    <div class="ml-1 no-wrap overflow-ellipsis">{{item.fileName}}</div>
                </FlexItem>
                <FlexItem :shrink="0">
                    <div v-if="item.status === 'PROCESSING'" :class="[$style['status-icon'], 'has-text-primary']"><Icon spin icon="arrow-right-rotate"/></div>
                    <div v-else-if="item.status === 'ERROR'" :class="[$style['status-icon'], 'has-text-danger']"><Icon icon="exclamation"/></div>
                    <div v-else-if="item.status === 'COMPLETED'" :class="[$style['status-icon'], 'has-text-success']"><Icon icon="check"/></div>
                </FlexItem>
                <FlexItem :width="15" :shrink="0">
                    <div class="mr-1">
                        <FileInfoDisplay mode="inline" :extension="item.filePath?.extension"/>
                    </div>
                </FlexItem>
                <FlexItem :width="25" :shrink="0">
                    <SourceInfo :source="item.illust?.source ?? null"/>
                </FlexItem>
                <FlexItem :width="30" :shrink="0">
                    <div class="mr-1 has-text-right">
                        <template v-if="item.illust !== null">
                            <span class="secondary-text">({{date.toISOString(item.illust.partitionTime)}})</span>
                            {{datetime.toSimpleFormat(item.illust.orderTime)}}
                        </template>
                    </div>
                </FlexItem>
            </Flex>
        </DatasetRowFramework>
        <SelectedCountBadge v-if="selectedCountBadge" :count="selected?.length"/>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/color"

.grid-img
    height: 100%
    width: 100%
    object-position: center
    object-fit: var(--var-fit-type, cover)

.grid-video
    position: absolute
    left: 0.3rem
    bottom: 0.25rem
    color: color.$dark-mode-text-color
    filter: drop-shadow(0 0 1px color.$dark-mode-background-color)

.grid-status-icon
    position: absolute
    right: 0
    bottom: 0
    width: 0
    height: 0
    border-left: 1.7rem solid transparent
    border-bottom: 1.7rem solid transparent
    color: color.$white
    > svg 
        position: absolute
        top: 0.7rem
        right: 0
    @media (prefers-color-scheme: light)
        &.completed
            border-bottom-color: color.$light-mode-success
        &.error
            border-bottom-color: color.$light-mode-danger
        &.processing
            border-bottom-color: color.$light-mode-primary
    @media (prefers-color-scheme: dark)
        &.completed
            border-bottom-color: color.$dark-mode-success
        &.error
            border-bottom-color: color.$dark-mode-danger
        &.processing
            border-bottom-color: color.$dark-mode-primary

.row-img
    margin-top: 1px
    margin-left: 4px
    height: 30px
    width: 30px
    object-position: center
    object-fit: cover

.status-icon
    width: 1.5em
    text-align: center
</style>
