<script setup lang="ts">
import { computed, ref } from "vue"
import { Icon } from "@/components/universal"
import { Flex, FlexItem } from "@/components/layout"
import { SourceInfo } from "@/components-business/form-display"
import { useAssets } from "@/functions/app"
import { PaginationData, QueryInstance } from "@/functions/fetch"
import { TrashedImage } from "@/functions/http-client/api/trash"
import { toRef } from "@/utils/reactivity"
import { installDatasetContext } from "./context"
import SelectedCountBadge from "./SelectedCountBadge.vue"
import DatasetGridFramework from "./DatasetGridFramework.vue"
import DatasetRowFramework from "./DatasetRowFramework.vue"

const props = defineProps<{
    /**
     * 分页数据。
     */
    data: PaginationData<TrashedImage>
    /**
     * 查询实例。选择器模块会用到，被用于自由选取数据。
     */
    queryInstance?: QueryInstance<TrashedImage>
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
    (e: "data-update", offset: number, limit: number): void
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
}>()

const keyOf = (item: TrashedImage) => item.id

const data = toRef(props, "data")
const columnNum = computed(() => props.viewMode === "grid" ? (props.columnNum ?? 3) : undefined)
const selected = computed(() => props.selected ?? [])
const lastSelected = computed(() => props.lastSelected ?? null)

const { assetsUrl } = useAssets()

const style = computed(() => ({"--var-fit-type": props.fitType ?? "cover"}))

installDatasetContext({
    queryInstance: props.queryInstance,
    data, keyOf, columnNum,
    selected, lastSelected,
    draggable: ref(false), droppable: ref(false),
    dragAndDropType: "illusts",
    dataUpdate: (_, __) => emit("data-update", _, __),
    select: (_, __) => emit("select", _, __),
    rightClick: (_) => emit("contextmenu", _ as TrashedImage),
    dblClick: (_, __) => emit("dblclick", _, __),
    enterClick: (_) => emit("enter", _),
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
        <DatasetGridFramework v-if="viewMode === 'grid'" :column-num="columnNum!" v-slot="{ item }">
            <img :class="$style['grid-img']" :src="assetsUrl(item.thumbnailFile)" :alt="`trashed-image-${item.id}`"/>
            <div v-if="item.remainingTime !== null" :class="$style['grid-remain-tag']">{{ simpleRemain(item.remainingTime) }}</div>
        </DatasetGridFramework>
        <DatasetRowFramework v-else :row-height="32" v-slot="{ item }">
            <Flex horizontal="stretch" align="center">
                <FlexItem :shrink="0" :grow="0">
                    <img :class="$style['row-img']" :src="assetsUrl(item.thumbnailFile)" :alt="`trashed-image-${item.id}`"/>
                </FlexItem>
                <FlexItem :width="30">
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
                <FlexItem :width="30">
                    <div class="no-wrap overflow-hidden"><SourceInfo :site="item.sourceSite" :source-id="item.sourceId" :source-part="item.sourcePart"/></div>
                </FlexItem>
                <FlexItem :width="30">
                    <div class="mr-2 has-text-right">
                        {{ remain(item.remainingTime) }}
                    </div>
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
    left: 0
    bottom: 0
    padding: 0 0.25rem 0
    border-top-right-radius: $radius-size-std
    color: $dark-mode-text-color
    background-color: rgba(0, 0, 0, 0.65)
    white-space: nowrap
    overflow: hidden

.row-img
    margin-top: 1px
    margin-left: 4px
    height: 30px
    width: 30px
    object-position: center
    object-fit: cover
</style>