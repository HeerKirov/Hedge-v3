<script setup lang="ts">
import { computed } from "vue"
import { useAssets } from "@/functions/app"
import { PaginationData, QueryInstance } from "@/functions/fetch"
import { ImportImage } from "@/functions/http-client/api/import"
import { TypeDefinition } from "@/modules/drag"
import { toRef } from "@/utils/reactivity"
import { installDatasetContext } from "./context"
import SelectedCountBadge from "./SelectedCountBadge.vue"
import DatasetGridFramework from "./DatasetGridFramework.vue"

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
     * 将数据项拖曳到组件上，触发添加项目的事件。
     */
    (e: "drop", insertIndex: number | null, images: TypeDefinition["importImages"], mode: "ADD" | "MOVE"): void
}>()

const keyOf = (item: ImportImage) => item.id

const data = toRef(props, "data")
const columnNum = computed(() => props.columnNum ?? 3)
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
    dropData: (_, __, ___) => emit("drop", _, __ as TypeDefinition["importImages"], ___)
})

</script>

<template>
    <div class="w-100 h-100 relative" :style="style">
        <DatasetGridFramework v-if="viewMode === 'grid'" :column-num="columnNum" v-slot="{ item, index }">
            <img :class="$style.img" :src="assetsUrl(item.thumbnailFile)" :alt="`import-image-${item.id}`"/>
        </DatasetGridFramework>
        <SelectedCountBadge v-if="selectedCountBadge" :count="selected?.length"/>
    </div>
</template>

<style module lang="sass">
.img
    height: 100%
    width: 100%
    object-position: center
    object-fit: var(--var-fit-type, cover)
</style>
