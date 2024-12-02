<script setup lang="ts">
import { BasePane } from "@/components/layout"
import { ThumbnailImage, Separator, Icon, Starlight } from "@/components/universal"
import {
    DescriptionDisplay,
    TagmeInfo,
    MetaTagListDisplay,
    TimeGroupDisplay,
    SourceInfo,
    FileInfoDisplay, PartitionTimeDisplay
} from "@/components-business/form-display"
import { useTrashDetailPane } from "@/services/main/trash"
import { datetime } from "@/utils/datetime"

defineEmits<{
    (e: "close"): void
}>()

const { data, path, selector: { selected } } = useTrashDetailPane()

const remain = (remainingTime: number | null) => {
    if(remainingTime === null) {
        return ""
    }else if(remainingTime <= 0) {
        return "待清理"
    }else if(remainingTime <= 1000 * 60 * 60 * 24) {
        return "剩余不足1天"
    }else{
        return `剩余${Math.floor(remainingTime / (1000 * 60 * 60 * 24))}天`
    }
}

</script>

<template>
    <BasePane @close="$emit('close')">
        <template #title>
            <p class="mt-2 ml-2">
                <i v-if="selected.length > 1">已选择{{selected.length}}项</i>
                <i v-else-if="selected.length === 0" class="has-text-secondary">未选择任何项</i>
            </p>
        </template>
        <template #top>
            <ThumbnailImage :aspect="1" :file="data?.filePath.thumbnail" :draggable-file="data?.filePath.original" :drag-icon-file="data?.filePath.sample"/>
        </template>

        <template v-if="!!data">
            <p class="my-1">
                <Icon icon="id-card"/><b class="ml-1 selectable">{{path}}</b>
                <span v-if="data.remainingTime !== null" class="float-right has-text-warning">{{ remain(data.remainingTime) }}</span>
            </p>
            <Separator direction="horizontal"/>
            <SourceInfo v-if="data.source !== null" class="mt-1 mb-2" :source="data.source"/>
            <Starlight v-if="data.score !== null" class="mt-1" :value="data.score"/>
            <DescriptionDisplay v-if="data.description" class="mt-1" :value="data.description"/>
            <TagmeInfo v-if="data.tagme.length > 0" class="mt-1" :value="data.tagme"/>
            <MetaTagListDisplay v-if="data.topics.length || data.authors.length || data.tags.length" class="my-1" :topics="data.topics" :authors="data.authors" :tags="data.tags"/>
            <FileInfoDisplay class="mt-3" :extension="data.extension" :file-size="data.size" :resolution-height="data.resolutionHeight" :resolution-width="data.resolutionWidth" :video-duration="data.videoDuration"/>
            <PartitionTimeDisplay class="mt-2" :partition-time="data.partitionTime" :order-time="data.orderTime"/>
            <TimeGroupDisplay :create-time="data.createTime" :update-time="data.updateTime"/>
            <p class="secondary-text">删除时间 {{datetime.toSimpleFormat(data.trashedTime)}}</p>
        </template>
    </BasePane>
</template>
