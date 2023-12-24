<script setup lang="ts">
import { computed, ref } from "vue"
import { Icon } from "@/components/universal"
import { Flex, FlexItem } from "@/components/layout"
import { SourceInfo, FileInfoDisplay } from "@/components-business/form-display"
import { useAssets } from "@/functions/app"
import { PaginationData, PaginationViewState, QueryInstance } from "@/functions/fetch"
import { TrashedImage } from "@/functions/http-client/api/trash"
import { toRef } from "@/utils/reactivity"
import { installDatasetContext, isVideoExtension } from "./context"
import SelectedCountBadge from "./SelectedCountBadge.vue"
import DatasetGridFramework from "./DatasetGridFramework.vue"
import DatasetRowFramework from "./DatasetRowFramework.vue"

const props = defineProps<{
    /**
     * 分页数据。
     */
    data: PaginationData<TrashedImage>
    /**
     * 视口状态。
     */
    state: PaginationViewState | null
    /**
     * 查询实例。选择器模块会用到，被用于自由选取数据。
     */
    queryInstance?: QueryInstance<TrashedImage, number>
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
    (e: "contextmenu", i: TrashedImage): void
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
}>()

const keyOf = (item: TrashedImage) => item.id

const data = toRef(props, "data")
const state = toRef(props, "state")
const columnNum = computed(() => props.viewMode === "grid" ? (props.columnNum ?? 3) : undefined)
const selected = computed(() => props.selected ?? [])
const lastSelected = computed(() => props.lastSelected ?? null)

const { assetsUrl } = useAssets()

const style = computed(() => ({"--var-fit-type": props.fitType ?? "cover"}))

installDatasetContext({
    queryInstance: props.queryInstance,
    data, state, keyOf, columnNum,
    selected, lastSelected,
    draggable: ref(false), droppable: ref(false),
    dragAndDropType: "illusts",
    updateState: (_, __) => emit("update:state", _, __),
    navigate: (_) => emit("navigate", _),
    select: (_, __) => emit("select", _, __),
    rightClick: (_) => emit("contextmenu", _ as TrashedImage),
    dblClick: (_, __) => emit("dblclick", _, __),
    enterClick: (_) => emit("enter", _),
    spaceClick: (_) => emit("space", _),
    dropData: (_, __, ___) => {}
})

const remain = (remainingTime: number | null) => {
    if(remainingTime === null) {
        return ""
    }else if(remainingTime <= 0) {
        return "待清理"
    }else if(remainingTime <= 1000 * 60 * 60 * 24) {
        return "剩余不足1天"
    }else{
        return `剩余${Math.floor(remainingTime / (1000 * 60 * 60 * 24))}天`
    }
}

const simpleRemain = (remainingTime: number | null) => {
    if(remainingTime === null) {
        return ""
    }else if(remainingTime <= 0) {
        return "待清理"
    }else if(remainingTime <= 1000 * 60 * 60 * 24) {
        return "<1天"
    }else{
        return `${Math.floor(remainingTime / (1000 * 60 * 60 * 24))}天`
    }
}

</script>

<template>
    <div class="w-100 h-100 relative" :style="style">
        <DatasetGridFramework v-if="viewMode === 'grid'" :key-of="keyOf" :column-num="columnNum!" v-slot="{ item, thumbType }">
            <img :class="$style['grid-img']" :src="assetsUrl(item.filePath[thumbType])" :alt="`trashed-image-${item.id}`"/>
            <div v-if="item.remainingTime !== null" :class="$style['grid-remain-tag']">{{ simpleRemain(item.remainingTime) }}</div>
            <Icon v-if="isVideoExtension(item.filePath.extension)" :class="$style['grid-video']" icon="video"/>
        </DatasetGridFramework>
        <DatasetRowFramework v-else :key-of="keyOf" :row-height="32" v-slot="{ item }">
            <Flex horizontal="stretch" align="center">
                <FlexItem :shrink="0" :grow="0">
                    <img :class="$style['row-img']" :src="assetsUrl(item.filePath.sample)" :alt="`trashed-image-${item.id}`"/>
                </FlexItem>
                <FlexItem :width="35">
                    <div class="ml-1">{{ item.id }}</div>
                </FlexItem>
                <FlexItem :shrink="0">
                    <div :class="$style['row-favorite']"><Icon v-if="item.favorite" class="has-text-danger" icon="heart"/></div>
                </FlexItem>
                <FlexItem :width="10" :shrink="0">
                    <div class="has-text-warning has-text-centered">
                        <template v-if="item.score">
                            {{item.score}}<Icon icon="star"/>
                        </template>
                    </div>
                </FlexItem>
                <FlexItem :width="35">
                    <div class="no-wrap overflow-hidden">
                        <SourceInfo :source="item.source"/>
                    </div>
                </FlexItem>
                <FlexItem :width="20" :shrink="0">
                    <div class="mr-1">
                        <FileInfoDisplay mode="inline" :extension="item.filePath.extension"/>
                    </div>
                </FlexItem>
                <FlexItem :shrink="0">
                    <div :class="$style.time">{{ remain(item.remainingTime) }}</div>
                </FlexItem>
            </Flex>
        </DatasetRowFramework>
        <SelectedCountBadge v-if="selectedCountBadge" :count="selected?.length"/>
    </div>
</template>

<style module lang="sass">
@import "../../../styles/base/size"
@import "../../../styles/base/color"

.grid-img
    height: 100%
    width: 100%
    object-position: center
    object-fit: var(--var-fit-type, cover)

.grid-remain-tag
    position: absolute
    right: 0
    bottom: 0
    padding: 0 0.25rem 0
    border-top-left-radius: $radius-size-std
    color: $dark-mode-text-color
    background-color: rgba(0, 0, 0, 0.65)
    white-space: nowrap
    overflow: hidden

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

.time
    width: 8rem
    margin-right: 0.5rem
    margin-left: 0.25rem
    text-align: right
</style>
