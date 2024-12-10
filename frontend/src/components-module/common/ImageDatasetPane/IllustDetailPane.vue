<script setup lang="ts">
import { BasePane } from "@/components/layout"
import { ThumbnailImage } from "@/components/universal"
import { useIllustDetailPane } from "@/services/main/illust"
import IllustDetailTab from "./IllustDetailTab.vue"
import IllustTabAction from "./IllustTabAction.vue"

defineProps<{
    scene?: "CollectionDetail" | "CollectionPane"
}>()

defineEmits<{
    (e: "close"): void
}>()

const { detail, selector: { selected, selectedIndex }, parent, openImagePreview } = useIllustDetailPane()

</script>

<template>
    <BasePane @close="$emit('close')">
        <template #title>
            <p class="mt-2 ml-2">
                <span v-if="selected.length > 1">已选择<b>{{selected.length}}</b>项</span>
                <i v-else-if="selected.length <= 0" class="has-text-secondary">未选择任何项</i>
            </p>
        </template>

        <template #top>
            <ThumbnailImage class="is-cursor-zoom-in" :aspect="1" :file="detail?.filePath.thumbnail" :draggable-file="detail?.filePath.original" :drag-icon-file="detail?.filePath.sample" @click="openImagePreview"/>
        </template>

        <IllustTabAction v-if="selected.length > 1" :selected :selectedIndex :parent/>
        <IllustDetailTab v-else-if="detail" :detail-id="detail.id" :type="detail.type" :scene/>
    </BasePane>
</template>
