<script setup lang="ts">
import { computed, ref } from "vue"
import { Icon } from "@/components/universal"
import { Flex, FlexItem } from "@/components/layout"
import { BlockStorageKindIcon } from "@/components-business/element"
import { PaginationData, PaginationViewState, QueryInstance } from "@/functions/fetch"
import { BlockStorageSummary } from "@/functions/http-client/api/file-storage"
import { numbers } from "@/utils/primitives"
import type { LocalDateTime } from "@/utils/datetime"
import { toRef } from "@/utils/reactivity"
import { datetime } from "@/utils/datetime"
import { installDatasetContext } from "./context"
import SelectedCountBadge from "./SelectedCountBadge.vue"
import DatasetRowFramework from "./DatasetRowFramework.vue"

const props = defineProps<{
    /**
     * 分页数据。
     */
    data: PaginationData<BlockStorageSummary>
    /**
     * 视口状态。
     */
    state: PaginationViewState | null
    /**
     * 查询实例。选择器模块会用到，被用于自由选取数据。
     */
    queryInstance?: QueryInstance<BlockStorageSummary, number>
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
    (e: "contextmenu", i: BlockStorageSummary, option: {alt: boolean} | undefined): void
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
}>()

const keyOf = (item: BlockStorageSummary) => item.name ? parseInt(item.name, 16) : -1

const data = toRef(props, "data")
const state = toRef(props, "state")
const selected = computed(() => props.selected ?? [])
const selectedIndex = computed(() => props.selectedIndex ?? [])
const lastSelected = computed(() => props.lastSelected ?? null)
const draggable = computed(() => props.draggable ?? false)
const droppable = computed(() => props.droppable ?? false)

installDatasetContext({
    queryInstance: props.queryInstance,
    data, state, keyOf, columnNum: ref(0),
    selected, lastSelected, selectedIndex,
    draggable, droppable,
    dragAndDropType: "importImages",
    updateState: (_, __) => emit("update:state", _, __),
    navigate: (_) => emit("navigate", _),
    select: (_, __) => emit("select", _, __),
    rightClick: (_, __) => emit("contextmenu", _ as BlockStorageSummary, __),
    dblClick: (_, __) => emit("dblclick", _, __),
    enterClick: (_) => emit("enter", _),
    spaceClick: (_) => emit("space", _),
    dropData: () => {}
})

const sizeLabel = (n: number) => numbers.toBytesDisplay(n)

</script>

<template>
    <div class="w-100 h-100 relative">
        <DatasetRowFramework :key-of="keyOf" :row-height="32" v-slot="{ item }">
            <Flex horizontal="stretch" align="center">
                <FlexItem :shrink="0" :grow="0">
                    <div :class="$style['row-icon-wrap']">
                        <BlockStorageKindIcon :has-zip-file="item.hasZipFile" :has-directory="item.hasDirectory" variant="row"/>
                    </div>
                </FlexItem>
                <FlexItem :grow="1" :shrink="1" :width="20">
                    <div class="ml-1 no-wrap overflow-ellipsis" :title="item.name">{{ item.name }}</div>
                </FlexItem>
                <FlexItem :width="8" :shrink="0">
                    <span class="secondary-text no-wrap">{{ item.fileCount }} 项</span>
                </FlexItem>
                <FlexItem :width="18" :shrink="0">
                    <span class="secondary-text no-wrap mr-1">{{ sizeLabel(item.totalSize) }}</span>
                </FlexItem>
                <FlexItem :width="25" :shrink="0">
                    <span class="secondary-text no-wrap" title="最后修改">{{ datetime.toSimpleFormat(item.lastModified) }}</span>
                </FlexItem>
            </Flex>
        </DatasetRowFramework>
        <SelectedCountBadge v-if="selectedCountBadge" :count="selected?.length"/>
    </div>
</template>

<style module lang="sass">
.row-icon-wrap
    display: flex
    align-items: center
    justify-content: center
    width: 32px
    height: 32px

.row-flags
    display: inline-flex
    align-items: center
    justify-content: center
    width: 1.5em
    min-height: 1.5em
</style>
