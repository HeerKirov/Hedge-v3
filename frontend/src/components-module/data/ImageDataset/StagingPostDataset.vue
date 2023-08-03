<script setup lang="ts">
import { computed, ref } from "vue"
import { Icon } from "@/components/universal"
import { Flex, FlexItem } from "@/components/layout"
import { FileInfoDisplay, SourceInfo } from "@/components-business/form-display"
import { useAssets } from "@/functions/app"
import { PaginationData, QueryInstance } from "@/functions/fetch"
import { StagingPostImage } from "@/functions/http-client/api/staging-post"
import { toRef } from "@/utils/reactivity"
import { datetime } from "@/utils/datetime"
import { strings } from "@/utils/primitives"
import { isVideoExtension } from "@/utils/validation"
import { installDatasetContext } from "./context"
import SelectedCountBadge from "./SelectedCountBadge.vue"
import DatasetGridFramework from "./DatasetGridFramework.vue"
import DatasetRowFramework from "./DatasetRowFramework.vue"

const props = defineProps<{
    /**
     * 分页数据。
     */
    data: PaginationData<StagingPostImage>
    /**
     * 查询实例。选择器模块会用到，被用于自由选取数据。
     */
    queryInstance?: QueryInstance<StagingPostImage>
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
    (e: "contextmenu", i: StagingPostImage): void
    /**
     * 双击某项。
     */
    (e: "dblclick", id: number, shift: boolean): void
    /**
     * 在选择项上按下enter。
     */
    (e: "enter", id: number): void
}>()

const keyOf = (item: StagingPostImage) => item.id

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
    rightClick: (_) => emit("contextmenu", _ as StagingPostImage),
    dblClick: (_, __) => emit("dblclick", _, __),
    enterClick: (_) => emit("enter", _),
    dropData: (_, __, ___) => {}
})

</script>

<template>
    <div class="w-100 h-100 relative" :style="style">
        <DatasetGridFramework v-if="viewMode === 'grid'" :column-num="columnNum!" v-slot="{ item }">
            <img :class="$style['grid-img']" :src="assetsUrl(item.filePath.thumbnail)" :alt="`staging-post-${item.id}`"/>
            <Icon v-if="item.favorite" :class="[$style['grid-favorite'], 'has-text-danger']" icon="heart"/>
            <Icon v-if="isVideoExtension(item.filePath.original)" :class="$style['grid-video']" icon="video"/>
        </DatasetGridFramework>
        <DatasetRowFramework v-else :row-height="32" v-slot="{ item }">
            <Flex horizontal="stretch" align="center">
                <FlexItem :shrink="0" :grow="0">
                    <img :class="$style['row-img']" :src="assetsUrl(item.filePath.sample)" :alt="`staging-post-${item.id}`"/>
                </FlexItem>
                <FlexItem :width="40">
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
                <FlexItem :width="15" :shrink="0">
                    <div class="mr-1">
                        <FileInfoDisplay :extension="strings.getExtension(item.filePath.original)" mode="inline"/>
                    </div>
                </FlexItem>
                <FlexItem :width="30">
                    <div class="no-wrap overflow-hidden"><SourceInfo :site="item.sourceSite" :source-id="item.sourceId" :source-part="item.sourcePart"/></div>
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
@import "../../../styles/base/size"
@import "../../../styles/base/color"

.grid-img
    height: 100%
    width: 100%
    object-position: center
    object-fit: var(--var-fit-type, cover)

.grid-favorite
    position: absolute
    right: 0.3rem
    bottom: 0.25rem

.grid-video
    position: absolute
    left: 0.3rem
    bottom: 0.25rem
    color: $dark-mode-text-color

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

.time
    width: 8rem
    margin-right: 0.5rem
    margin-left: 0.25rem
    text-align: right
</style>
