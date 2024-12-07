<script setup lang="ts">
import { BasePane } from "@/components/layout"
import { ThumbnailImage } from "@/components/universal"
import { IllustDetailTab, IllustTabAction } from "@/components-module/common"
import { useDetailPane } from "@/services/main/find-similar"
import FindSimilarTabResolve from "./FindSimilarTabResolve.vue"

const { detail, selector: { selected, selectedIndex }, openImagePreview } = useDetailPane()

</script>

<template>
    <BasePane :show-close-button="false">
        <template #title>
            <p class="mt-2 ml-2">
                <span v-if="selected.length > 1">已选择<b>{{selected.length}}</b>项</span>
                <i v-else-if="selected.length <= 0" class="has-text-secondary">未选择任何项</i>
            </p>
        </template>
        <template #top>
            <ThumbnailImage class="is-cursor-zoom-in" :aspect="1" :file="detail?.filePath.thumbnail" :draggable-file="detail?.filePath.original" :drag-icon-file="detail?.filePath.sample" @click="openImagePreview"/>
        </template>

        <template v-if="selected.length > 1">
            <IllustTabAction :selected="selected" :selected-index="selectedIndex"/>
            <FindSimilarTabResolve/>
        </template>
        <IllustDetailTab v-else-if="detail" :detail-id="detail.id" :type="detail.type"/>
    </BasePane>
</template>
