<script setup lang="ts">
import { toRef } from "vue"
import { ThumbnailImage } from "@/components/universal"
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

const { context } = useImageCompareTableContext(props.columnNum, toRef(props, "ids"), (idx, id) => emit("update:id", idx, id))

const thStyle = `width: calc((100% - 6rem) / ${props.columnNum})`

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
                    <ThumbnailImage :file="context[index - 1].imageData.metadata.value?.thumbnailFile" v-bind="context[index - 1].dropEvents"/>
                </td>
            </tr>
            <MetadataInfo :values="context.map(i => i.imageData.metadata.value)"/>
            <SourceDataInfo :values="context.map(i => i.imageData.sourceData.value)"/>
            <RelatedItemsInfo :values="context.map(i => i.imageData.relatedItems.value)"/>
        </tbody>
    </table>
</template>
