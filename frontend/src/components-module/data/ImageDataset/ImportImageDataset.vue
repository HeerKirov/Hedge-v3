<script setup lang="ts">
import { computed } from "vue"
import { Icon } from "@/components/universal"
import { Flex, FlexItem } from "@/components/layout"
import { FileInfoDisplay, SourceInfo } from "@/components-business/form-display"
import { PaginationData, QueryInstance } from "@/functions/fetch"
import { ImportImage } from "@/functions/http-client/api/import"
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
    data: PaginationData<ImportImage>
    /**
     * 查询实例。选择器模块会用到，被用于自由选取数据。
     */
    queryInstance?: QueryInstance<ImportImage>
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
    (e: "data-update", offset: number, limit: number): void
    /**
     * 更改选择项。
     */
    (e: "select", selected: number[], lastSelected: number | null): void
    /**
     * 右键单击某项。
     */
    (e: "contextmenu", i: ImportImage): void
    /**
     * 双击某项。
     */
    (e: "dblclick", id: number, shift: boolean): void
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

const keyOf = (item: ImportImage) => item.id

const data = toRef(props, "data")
const columnNum = computed(() => props.viewMode === "grid" ? (props.columnNum ?? 3) : undefined)
const selected = computed(() => props.selected ?? [])
const lastSelected = computed(() => props.lastSelected ?? null)
const draggable = computed(() => props.draggable ?? false)
const droppable = computed(() => props.droppable ?? false)

const { assetsUrl } = useAssets()

const style = computed(() => ({"--var-fit-type": props.fitType ?? "cover"}))

installDatasetContext({
    queryInstance: props.queryInstance,
    data, keyOf, columnNum,
    selected, lastSelected,
    draggable, droppable,
    dragAndDropType: "importImages",
    dataUpdate: (_, __) => emit("data-update", _, __),
    select: (_, __) => emit("select", _, __),
    rightClick: (_) => emit("contextmenu", _ as ImportImage),
    dblClick: (_, __) => emit("dblclick", _, __),
    enterClick: (_) => emit("enter", _),
    spaceClick: (_) => emit("space", _),
    dropData: (_, __, ___) => emit("drop", _, __ as TypeDefinition["importImages"], ___)
})

</script>

<template>
    <div class="w-100 h-100 relative" :style="style">
        <DatasetGridFramework v-if="viewMode === 'grid'" :key-of="keyOf" :column-num="columnNum!" v-slot="{ item, thumbType }">
            <img :class="$style['grid-img']" :src="assetsUrl(item.filePath[thumbType])" :alt="`import-image-${item.id}`"/>
            <Icon v-if="isVideoExtension(item.filePath.extension)" :class="$style['grid-video']" icon="video"/>
        </DatasetGridFramework>
        <DatasetRowFramework v-else :key-of="keyOf" :row-height="32" v-slot="{ item }">
            <Flex horizontal="stretch" align="center">
                <FlexItem :shrink="0" :grow="0">
                    <img :class="$style['row-img']" :src="assetsUrl(item.filePath.sample)" :alt="`import-image-${item.id}`"/>
                </FlexItem>
                <FlexItem :width="30">
                    <div class="ml-1 no-wrap overflow-ellipsis">{{item.originFileName}}</div>
                </FlexItem>
                <FlexItem :width="25" :shrink="0">
                    <SourceInfo :source="item.source"/>
                </FlexItem>
                <FlexItem :width="15" :shrink="0">
                    <div class="mr-1">
                        <FileInfoDisplay mode="inline" :extension="item.filePath.extension"/>
                    </div>
                </FlexItem>
                <FlexItem :width="30" :shrink="0">
                    <div class="mr-1 has-text-right">
                        <span class="secondary-text">({{date.toISOString(item.partitionTime)}})</span>
                        {{datetime.toSimpleFormat(item.orderTime)}}
                    </div>
                </FlexItem>
            </Flex>
        </DatasetRowFramework>
        <SelectedCountBadge v-if="selectedCountBadge" :count="selected?.length"/>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/color"

.grid-img
    height: 100%
    width: 100%
    object-position: center
    object-fit: var(--var-fit-type, cover)

.grid-video
    position: absolute
    left: 0.3rem
    bottom: 0.25rem
    color: $dark-mode-text-color
    filter: drop-shadow(0 0 1px $dark-mode-background-color)

.row-img
    margin-top: 1px
    margin-left: 4px
    height: 30px
    width: 30px
    object-position: center
    object-fit: cover
</style>
