<script setup lang="ts">
import { ThumbnailImage } from "@/components/universal"
import { usePreviewService } from "@/components-module/preview"
import { toRef } from "@/utils/reactivity"
import { useImageCompareTableContext } from "./context"
import MetadataInfo from "./MetadataInfo.vue"
import SourceDataInfo from "./SourceDataInfo.vue"
import RelatedItemsInfo from "./RelatedItemsInfo.vue"

const props = withDefaults(defineProps<{
    columnNum?: number
    droppable?: boolean
    titles?: string[]
    ids?: (number | null)[]
}>(), {
    columnNum: 2,
    titles: () => [],
    ids: () => []
})

const emit = defineEmits<{
    (e: "update:id", index: number, id: number): void
}>()

const previewService = usePreviewService()

const ids = toRef(props, "ids")

const { context } = useImageCompareTableContext(props.columnNum, ids, (idx, id) => emit("update:id", idx, id))

const thStyle = `width: calc((100% - 6rem) / ${props.columnNum})`

const openImagePreview = (index: number) => {
    const thumbnailList = context.map(c => c.imageData.data.value?.filePath ?? null)
    const files = thumbnailList.filter(f => f !== null) as string[]
    const initIndex = thumbnailList.reduce((cur, f, idx) => f === null && idx <= cur && cur > 0 ? cur - 1 : cur, index)
    previewService.show({preview: "image", type: "array", files, initIndex})
}

</script>

<template>
    <table class="table w-100">
        <thead>
            <tr>
                <th style="width: 6rem"/>
                <th v-for="index in columnNum" :style="thStyle">{{titles[index - 1]}}</th>
            </tr>
        </thead>
        <tbody class="has-text-centered">
            <tr>
                <td/>
                <td v-for="index in columnNum">
                    <ThumbnailImage class="is-cursor-zoom-in" max-height="12rem" :file="context[index - 1].imageData.data.value?.filePath" v-bind="context[index - 1].dropEvents" @click="openImagePreview(index - 1)"/>
                </td>
            </tr>
            <MetadataInfo :values="context.map(i => i.imageData.data.value?.metadata ?? null)"/>
            <SourceDataInfo :values="context.map(i => i.imageData.data.value?.sourceData ?? null)"/>
            <RelatedItemsInfo :values="context.map(i => i.imageData.data.value?.relatedItems ?? null)"/>
        </tbody>
    </table>
</template>
