<script setup lang="ts">
import { BasePane } from "@/components/layout"
import { ThumbnailImage, OptionButtons } from "@/components/universal"
import { IllustTabDetailInfo, IllustTabRelatedItems, IllustTabSourceData, IllustTabAction } from "@/components-module/common"
import { useDetailPane } from "@/services/main/find-similar"
import { computedEffect } from "@/utils/reactivity"
import DetailPaneTabResolve from "./DetailPaneTabResolve.vue"

const { detail, tabType, selector: { selected }, openImagePreview } = useDetailPane()

const paneButtonItems = computedEffect(() => [
    {value: "info", label: "项目信息", icon: "info"},
    {value: "related", label: "相关内容", icon: "dice-d6"},
    {value: "source", label: "来源数据", icon: "file-invoice"},
    {value: "action", label: "多选操作", icon: "pen-nib", visible: selected.value.length > 1},
    {value: "resolve", label: "项目处理", icon: "wine-bottle", visible: selected.value.length > 1},
])

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

        <KeepAlive>
            <IllustTabDetailInfo v-if="detail && tabType === 'info'" :detail-id="detail.id"/>
            <IllustTabRelatedItems v-else-if="detail && tabType === 'related'" :detail-id="detail.id" :type="detail.type"/>
            <IllustTabSourceData v-else-if="detail && tabType === 'source'" :detail-id="detail.id" :type="detail.type"/>
            <IllustTabAction v-else-if="detail && tabType === 'action'" :selected="selected"/>
            <DetailPaneTabResolve v-else-if="detail && tabType === 'resolve'"/>
        </KeepAlive>

        <template #bottom>
            <OptionButtons :items="paneButtonItems" v-model:value="tabType" enable-darwin-border/>
        </template>
    </BasePane>
</template>
