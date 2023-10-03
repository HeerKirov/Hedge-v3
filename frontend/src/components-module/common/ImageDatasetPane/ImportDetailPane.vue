<script setup lang="ts">
import { BasePane } from "@/components/layout"
import { ThumbnailImage, OptionButtons } from "@/components/universal"
import { useImportDetailPane } from "@/services/main/import"
import { computedEffect } from "@/utils/reactivity"
import ImportTabDetailInfo from "./ImportTabDetailInfo.vue"
import ImportTabAction from "./ImportTabAction.vue"

defineEmits<{
    (e: "close"): void
}>()

const { tabType, detail, selector: { selected }, openImagePreview } = useImportDetailPane()

const paneButtonItems = computedEffect(() => [
    {value: "info", label: "导入项目信息", icon: "info"},
    {value: "action", label: "多选操作", icon: "pen-nib", visible: selected.value.length > 1},
])

</script>

<template>
    <BasePane @close="$emit('close')">
        <template #title>
            <p class="mt-2 ml-2">
                <div v-if="selected.length > 1" class="has-bg-background-color">已选择<b>{{selected.length}}</b>项</div>
                <i v-else-if="selected.length <= 0" class="has-text-secondary">未选择任何项</i>
            </p>
        </template>
        <template #top>
            <ThumbnailImage class="is-cursor-zoom-in" :aspect="1" :file="detail?.filePath.thumbnail" :draggable-file="detail?.filePath.original" :drag-icon-file="detail?.filePath.sample" @click="openImagePreview"/>
        </template>

        <KeepAlive>
            <ImportTabDetailInfo v-if="detail && tabType === 'info'" :detail-id="detail.id"/>
            <ImportTabAction v-else-if="detail && tabType === 'action'" :filename="detail.filename" :selected="selected"/>
        </KeepAlive>

        <template #bottom>
            <OptionButtons :items="paneButtonItems" v-model:value="tabType"/>
        </template>
    </BasePane>
</template>
