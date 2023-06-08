<script setup lang="ts">
import { computed } from "vue"
import { ThumbnailImage } from "@/components/universal"
import { toRef } from "@/utils/reactivity"
import { useFindSimilarCompareData, useFindSimilarCompareList } from "@/services/main/find-similar"
import MetadataInfo from "./MetadataInfo.vue"
import SourceDataInfo from "./SourceDataInfo.vue"
import RelatedItemsInfo from "./RelatedItemsInfo.vue"

const props = defineProps<{
    itemA: {type: "IMPORT_IMAGE" | "ILLUST", id: number} | null
    itemB: {type: "IMPORT_IMAGE" | "ILLUST", id: number} | null
}>()

const columnNum = computed(() => props.itemA !== null && props.itemB !== null ? 2 : 1)

const dataA = useFindSimilarCompareData(toRef(props, "itemA"))
const dataB = useFindSimilarCompareData(toRef(props, "itemB"))

const thStyle = computed(() => `width: calc((100% - 6rem) / ${columnNum.value})`)

const thumbnailList = useFindSimilarCompareList(columnNum, () => dataA.value?.thumbnailFile ?? null, () => dataB.value?.thumbnailFile ?? null)
const metadataList = useFindSimilarCompareList(columnNum, () => dataA.value?.metadata ?? null, () => dataB.value?.metadata ?? null)
const sourceDataList = useFindSimilarCompareList(columnNum, () => dataA.value?.sourceData ?? null, () => dataB.value?.sourceData ?? null)
const relatedItemsList = useFindSimilarCompareList(columnNum, () => dataA.value?.relatedItems ?? null, () => dataB.value?.relatedItems ?? null)

</script>

<template>
    <table class="table w-100">
        <thead>
            <tr>
                <th style="width: 6rem"/>
                <template v-if="columnNum === 2">
                    <th :style="thStyle">A</th>
                    <th :style="thStyle">B</th>
                </template>
                <th v-else :style="thStyle"></th>
            </tr>
        </thead>
        <tbody class="has-text-centered">
            <tr>
                <td/>
                <td v-for="index in columnNum">
                    <ThumbnailImage :file="thumbnailList[index - 1]"/>
                </td>
            </tr>
            <MetadataInfo :values="metadataList"/>
            <SourceDataInfo :values="sourceDataList"/>
            <RelatedItemsInfo :values="relatedItemsList"/>
        </tbody>
    </table>
</template>
