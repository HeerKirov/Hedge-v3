<script setup lang="ts">
import { computed } from "vue"
import { BasePane } from "@/components/layout"
import { ThumbnailImage, Separator, Icon, Starlight } from "@/components/universal"
import { DescriptionDisplay, TagmeInfo, MetaTagListDisplay, PartitionTimeDisplay, TimeGroupDisplay, SourceInfo } from "@/components-business/form-display"
import { SelectedPaneState } from "@/services/base/selected-pane-state"
import { useTrashDetailPane } from "@/services/main/trash"
import { datetime } from "@/utils/datetime"

const props = defineProps<{
    state: SelectedPaneState<number>
}>()

defineEmits<{
    (e: "close"): void
}>()

const path = computed(() => props.state.type === "single" ? props.state.value : props.state.type === "multiple" ? props.state.latest : null)

const { data } = useTrashDetailPane(path)

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
                <i v-if="state.type === 'multiple'">已选择{{state.values.length}}项</i>
                <i v-else-if="state.type === 'none'" class="has-text-secondary">未选择任何项</i>
            </p>
        </template>

        <ThumbnailImage minHeight="12rem" maxHeight="40rem" :file="data?.filePath.thumbnail" :draggable-file="data?.filePath.original" :drag-icon-file="data?.filePath.sample"/>
        <template v-if="!!data">
            <p class="my-1">
                <Icon icon="id-card"/><b class="ml-1 is-font-size-large selectable">{{path}}</b>
                <span v-if="data.remainingTime !== null" class="float-right has-text-warning">{{ remain(data.remainingTime) }}</span>
            </p>
            <Separator direction="horizontal"/>
            <SourceInfo v-if="data.source !== null" class="mt-1" :source="data.source"/>
            <Starlight v-if="data.score !== null" class="mt-1" :value="data.score"/>
            <DescriptionDisplay v-if="data.description" class="mt-1" :value="data.description"/>
            <MetaTagListDisplay v-if="data.topics.length || data.authors.length || data.tags.length" class="my-1" :topics="data.topics" :authors="data.authors" :tags="data.tags"/>
            <TagmeInfo v-if="data.tagme.length > 0" class="mt-1" :value="data.tagme"/>
            <PartitionTimeDisplay class="mt-2" :partition-time="data.partitionTime"/>
            <TimeGroupDisplay :order-time="data.orderTime" :update-time="data.updateTime" :create-time="data.createTime"/>
            <p class="secondary-text">删除时间 {{datetime.toSimpleFormat(data.trashedTime)}}</p>
        </template>
    </BasePane>
</template>
