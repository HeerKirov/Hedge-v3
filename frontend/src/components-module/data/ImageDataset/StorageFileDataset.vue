<script setup lang="ts">
import { computed } from "vue"
import { Icon } from "@/components/universal"
import { Flex, FlexItem } from "@/components/layout"
import { FileInfoDisplay } from "@/components-business/form-display"
import { PaginationData, PaginationViewState, QueryInstance } from "@/functions/fetch"
import { BlockFileItem } from "@/functions/http-client/api/file-storage"
import { useAssets } from "@/functions/app"
import { TypeDefinition } from "@/modules/drag"
import { numbers } from "@/utils/primitives"
import { datetime } from "@/utils/datetime"
import { toRef } from "@/utils/reactivity"
import { installDatasetContext, isVideoExtension } from "./context"
import SelectedCountBadge from "./SelectedCountBadge.vue"
import DatasetGridFramework from "./DatasetGridFramework.vue"
import DatasetRowFramework from "./DatasetRowFramework.vue"

const props = defineProps<{
    data: PaginationData<BlockFileItem>
    state: PaginationViewState | null
    queryInstance?: QueryInstance<BlockFileItem, number>
    viewMode?: "grid" | "row"
    fitType?: "cover" | "contain"
    columnNum?: number
    selected?: number[]
    selectedIndex?: (number | undefined)[]
    lastSelected?: number | null
    selectedCountBadge?: boolean
    draggable?: boolean
    droppable?: boolean
}>()

const emit = defineEmits<{
    (e: "update:state", offset: number, limit: number): void
    (e: "navigate", offset: number): void
    (e: "select", selected: number[], lastSelected: number | null): void
    (e: "contextmenu", i: BlockFileItem, option: {alt: boolean} | undefined): void
    (e: "dblclick", id: number, alt: boolean): void
    (e: "enter", id: number): void
    (e: "space", id: number): void
    (e: "drop", insertIndex: number | null, images: TypeDefinition["importImages"], mode: "ADD" | "MOVE"): void
}>()

const keyOf = (item: BlockFileItem) => item.id

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
    rightClick: (_, __) => emit("contextmenu", _ as BlockFileItem, __),
    dblClick: (_, __) => emit("dblclick", _, __),
    enterClick: (_) => emit("enter", _),
    spaceClick: (_) => emit("space", _),
    dropData: (_, __, ___) => emit("drop", _, __ as TypeDefinition["importImages"], ___)
})

const sizeLabel = (n: number) => numbers.toBytesDisplay(n)

const rowThumbSrc = (item: BlockFileItem) => assetsUrl(item.filepath.sample ?? item.filepath.thumbnail)

const isVideo = (item: BlockFileItem) => isVideoExtension(item.filepath.extension.toLowerCase())

</script>

<template>
    <div class="w-100 h-100 relative" :style="style">
        <DatasetGridFramework v-if="viewMode === 'grid'" :key-of="keyOf" :column-num="columnNum!" v-slot="{ item, thumbType }">
            <div :class="$style['grid-tile']">
                <div :class="$style['grid-img-wrap']">
                    <img :class="$style['grid-img']" :src="assetsUrl(item.filepath[thumbType])" :alt="`storage-file-${item.id}`"/>
                    <Icon v-if="isVideo(item)" :class="$style['grid-video']" icon="video"/>
                </div>
                <div :class="$style['grid-name']" :title="item.fileName">{{ item.fileName }}</div>
            </div>
        </DatasetGridFramework>
        <DatasetRowFramework v-else :key-of="keyOf" :row-height="32" v-slot="{ item }">
            <Flex horizontal="stretch" align="center">
                <FlexItem :shrink="0" :grow="0">
                    <div :class="$style['row-thumb-wrap']">
                        <img :class="$style['row-img']" :src="rowThumbSrc(item)" :alt="item.fileName"/>
                        <Icon v-if="isVideo(item)" :class="$style['row-video']" icon="video"/>
                    </div>
                </FlexItem>
                <FlexItem :grow="1" :shrink="1" :width="28">
                    <div class="ml-1 no-wrap overflow-ellipsis" :title="item.fileName">{{ item.fileName }}</div>
                </FlexItem>
                <FlexItem :width="12" :shrink="0">
                    <span class="secondary-text no-wrap">{{ sizeLabel(item.size) }}</span>
                </FlexItem>
                <FlexItem :width="10" :shrink="0">
                    <span v-if="item.resolutionWidth > 0 && item.resolutionHeight > 0" class="secondary-text no-wrap">{{ item.resolutionWidth }}×{{ item.resolutionHeight }}</span>
                </FlexItem>
                <FlexItem :width="12" :shrink="0">
                    <FileInfoDisplay mode="inline" :extension="item.extension.toLowerCase()"/>
                </FlexItem>
                <FlexItem :width="14" :shrink="0">
                    <span class="secondary-text no-wrap mr-1">{{ datetime.toSimpleFormat(item.createTime) }}</span>
                </FlexItem>
                <FlexItem :shrink="0" :grow="0">
                    <span v-if="item.inBlockDirectory" class="secondary-text" title="位于块内目录"><Icon icon="folder-open"/></span>
                </FlexItem>
            </Flex>
        </DatasetRowFramework>
        <SelectedCountBadge v-if="selectedCountBadge" :count="selected?.length"/>
    </div>
</template>

<style module lang="sass">
@use "@/styles/base/color"

.grid-tile
    display: flex
    flex-direction: column
    height: 100%
    width: 100%
    box-sizing: border-box
    padding: 0.15rem 0.1rem 0.25rem
    min-height: 0

.grid-img-wrap
    position: relative
    flex: 1 1 auto
    min-height: 0
    width: 100%

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

.grid-name
    flex-shrink: 0
    width: 100%
    margin-top: 0.15rem
    text-align: center
    font-size: 0.75em
    line-height: 1.15
    overflow: hidden
    text-overflow: ellipsis
    display: -webkit-box
    -webkit-line-clamp: 2
    -webkit-box-orient: vertical
    word-break: break-all

.row-thumb-wrap
    position: relative
    width: 32px
    height: 32px

.row-img
    margin-top: 1px
    margin-left: 4px
    height: 30px
    width: 30px
    object-fit: cover
    object-position: center

.row-video
    position: absolute
    left: 50%
    bottom: 2px
    transform: translateX(-50%)
    width: 0.85rem
    height: 0.85rem
    color: color.$dark-mode-text-color
    filter: drop-shadow(0 0 1px color.$dark-mode-background-color)
</style>
